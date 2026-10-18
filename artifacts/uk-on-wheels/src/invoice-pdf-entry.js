window.InvoicePDF = {
  async download(invoice, settings, billTo, logoUrl, isCurrentSession = () => true) {
    const { buildInvoicePdf } = await import("./invoice-pdf.js");
    let logoBytes;
    if (logoUrl) {
      const response = await fetch(logoUrl);
      if (!response.ok) throw new Error("The invoice logo could not be downloaded. Please retry.");
      logoBytes = new Uint8Array(await response.arrayBuffer());
    }
    const doc = buildInvoicePdf(invoice, settings, billTo, logoBytes);
    if (!isCurrentSession()) throw new Error("The sign-in changed. Reopen your invoice and download it again.");
    const name = String(invoice.invoiceNo || "Invoice").replace(/[^A-Za-z0-9_-]/g, "-");
    doc.save(name + ".pdf");
  }
};
