/* HR employee registration & vetting. Classic script. No private data in localStorage. */
window.HRRegistration = (() => {
  const CHECKS = [
    ["identity", "Identity"], ["rightToWork", "Right to work"], ["addressHistory", "Address history"],
    ["employmentHistory", "Employment history"], ["references", "References"], ["dvla", "DVLA licence"],
    ["qualifications", "Qualifications"], ["dbs", "DBS"]
  ];
  const OPTIONAL = new Set(["qualifications", "dbs"]);
  const CATS = ["Identity", "Right to work", "Address", "Employment", "Reference", "DVLA", "Qualification", "DBS", "Other"];
  const TYPES = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const SECTIONS = [
    ["Personal details", [
      ["firstName", "First name", "text", "Required"], ["middleName", "Middle name(s)"], ["lastName", "Last name", "text", "Required"],
      ["email", "Email", "email", "Required"], ["phone", "Phone", "tel"], ["dateOfBirth", "Date of birth", "date"],
      ["currentAddress", "Current address", "area"], ["postcode", "Postcode"],
      ["addressHistory", "Address history (last 5 years)", "area", "One address per line: from (MM/YYYY) - to (MM/YYYY), full address, postcode"]]],
    ["Emergency contact", [["emergencyName", "Contact name"], ["emergencyPhone", "Contact phone", "tel"], ["emergencyAddress", "Contact address", "area"]]],
    ["Employment & references", [
      ["employmentHistory", "Employment history", "area", "Per role: dates from - to, organisation, job title, address, reason for leaving"],
      ["employmentGaps", "Gaps in employment", "area", "Dates and explanation for any gap over one month"],
      ["references", "Referees", "area", "Per referee: name, organisation, relationship, email, phone, dates known"]]],
    ["Identity & right to work", [
      ["identityType", "Identity document type", "select:,Passport,Driving licence (photocard),National identity card,Biometric residence permit,Birth certificate,Other"],
      ["identityReference", "Identity document number"],
      ["rightToWorkStatus", "Right to work status", "select:,British or Irish citizen,Settled status,Pre-settled status,Visa or permit,Pending,Not established"],
      ["rightToWorkShareCode", "Right to work share code"], ["rightToWorkExpiry", "Right to work expiry", "date"]]],
    ["Driving licence", [
      ["drivingLicenceNo", "Licence number"], ["licenceCategories", "Licence categories", "text", "For example B, BE, C1"],
      ["licenceExpiry", "Licence expiry", "date"], ["dvlaShareCode", "DVLA share code"], ["dvlaCheckedOn", "DVLA checked on", "date"],
      ["endorsements", "Endorsements and penalty points", "area", "Offence code, points, date, expiry"]]],
    ["Qualifications & DBS", [
      ["qualifications", "Qualifications", "area", "Title, awarding body, date achieved, expiry"],
      ["dbsLevel", "DBS level", "select:,Not required,Basic,Standard,Enhanced,Enhanced with barred lists"],
      ["dbsReference", "DBS certificate number"], ["dbsCheckedOn", "DBS checked on", "date"]]],
    ["Portal link & notes", [
      ["portalUserId", "Link existing portal user (optional)", "text", "Choose an existing account, or leave blank. No sign-in account is created here."],
      ["notes", "Internal HR notes", "area"]]]
  ];

  let gen = 0, uid = 0;
  const st = { list: [], q: "", caps: null };
  const E = s => escapeHtml(s == null ? "" : String(s));
  const live = (c, g) => g === gen && c.isConnected && (typeof page === "undefined" || page === "hrRegister");
  const fmt = t => { if (!t) return ""; const d = new Date(t); return isNaN(d) ? E(t) : E(d.toLocaleString("en-GB")); };
  const errText = e => {
    const m = (e && e.message) || String(e || "Unknown error");
    if (/conflict|version|stale|modified|record changed/i.test(m) || e?.code === "40001" || e?.status === 409)
      return "Conflict: this record was changed by someone else since you opened it. Your edits are still on screen - copy anything you need, then use Reload to fetch the latest version. (" + m + ")";
    return m;
  };
  const badge = d => `<span class="badge ${d === "Approved" ? "green" : d === "Rejected" ? "red" : "amber"}">${E(d || "Draft")}</span>`;

  function msg(box, text, kind) {
    if (!box) return;
    box.innerHTML = text ? `<div class="hrr-msg ${kind || "info"}" role="${kind === "err" ? "alert" : "status"}">${E(text)}</div>` : "";
  }

  async function draw(c) {
    const g = ++gen;
    c.innerHTML = `<div class="panel"><h2>Employee Registration</h2><p class="muted">Loading HR records...</p><div class="hrr-skel"></div><div class="hrr-skel" style="width:70%"></div></div>`;
    if (!window.HRScreeningAPI) { c.innerHTML = `<div class="panel"><h2>Employee Registration</h2><div class="hrr-msg err" role="alert">HR screening service is not available. Ask Admin to complete the setup.</div></div>`; return; }
    let cp;
    try { cp = await HRScreeningAPI.capabilities(); }
    catch (e) {
      if (live(c,g)) {
        c.innerHTML = `<div class="panel"><h2>Employee Registration</h2><div class="hrr-msg err" role="alert">${E(errText(e))}</div><button type="button" class="btn secondary" data-retry>Retry</button></div>`;
        c.querySelector("[data-retry]").addEventListener("click",()=>draw(c));
      }
      return;
    }
    if (!live(c, g)) return;
    st.caps = cp;
    if (!cp.canRead) { c.innerHTML = `<div class="panel"><h2>Employee Registration</h2><p class="muted">You do not have access to HR employee records.</p></div>`; return; }
    drawList(c, g);
  }

  async function drawList(c, g) {
    c.innerHTML = `<div class="hrr-wrap"><div class="panel"><div class="hrr-head"><div><h2>Employee Registration</h2>
      <p class="muted">Register and vet employees. Vetting records are separate from portal sign-in accounts.</p></div>
      <div class="actions">${st.caps.canWrite ? `<button type="button" class="btn primary" data-a="new">Register employee</button>` : `<span class="badge">Read only</span>`}
      <button type="button" class="btn secondary" data-a="reload">Reload</button></div></div>
      <div class="hrr-toolbar" style="margin-top:10px"><label class="hrr-f" style="flex:1"><span>Search employees</span>
      <input type="search" data-a="q" value="${E(st.q)}" placeholder="Name, email or reference"></label></div>
      <div data-msg></div><div data-body><div class="hrr-skel"></div><div class="hrr-skel"></div></div></div></div>`;
    const body = c.querySelector("[data-body]"), box = c.querySelector("[data-msg]");
    const paint = () => {
      const q = st.q.trim().toLowerCase();
      const rows = st.list.filter(r => !q || [r.reference, r.data?.firstName, r.data?.lastName, r.data?.email].join(" ").toLowerCase().includes(q));
      if (!rows.length) { body.innerHTML = `<div class="hrr-empty">${st.list.length ? "No employees match that search." : "No employees registered yet."}</div>`; return; }
      body.innerHTML = `<div class="scroll"><table class="hrr-list"><thead><tr><th scope="col">Reference</th><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Decision</th><th scope="col">Updated</th></tr></thead><tbody>${rows.map(r =>
        `<tr><td>${E(r.reference)}</td><td><button type="button" class="hrr-link" data-open="${E(r.id)}">${E([r.data?.firstName, r.data?.lastName].filter(Boolean).join(" ") || "Unnamed")}</button></td><td>${E(r.data?.email)}</td><td>${badge(r.decision)}</td><td>${fmt(r.updated_at)}</td></tr>`).join("")}</tbody></table></div>`;
    };
    c.querySelector('[data-a="q"]').addEventListener("input", e => { st.q = e.target.value; paint(); });
    c.querySelector('[data-a="reload"]').addEventListener("click", () => drawList(c, ++gen));
    c.querySelector('[data-a="new"]')?.addEventListener("click", () => drawForm(c, ++gen, null, []));
    body.addEventListener("click", e => { const b = e.target.closest("[data-open]"); if (b) openRec(c, b.dataset.open); });
    try {
      const list = await HRScreeningAPI.list();
      if (!live(c, g)) return;
      st.list = Array.isArray(list) ? list : []; paint();
    } catch (e) { if (live(c, g)) { body.innerHTML = ""; msg(box, "Could not load employees: " + errText(e), "err"); } }
  }

  async function openRec(c, id) {
    const g = ++gen;
    c.innerHTML = `<div class="panel"><h2>Employee record</h2><div class="hrr-skel"></div><div class="hrr-skel"></div><div class="hrr-skel" style="width:60%"></div></div>`;
    try {
      const res = await HRScreeningAPI.get(id);
      if (!live(c, g)) return;
      drawForm(c, g, res.record, res.documents || []);
    } catch (e) {
      if (!live(c, g)) return;
      c.innerHTML = `<div class="panel"><h2>Employee record</h2><div class="hrr-msg err" role="alert">${E(errText(e))}</div><div class="actions" style="margin-top:10px"><button type="button" class="btn primary" data-a="retry">Retry</button><button type="button" class="btn secondary" data-a="back">Back to list</button></div></div>`;
      c.querySelector('[data-a="retry"]').addEventListener("click", () => openRec(c, id));
      c.querySelector('[data-a="back"]').addEventListener("click", () => drawList(c, ++gen));
    }
  }

  function field(p, key, label, type, help, val, ro, users = []) {
    const id = `${p}-${key}`, hid = help ? ` aria-describedby="${id}-h"` : "", dis = ro ? " disabled" : "";
    const req = key === "firstName" || key === "lastName" || key === "email" ? " required" : "";
    let ctl;
    if (key === "portalUserId") {
      const list = users.slice();
      if (val && !list.some(u=>u.id===val)) list.push({id:val,name:"Previously linked user"});
      ctl = `<select id="${id}" name="${key}"${dis}><option value="">No portal account linked</option>${list.map(u=>`<option value="${E(u.id)}"${u.id===val?" selected":""}>${E(u.name || u.email || u.id)}${u.email?" — "+E(u.email):""}</option>`).join("")}</select>`;
    }
    else if (type === "area") ctl = `<textarea id="${id}" name="${key}"${hid}${dis}>${E(val)}</textarea>`;
    else if (type && type.startsWith("select:")) {
      const opts = type.slice(7).split(",");
      if (val && !opts.includes(val)) opts.push(val);
      ctl = `<select id="${id}" name="${key}"${dis}>${opts.map(o => `<option value="${E(o)}"${o === (val || "") ? " selected" : ""}>${E(o || "Select")}</option>`).join("")}</select>`;
    } else ctl = `<input id="${id}" name="${key}" type="${type || "text"}" value="${E(val)}"${hid}${req}${dis}${key === "portalUserId" ? ' list="' + p + '-users"' : ""}>`;
    const full = type === "area" ? " full" : "";
    return `<div class="hrr-f${full}"><label for="${id}"><span>${E(label)}</span></label>${ctl}${help ? `<small id="${id}-h">${E(help)}</small>` : ""}</div>`;
  }

  function drawForm(c, g, rec, docs) {
    const ro = !st.caps.canWrite, p = "hrr" + (++uid);
    const pendingId = rec?.id || (crypto.randomUUID ? crypto.randomUUID() : null);
    const s = { id: rec?.id || null, pendingId, version: rec?.version || 0, docs: docs.slice() };
    const d = rec?.data || {}, ch = rec?.checks || {};
    let users = [];
    try { users = (ensureStaffUsers()?.staffUsers || []).filter(u => UUID.test(u?.id || u?.userId || "")); } catch (_) {}
    const checksHtml = CHECKS.map(([k, l]) => {
      const v = ch[k] || {}, req = v.required ?? !OPTIONAL.has(k), stt = v.status || "Pending";
      return `<div class="hrr-check" data-check="${k}"><div><b id="${p}-c-${k}">${E(l)}</b>${v.reviewedAt ? `<div class="meta">Reviewed ${fmt(v.reviewedAt)}${v.reviewedBy ? " by " + E(v.reviewedBy) : ""}</div>` : `<div class="meta">Not yet reviewed</div>`}</div>
        <div class="hrr-f"><label for="${p}-cs-${k}"><span>Status</span></label><select id="${p}-cs-${k}" data-f="status" aria-describedby="${p}-c-${k}"${ro ? " disabled" : ""}>${["Pending", "Passed", "Failed"].map(o => `<option${o === stt ? " selected" : ""}>${o}</option>`).join("")}</select></div>
        <div class="hrr-f"><label for="${p}-cr-${k}"><span>Required</span></label><select id="${p}-cr-${k}" data-f="required" aria-describedby="${p}-c-${k}"${ro ? " disabled" : ""}><option value="1"${req ? " selected" : ""}>Required</option><option value="0"${!req ? " selected" : ""}>Not applicable</option></select></div>
        <div class="hrr-f"><label for="${p}-cn-${k}"><span>Review notes</span></label><textarea id="${p}-cn-${k}" data-f="notes" aria-describedby="${p}-c-${k}" style="min-height:60px"${ro ? " disabled" : ""}>${E(v.notes)}</textarea></div></div>`;
    }).join("");
    c.innerHTML = `<div class="hrr-wrap"><div class="panel">
      <div class="hrr-head"><div><h2>${rec ? E([d.firstName, d.lastName].filter(Boolean).join(" ") || "Employee record") : "Register employee"}</h2>
      <p class="muted">${rec ? `Ref ${E(rec.reference)} &middot; version ${E(rec.version)} &middot; ${badge(rec.decision)}${rec.reviewed_at ? ` &middot; decided ${fmt(rec.reviewed_at)}` : ""}` : "New employee - save as draft before uploading documents."}${ro ? ' &middot; <span class="badge">Read only</span>' : ""}</p></div>
      <div class="actions"><button type="button" class="btn secondary" data-a="back">Back to list</button>${rec ? `<button type="button" class="btn secondary" data-a="reload">Reload</button>` : ""}</div></div>
      <p class="muted" style="font-size:12px">All checks are recorded manually by HR. This portal does not perform automated identity, DVLA, right-to-work or DBS verification.</p>
      <div data-msg></div>
      <form data-form novalidate class="hrr-wrap">
      ${SECTIONS.map(([t, fs]) => `<fieldset class="hrr-sec"><legend>${E(t)}</legend><div class="hrr-grid">${fs.map(f => field(p, f[0], f[1], f[2], f[3], d[f[0]], ro, users)).join("")}</div></fieldset>`).join("")}
      <datalist id="${p}-users">${users.map(u => `<option value="${E(u.id || u.userId)}">${E(u.name || u.fullName || u.email || "")}</option>`).join("")}</datalist>
      <fieldset class="hrr-sec"><legend>Vetting checks</legend><p class="muted" style="font-size:12px">Checks marked not applicable need a note explaining why. Reviewer and date are stamped by the server on save.</p>${checksHtml}</fieldset>
      <fieldset class="hrr-sec"><legend>Decision</legend><div class="hrr-grid">
        <div class="hrr-f full"><label for="${p}-dn"><span>Decision note</span></label><textarea id="${p}-dn" data-dn aria-describedby="${p}-dnh"${ro ? " disabled" : ""}>${E(rec?.decision_note)}</textarea><small id="${p}-dnh">Required to approve or reject. Approval needs every required check passed with notes.</small></div></div></fieldset>
      ${ro ? "" : `<div class="hrr-sticky"><button type="submit" class="btn secondary" data-dec="Draft">Save draft</button><button type="button" class="btn primary" data-dec="Approved">Approve</button><button type="button" class="btn danger" data-dec="Rejected">Reject</button></div>`}
      </form></div>
      <div class="panel"><h3>Documents</h3><div data-docmsg></div>
      ${ro ? "" : `<div class="hrr-grid" data-up>
        <div class="hrr-f"><label for="${p}-file"><span>File</span></label><input id="${p}-file" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" aria-describedby="${p}-fh"><small id="${p}-fh">PNG, JPEG, WebP or PDF, up to 10 MB. Stored privately.</small></div>
        <div class="hrr-f"><label for="${p}-cat"><span>Category</span></label><select id="${p}-cat">${CATS.map(x => `<option>${E(x)}</option>`).join("")}</select></div>
        <div class="hrr-f" style="justify-content:flex-end"><button type="button" class="btn primary" data-a="upload">Upload document</button></div></div>`}
      <ul class="hrr-docs" data-docs></ul></div></div>`;

    const form = c.querySelector("[data-form]"), box = c.querySelector("[data-msg]"), dbox = c.querySelector("[data-docmsg]");
    const docsUl = c.querySelector("[data-docs]"), upBtn = c.querySelector('[data-a="upload"]');
    const paintDocs = () => {
      docsUl.innerHTML = s.docs.length ? s.docs.map(x => `<li><div><b>${E(x.name)}</b><div class="muted" style="font-size:12px">${E(x.category)} &middot; ${fmt(x.created_at)}</div></div><button type="button" class="btn secondary" data-doc="${E(x.id)}">Open</button></li>`).join("")
        : `<li class="hrr-empty" style="display:block">${s.id ? "No documents uploaded yet." : "Save the employee first to enable uploads."}</li>`;
      if (upBtn) upBtn.disabled = !s.id || rec?.decision !== "Draft";
      c.querySelector(`#${p}-file`)?.toggleAttribute("disabled", !s.id || rec?.decision !== "Draft");
    };
    paintDocs();
    c.querySelector('[data-a="back"]').addEventListener("click", () => drawList(c, ++gen));
    c.querySelector('[data-a="reload"]')?.addEventListener("click", () => openRec(c, s.id));

    const collect = () => {
      const data = {};
      SECTIONS.forEach(([, fs]) => fs.forEach(([k]) => { const el = form.elements[k]; data[k] = el ? el.value.trim() : ""; }));
      const checks = {};
      form.querySelectorAll("[data-check]").forEach(r => {
        const k = r.dataset.check, prev = ch[k] || {};
        checks[k] = { status: r.querySelector('[data-f="status"]').value, required: r.querySelector('[data-f="required"]').value === "1", notes: r.querySelector('[data-f="notes"]').value.trim() };
        if (prev.reviewedBy) checks[k].reviewedBy = prev.reviewedBy;
        if (prev.reviewedAt) checks[k].reviewedAt = prev.reviewedAt;
      });
      return { data, checks, decisionNote: form.querySelector("[data-dn]").value.trim() };
    };
    const validate = (v, dec) => {
      if (!v.data.firstName || !v.data.lastName || !v.data.email) return "First name, last name and email are required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.data.email)) return "Enter a valid email address.";
      if (v.data.portalUserId && !UUID.test(v.data.portalUserId)) return "Linked portal user ID must be an existing user UUID, or left blank.";
      for (const [k, l] of CHECKS) {
        if (dec !== "Draft" && !v.checks[k].required && !v.checks[k].notes) return `${l}: add a note explaining why this check is not applicable.`;
        if (v.checks[k].status !== "Pending" && !v.checks[k].notes) return `${l}: add review notes for this result.`;
      }
      if (dec !== "Draft" && !v.decisionNote) return "Add a decision note before approving or rejecting.";
      if (dec === "Approved") for (const [k, l] of CHECKS) { const x = v.checks[k]; if (x.required && (x.status !== "Passed" || !x.notes)) return `${l}: required checks must be Passed with notes before approval.`; }
      return "";
    };
    let busy = false;
    const save = async dec => {
      if (busy || ro) return;
      const v = collect(), bad = validate(v, dec);
      if (bad) { msg(box, bad, "err"); box.scrollIntoView({ block: "nearest" }); return; }
      if (dec !== "Draft" && !confirm(`${dec === "Approved" ? "Approve" : "Reject"} this employee?`)) return;
      if (c.querySelector('input[type="file"]')?.files?.length)
        return msg(box, "Upload the selected document first, or clear the file selection before saving.", "err");
      busy = true; const btns = form.querySelectorAll("input,select,textarea,button"); btns.forEach(b => b.disabled = true);
      if (upBtn) upBtn.disabled = true;
      msg(box, "Saving...", "info");
      try {
        const saved = await HRScreeningAPI.save({ id: s.id || s.pendingId, version: s.version, data: v.data, checks: v.checks, decision: dec, decisionNote: v.decisionNote });
        if (!live(c, g)) return;
        drawForm(c, g, saved, s.docs);
        msg(c.querySelector("[data-msg]"), dec === "Draft" ? "Draft saved." : `Employee ${dec.toLowerCase()}.`, "ok");
      } catch (e) {
        if (!live(c, g)) return;
        busy = false; btns.forEach(b => b.disabled = false);
        paintDocs();
        msg(box, "Save could not be confirmed. Your form is unchanged. " + errText(e), "err");
      }
    };
    form.addEventListener("submit", e => { e.preventDefault(); save("Draft"); });
    form.querySelectorAll('[data-dec]:not([type="submit"])').forEach(b => b.addEventListener("click", () => save(b.dataset.dec)));

    upBtn?.addEventListener("click", async () => {
      if (busy) return;
      const inp = c.querySelector(`#${p}-file`), file = inp.files?.[0], cat = c.querySelector(`#${p}-cat`).value;
      if (!s.id) return msg(dbox, "Save the employee before uploading documents.", "err");
      if (!file) return msg(dbox, "Choose a file to upload.", "err");
      if (!TYPES.has(file.type) || file.size < 1 || file.size > 10485760) return msg(dbox, "Choose a PNG, JPEG, WebP or PDF file up to 10 MB.", "err");
      if (rec?.decision !== "Draft") return msg(dbox, "Save this employee as Draft before adding documents.", "err");
      busy = true;
      form.querySelectorAll("[data-dec]").forEach(b => b.disabled = true);
      upBtn.disabled = true; inp.disabled = true; msg(dbox, "Uploading...", "info");
      try {
        const doc = await HRScreeningAPI.upload(s.id, file, cat, s.version);
        if (!live(c, g)) return;
        if (!s.docs.some(d => d.id === doc.id)) s.docs.push(doc);
        s.version = doc.recordVersion;
        inp.value = ""; msg(dbox, "Document uploaded. Review and save the screening checks when ready.", "ok");
      } catch (e) { if (live(c, g)) msg(dbox, "Upload failed. Your file is still selected - retry when ready. " + errText(e), "err"); }
      finally { if (live(c, g)) { busy = false; form.querySelectorAll("[data-dec]").forEach(b => b.disabled = false); inp.disabled = false; paintDocs(); } }
    });
    docsUl.addEventListener("click", async e => {
      const b = e.target.closest("[data-doc]"); if (!b) return;
      const doc = s.docs.find(x => String(x.id) === b.dataset.doc); if (!doc) return;
      const w = window.open("about:blank", "_blank");
      if (w) w.opener = null;
      b.disabled = true;
      try {
        const url = await HRScreeningAPI.documentUrl(doc.path);
        if (!/^https:\/\//i.test(url || "")) throw new Error("Document link was not valid.");
        if (w) w.location.replace(url); else location.assign(url);
      } catch (err) { if (w) w.close(); msg(dbox, "Could not open document: " + errText(err), "err"); }
      finally { b.disabled = false; }
    });
  }

  return { draw };
})();
