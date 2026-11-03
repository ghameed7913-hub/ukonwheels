/* UK On Wheels - Trade plates (HR assignment + Driver read-only tab). Classic script, no private data stored locally. */
(function () {
  "use strict";
  var gen = 0, dGen = 0, timer = null, focusFn = null, busy = false;
  var st = { drivers: [], items: [], msg: null, form: null };

  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function actor() { try { return currentSession && currentSession.user ? String(currentSession.user.id) : ""; } catch (e) { return ""; } }
  function errText(e) {
    var m = (e && e.message) || String(e || "Unknown error");
    if ((e && e.status === 409) || /conflict|version|stale|changed/i.test(m)) return "This assignment was changed by someone else. Use Refresh to load the latest data, then try again. (" + m + ")";
    return m;
  }
  function todayLondon() {
    try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { return new Date().toISOString().slice(0, 10); }
  }
  function ymd(v) { var m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v || "")); return m ? m[1] : ""; }
  function expired(v) { var d = ymd(v); return !!d && d < todayLondon(); }
  function fmtDate(v) {
    var d = ymd(v); if (!d) return esc(v || "Not set");
    var p = d.split("-"), dt = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return esc(dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }));
  }
  function badge(v) {
    return expired(v) ? '<span class="badge red tp-badge" data-testid="status-plate-expired">Expired</span>'
      : '<span class="badge green tp-badge" data-testid="status-plate-valid">Valid</span>';
  }
  function msgHtml(m) {
    if (!m) return "";
    return '<div class="tp-msg ' + (m.kind === "err" ? "err" : "ok") + '" role="' + (m.kind === "err" ? "alert" : "status") + '" data-testid="status-trade-plates-message">' + esc(m.text) + "</div>";
  }
  function normPlate(s) { return String(s || "").toUpperCase().replace(/[\s-]+/g, ""); }

  /* ---------- HR page ---------- */
  function live(c, g, a) { return g === gen && c.isConnected && a === actor(); }

  async function draw(c) {
    if (!c) return;
    if (busy) return;
    var g = ++gen, a = actor();
    c.innerHTML = '<div class="panel tp-wrap"><h2>Trade plates</h2><p class="muted">Loading assignments...</p><div class="tp-skel"></div><div class="tp-skel" style="width:65%"></div></div>';
    if (!window.TradePlatesAPI) { c.innerHTML = '<div class="panel tp-wrap"><h2>Trade plates</h2><div class="tp-msg err" role="alert">Trade plates service is not available.</div></div>'; return; }
    var r;
    try { r = await window.TradePlatesAPI.list(); }
    catch (e) {
      if (!live(c, g, a)) return;
      c.innerHTML = '<div class="panel tp-wrap"><h2>Trade plates</h2><div class="tp-msg err" role="alert">Could not load trade plates. ' + esc(errText(e)) + '</div><button type="button" class="btn secondary" data-tp="retry" data-testid="button-trade-plates-retry">Try again</button></div>';
      c.querySelector('[data-tp="retry"]').onclick = function () { draw(c); };
      return;
    }
    if (!live(c, g, a)) return;
    if (!r || !r.canManage) { c.innerHTML = '<div class="panel tp-wrap"><h2>Trade plates</h2><div class="tp-msg err" role="alert">You do not have permission to manage trade plates.</div></div>'; return; }
    st.drivers = Array.isArray(r.drivers) ? r.drivers : [];
    st.items = Array.isArray(r.assignments) ? r.assignments.slice() : [];
    st.items.sort(function (x, y) { return String(x.driver_name || "").localeCompare(String(y.driver_name || "")); });
    render(c, g, a);
  }

  function current(id) { for (var i = 0; i < st.items.length; i++) if (String(st.items[i].driver_id) === String(id)) return st.items[i]; return null; }

  function render(c, g, a) {
    var f = st.form || { driverId: "", plate: "", exp: "" };
    var opts = '<option value="">Select Driver</option>' + st.drivers.map(function (d) {
      var cur = current(d.id);
      return '<option value="' + esc(d.id) + '"' + (String(d.id) === String(f.driverId) ? " selected" : "") + ">" + esc(d.name) + (cur ? " (has " + esc(cur.plate_number) + ")" : "") + "</option>";
    }).join("");
    var nExp = st.items.filter(function (x) { return expired(x.expires_on); }).length;
    var rows = st.items.length ? st.items.map(function (x) {
      var id = esc(x.driver_id);
      return '<li class="tp-row' + (expired(x.expires_on) ? " tp-row-exp" : "") + '" data-testid="row-trade-plate-' + id + '">' +
        '<div class="tp-plate" data-testid="text-plate-number-' + id + '">' + esc(x.plate_number) + "</div>" +
        '<div class="tp-who"><strong data-testid="text-plate-driver-' + id + '">' + esc(x.driver_name) + '</strong><span class="muted">Expires ' + fmtDate(x.expires_on) + "</span></div>" +
        badge(x.expires_on) +
        '<div class="tp-acts"><button type="button" class="btn secondary" data-edit="' + id + '" data-testid="button-edit-plate-' + id + '">Edit</button>' +
        '<button type="button" class="btn danger" data-del="' + id + '" data-testid="button-remove-plate-' + id + '">Remove</button></div></li>';
    }).join("") : '<li class="tp-empty" data-testid="status-trade-plates-empty">No trade plates are assigned yet. Use the form to assign one to a Driver.</li>';

    c.innerHTML = '<div class="tp-wrap">' +
      '<div class="panel"><div class="tp-head"><h2>Trade plates</h2><button type="button" class="btn secondary" data-tp="refresh" data-testid="button-trade-plates-refresh">Refresh</button></div>' +
      '<p class="muted">One current plate per Driver. A plate number can only be held by one Driver.</p>' +
      '<div data-tp="msg">' + msgHtml(st.msg) + "</div>" +
      '<form class="tp-form" novalidate data-testid="form-trade-plate">' +
        '<label class="tp-field"><span>Driver</span><select name="driverId" required data-testid="select-plate-driver">' + opts + "</select></label>" +
        '<label class="tp-field"><span>Trade plate number</span><input name="plate" required maxlength="24" autocomplete="off" placeholder="e.g. 123 AB" value="' + esc(f.plate) + '" data-testid="input-plate-number"></label>' +
        '<label class="tp-field"><span>Expiry date</span><input name="exp" type="date" required min="' + todayLondon() + '" value="' + esc(f.exp) + '" data-testid="input-plate-expiry"></label>' +
        '<div class="tp-foot"><button type="submit" class="btn" data-testid="button-save-plate">' + (busy ? "Saving..." : "Save assignment") + '</button>' +
        '<button type="button" class="btn secondary" data-tp="clear" data-testid="button-clear-plate">Clear</button></div>' +
      "</form></div>" +
      '<div class="panel"><div class="tp-head"><h3>Assigned plates</h3><span class="tp-count" data-testid="text-plate-count">' + st.items.length + " assigned" + (nExp ? " &middot; " + nExp + " expired" : "") + "</span></div>" +
      '<ul class="tp-list">' + rows + "</ul></div></div>";

    var form = c.querySelector("form");
    var btn = form.querySelector('[type="submit"]');
    btn.disabled = busy;
    function snap() { st.form = { driverId: form.driverId.value, plate: form.plate.value, exp: form.exp.value }; }
    form.addEventListener("input", snap); form.addEventListener("change", snap);
    form.plate.addEventListener("blur", function () { form.plate.value = normPlate(form.plate.value); snap(); });
    c.querySelector('[data-tp="refresh"]').onclick = function () { if (busy) return; st.msg = null; snap(); draw(c); };
    c.querySelector('[data-tp="clear"]').onclick = function () { if (busy) return; st.form = null; st.msg = null; render(c, g, a); };
    form.onsubmit = function (ev) { ev.preventDefault(); if (busy) return; snap(); save(c, g, a); };
    Array.prototype.forEach.call(c.querySelectorAll("[data-edit]"), function (b) {
      b.onclick = function () {
        if (busy) return;
        var x = current(b.getAttribute("data-edit")); if (!x) return;
        st.form = { driverId: String(x.driver_id), plate: x.plate_number, exp: ymd(x.expires_on) }; st.msg = null;
        render(c, g, a); var p = c.querySelector('[name="plate"]'); if (p) p.focus();
      };
    });
    Array.prototype.forEach.call(c.querySelectorAll("[data-del]"), function (b) {
      b.onclick = function () { remove(c, g, a, b.getAttribute("data-del"), b); };
    });
  }

  function setMsg(c, m) { st.msg = m; var box = c.querySelector('[data-tp="msg"]'); if (box) box.innerHTML = msgHtml(m); }

  async function save(c, g, a) {
    if (busy || !live(c,g,a)) return;
    var f = st.form || {};
    var plate = normPlate(f.plate), exp = f.exp || "";
    if (!f.driverId) return setMsg(c, { kind: "err", text: "Select a Driver." });
    if (!plate) return setMsg(c, { kind: "err", text: "Enter a trade plate number." });
    if (!/^[A-Z0-9]{2,20}$/.test(plate)) return setMsg(c, { kind: "err", text: "Trade plate number must contain 2 to 20 letters or digits." });
    var parsedDate = new Date(exp + "T00:00:00Z");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exp) || isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0,10) !== exp) return setMsg(c, { kind: "err", text: "Enter a valid expiry date." });
    if (exp < todayLondon()) return setMsg(c, { kind: "err", text: "Expiry date cannot be in the past (UK time)." });
    var holder = null;
    st.items.forEach(function (x) { if (normPlate(x.plate_number) === plate && String(x.driver_id) !== String(f.driverId)) holder = x; });
    if (holder) return setMsg(c, { kind: "err", text: "Plate " + plate + " is already assigned to " + (holder.driver_name || "another Driver") + ". Remove it there first." });
    var cur = current(f.driverId);
    if (cur && !(normPlate(cur.plate_number) === plate && ymd(cur.expires_on) === exp)) {
      if (!window.confirm("Replace " + (cur.driver_name || "this Driver") + "'s current plate " + cur.plate_number + " (expires " + ymd(cur.expires_on) + ") with " + plate + "?")) return;
    }
    busy = true; st.form.plate = plate;
    var btn = c.querySelector('button[type="submit"]'); if (btn) { btn.disabled = true; btn.textContent = "Saving..."; }
    try {
      var saved = await window.TradePlatesAPI.save({ driverId: f.driverId, plateNumber: plate, expiresOn: exp, expectedVersion: cur ? cur.version : 0 });
      if (!live(c, g, a)) return;
      busy = false;
      st.form = null;
      st.msg = { kind: "ok", text: "Saved " + ((saved && saved.plate_number) || plate) + " for " + ((saved && saved.driver_name) || (cur && cur.driver_name) || "Driver") + "." };
      draw(c);
    } catch (e) {
      if (!live(c, g, a)) return;
      busy = false;
      if (btn) { btn.disabled = false; btn.textContent = "Save assignment"; }
      setMsg(c, { kind: "err", text: "Could not save. " + errText(e) });
    }
  }

  async function remove(c, g, a, id, b) {
    if (!live(c,g,a)) return;
    var x = current(id); if (!x || busy) return;
    if (!window.confirm("Remove trade plate " + x.plate_number + " from " + x.driver_name + "?")) return;
    busy = true; b.disabled = true; b.textContent = "Removing...";
    try {
      await window.TradePlatesAPI.remove({ driverId: x.driver_id, expectedVersion: x.version });
      if (!live(c, g, a)) return;
      busy = false;
      st.msg = { kind: "ok", text: "Removed " + x.plate_number + " from " + x.driver_name + "." };
      draw(c);
    } catch (e) {
      if (!live(c, g, a)) return;
      busy = false;
      b.disabled = false; b.textContent = "Remove";
      setMsg(c, { kind: "err", text: "Could not remove. " + errText(e) });
    }
  }

  /* ---------- Driver tab ---------- */
  var dState = { a: undefined, err: "", loading: false, at: null, who: "" };
  function dEl() { var el = document.getElementById("tradePlateDriver"); return el && el.isConnected ? el : null; }
  function dHtml() {
    var s = dState, h = '<div class="driverSectionTitle tp-dhead"><h3 style="margin:0">Assigned trade plate</h3>' +
      '<button type="button" class="btn secondary" data-tp="drefresh" data-testid="button-my-plate-refresh"' + (s.loading ? " disabled" : "") + ">" + (s.loading ? "Refreshing..." : "Refresh") + "</button></div>";
    if (s.err) h += '<div class="tp-msg err" role="alert" data-testid="status-my-plate-error">Could not load your trade plate. ' + esc(s.err) + (s.a !== undefined ? " Showing last loaded data." : "") + "</div>";
    if (s.a === undefined) h += s.loading || !s.err ? '<div class="tp-skel"></div>' : "";
    else if (!s.a) h += '<div class="driverEmpty tp-none" data-testid="status-my-plate-unassigned">No trade plate is assigned to you. Speak to HR if you need one.</div>';
    else h += '<div class="tp-card' + (expired(s.a.expires_on) ? " tp-row-exp" : "") + '" data-testid="card-my-plate">' +
      '<div class="tp-plate tp-plate-lg" data-testid="text-my-plate-number">' + esc(s.a.plate_number) + "</div>" +
      '<div class="tp-who"><strong>' + esc(s.a.driver_name) + '</strong><span class="muted">Expires ' + fmtDate(s.a.expires_on) + "</span></div>" + badge(s.a.expires_on) +
      (expired(s.a.expires_on) ? '<p class="tp-note">This plate has expired. Contact HR before using it.</p>' : "") + "</div>";
    if (s.at) h += '<p class="tp-upd muted" role="status">Updated ' + esc(s.at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })) + "</p>";
    return h;
  }
  function dPaint() {
    var el = dEl(); if (!el) return;
    el.innerHTML = dHtml();
    var b = el.querySelector('[data-tp="drefresh"]'); if (b) b.onclick = function () { dLoad(); };
  }
  async function dLoad() {
    var el = dEl(); if (!el || !window.TradePlatesAPI) { if (el) { dState.err = "Service not available."; dPaint(); } return; }
    var g = ++dGen, a = actor();
    if (dState.who !== a) dState = { a: undefined, err: "", loading: false, at: null, who: a };
    dState.loading = true; dPaint();
    try {
      var r = await window.TradePlatesAPI.mine();
      if (g !== dGen || a !== actor() || !dEl()) return;
      dState.a = r && r.assignment ? r.assignment : null; dState.err = ""; dState.at = new Date();
    } catch (e) {
      if (g !== dGen || a !== actor() || !dEl()) return;
      dState.err = errText(e);
    }
    dState.loading = false; dPaint();
  }
  function renderDriver() { return '<div id="tradePlateDriver" class="tp-driver panel" aria-live="polite"><div class="tp-skel"></div></div>'; }
  function mountDriver() {
    stop();
    if (!dEl()) return;
    dLoad();
    timer = setInterval(function () { if (!dEl()) return stop(); if (!document.hidden) dLoad(); }, 60000);
    focusFn = function () { if (dEl()) dLoad(); else stop(); };
    window.addEventListener("focus", focusFn);
  }
  function stop() {
    if (timer) clearInterval(timer); timer = null;
    if (focusFn) window.removeEventListener("focus", focusFn); focusFn = null;
    dGen++;
    gen++;
    busy = false;
  }
  function reset() {
    stop(); gen++; busy = false;
    st = { drivers: [], items: [], msg: null, form: null };
    dState = { a: undefined, err: "", loading: false, at: null, who: "" };
  }

  window.TradePlatesUI = { draw: draw, renderDriver: renderDriver, mountDriver: mountDriver, reset: reset, stop: stop };
})();
