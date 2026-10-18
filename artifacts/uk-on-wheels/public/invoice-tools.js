(function () {
  "use strict";
  const bucket = "invoice-branding";
  const fields = {
    companyName: "cfgCompanyName", companyRegistration: "cfgCompanyReg",
    companyAddress: "cfgAddress", companyPostcode: "cfgPostcode",
    companyEmail: "cfgEmail", companyPhone: "cfgPhone", vatNumber: "cfgVat",
    bankName: "cfgBankName", bankAccountName: "cfgBankAccountName",
    bankSortCode: "cfgSortCode", bankAccountNumber: "cfgAccountNo",
    iban: "cfgIban", latePaymentText: "cfgLateTerms"
  };
  let pendingLogo = null;
  function setupError(error) {
    return new Error((error?.message || "Connection unavailable.") +
      " If invoice setup is missing, ask Admin to run supabase/invoice-settings-patch.sql.");
  }
  function logoUrl(settings, client, base = document.baseURI) {
    if (settings?.showLogo === false) return "";
    if (settings?.logoPath) {
      if (!/^logos\/[a-f0-9-]{36}\.(png|jpg)$/.test(settings.logoPath)) throw new Error("The saved invoice logo path is invalid.");
      return client.storage.from(bucket).getPublicUrl(settings.logoPath).data.publicUrl;
    }
    return new URL("./uk-on-wheels-logo.jpg", base).href;
  }
  async function readSettings(client, invoiceNo = null) {
    const { data, error } = await client.rpc("get_invoice_company_settings", { p_invoice_no: invoiceNo });
    if (error) throw setupError(error);
    return data;
  }
  async function readLogo(file) {
    if (!["image/png", "image/jpeg"].includes(file.type)) throw new Error("Choose a PNG or JPG logo.");
    if (file.size > 2 * 1024 * 1024) throw new Error("The logo must be 2 MB or smaller.");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
    const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!(file.type === "image/png" ? png : jpg)) throw new Error("The selected file is not a valid PNG or JPG logo.");
    return bytes;
  }
  async function saveSettings(client, previous, doc = document, isCurrentSession = () => true) {
    const settings = { ...previous };
    for (const [key, id] of Object.entries(fields)) settings[key] = doc.getElementById(id)?.value.trim() || "";
    settings.showLogo = doc.getElementById("cfgShowLogo")?.checked !== false;
    if (!settings.companyName) throw new Error("Enter the company name.");
    const file = doc.getElementById("cfgInvoiceLogo")?.files?.[0];
    if (file) {
      const bytes = await readLogo(file);
      if (pendingLogo?.file !== file) {
        const path = "logos/" + crypto.randomUUID() + (file.type === "image/png" ? ".png" : ".jpg");
        const uploaded = await client.storage.from(bucket).upload(path, bytes, {
          contentType: file.type, upsert: false, cacheControl: "31536000"
        });
        if (uploaded.error) throw setupError(uploaded.error);
        pendingLogo = { file, path };
      }
      settings.logoPath = pendingLogo.path;
    }
    if (!isCurrentSession()) throw new Error("The sign-in changed. Sign in again before saving company details.");
    const { data, error } = await client.rpc("save_invoice_company_settings", { p_settings: settings });
    if (error) throw setupError(error);
    if (!isCurrentSession()) throw new Error("The sign-in changed while saving. Reload to check the saved details.");
    if (!data?.companyName) throw new Error("The server did not confirm the saved company details.");
    pendingLogo = null;
    return data;
  }
  window.InvoiceTools = { logoUrl, readSettings, saveSettings, readLogo };
})();
