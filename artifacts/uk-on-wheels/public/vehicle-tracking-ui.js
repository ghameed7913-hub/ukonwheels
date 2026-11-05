/* UK On Wheels - Live vehicle tracking (Admin/Client page + Driver sharing controls). Classic script. */
(function () {
  "use strict";
  var STALE_MS = 120000, POLL_MS = 15000, DRIVER_MS = 5000;
  var ACTIVE = ["Picked Up", "On Route", "Delayed", "Accident", "Fault On Route", "Assigned AA on Route", "Claims"];
  var ENDED = ["Delivered", "Cancelled"];
  var gen = 0, timer = null, focusFn = null, visFn = null, host = null;
  var st = { query: "", data: null, offset: 0, selected: "", loading: false, err: "", who: "" };

  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function actor() { try { return currentSession && currentSession.user ? String(currentSession.user.id) : ""; } catch (e) { return ""; } }
  function idOk(v) { return /^[A-Za-z0-9-]{1,64}$/.test(String(v || "")); }
  function num(v) { var n = Number(v); return typeof v === "number" && isFinite(n) ? n : NaN; }
  function fmtTime(ms) {
    if (!isFinite(ms)) return "Unknown";
    return new Date(ms).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Europe/London" });
  }
  function ago(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    if (s < 60) return s + "s ago";
    var m = Math.round(s / 60); if (m < 60) return m + " min ago";
    var h = Math.floor(m / 60); return h + " h " + (m % 60) + " min ago";
  }
  function serverNow() { return Date.now() + st.offset; }
  function errText(e) { return (e && e.message) || String(e || "Unknown error"); }

  /* ---------- Admin / Client page ---------- */
  function live(c, g, a) { return g === gen && c === host && c.isConnected && a === actor(); }

  function draw(c) {
    if (!c) return;
    stopTimers(); gen++;
    host = c;
    var a = actor();
    if (st.who !== a) st = { query: "", data: null, offset: 0, selected: "", loading: false, err: "", who: a };
    c.innerHTML =
      '<div class="vt-wrap" data-testid="page-vehicle-tracking">' +
      '<div class="panel vt-top"><div class="vt-head"><div><h2>Track vehicle</h2>' +
      '<p class="muted">Live position is shown only while the assigned Driver is sharing location during the delivery.</p></div>' +
      '<button type="button" class="btn secondary" data-vt="refresh" data-testid="button-tracking-refresh">Refresh</button></div>' +
      '<form class="vt-search" role="search" data-testid="form-tracking-search">' +
      '<label class="vt-field"><span>Booking reference or registration</span>' +
      '<input name="q" maxlength="40" autocomplete="off" placeholder="e.g. BK00129 or AB12 CDE" value="' + esc(st.query) + '" data-testid="input-tracking-search"></label>' +
      '<button type="submit" class="btn primary" data-testid="button-tracking-search">Search</button>' +
      '<button type="button" class="btn secondary" data-vt="clear" data-testid="button-tracking-clear">Show latest</button></form></div>' +
      '<div class="vt-body" data-vt="body" aria-live="polite"></div></div>';
    var form = c.querySelector("form");
    form.onsubmit = function (ev) { ev.preventDefault(); st.query = form.q.value.trim(); st.selected = ""; load(c, true); };
    c.querySelector('[data-vt="clear"]').onclick = function () { form.q.value = ""; st.query = ""; st.selected = ""; load(c, true); };
    c.querySelector('[data-vt="refresh"]').onclick = function () { load(c, false); };
    paint(c);
    load(c, !st.data);
    timer = setInterval(function () {
      if (host !== c || !c.isConnected) return stop();
      if (!document.hidden) load(c, false);
    }, POLL_MS);
    focusFn = function () { if (host === c && c.isConnected) load(c, false); else stop(); };
    visFn = function () { if (!document.hidden) focusFn(); };
    window.addEventListener("focus", focusFn);
    document.addEventListener("visibilitychange", visFn);
  }

  async function load(c, showSkeleton) {
    var g = ++gen, a = actor(), q = st.query;
    if (!window.VehicleTrackingAPI || typeof window.VehicleTrackingAPI.search !== "function") {
      st.err = "Vehicle tracking service is not available."; st.loading = false; paint(c); return;
    }
    st.loading = true; if (showSkeleton) st.data = null; st.err = ""; paint(c);
    var t0 = Date.now(), r;
    try { r = await window.VehicleTrackingAPI.search(q); }
    catch (e) {
      if (!live(c, g, a) || q !== st.query) return;
      st.loading = false; st.err = errText(e); paint(c); return;
    }
    if (!live(c, g, a) || q !== st.query) return;
    var mid = t0 + (Date.now() - t0) / 2, srv = Date.parse(r && r.server_time);
    st.offset = isFinite(srv) ? srv - mid : 0;
    st.data = { bookings: Array.isArray(r && r.bookings) ? r.bookings : [], at: Date.now() };
    st.loading = false; st.err = "";
    var list = st.data.bookings;
    if (!list.some(function (b) { return String(b.id) === st.selected; })) st.selected = list.length === 1 ? String(list[0].id) : (list[0] && st.selected === "" && q ? String(list[0].id) : "");
    paint(c);
  }

  function paint(c) {
    var body = c.querySelector('[data-vt="body"]'); if (!body) return;
    var rb = c.querySelector('[data-vt="refresh"]');
    if (rb) { rb.disabled = st.loading; rb.textContent = st.loading ? "Refreshing..." : "Refresh"; }
    var h = "";
    if (st.err) h += '<div class="vt-msg err" role="alert" data-testid="status-tracking-error">Could not load tracking. ' + esc(st.err) +
      (st.data ? " Showing last loaded data." : "") + ' <button type="button" class="btn secondary vt-retry" data-vt="retry" data-testid="button-tracking-retry">Try again</button></div>';
    if (!st.data) {
      if (!st.err) h += '<div class="panel vt-loading" role="status" aria-busy="true"><span class="vt-sr">Loading bookings</span><div class="vt-skel"></div><div class="vt-skel" style="width:70%"></div><div class="vt-skel vt-skel-map"></div></div>';
      body.innerHTML = h; bindRetry(c); return;
    }
    var list = st.data.bookings;
    if (!list.length) {
      h += '<div class="panel vt-empty" data-testid="status-tracking-empty"><strong>No bookings found</strong><p class="muted">' +
        (st.query ? "Nothing matches \u201C" + esc(st.query) + "\u201D. Check the reference or registration and try again." : "There are no bookings visible to your account yet.") + "</p></div>";
      body.innerHTML = h; bindRetry(c); return;
    }
    var sel = null; list.forEach(function (b) { if (String(b.id) === st.selected) sel = b; });
    h += '<div class="vt-grid' + (sel ? " has-sel" : "") + '"><div class="panel vt-results"><div class="vt-rhead"><h3>' + (st.query ? "Matches" : "Latest bookings") +
      '</h3><span class="vt-count" data-testid="text-tracking-count">' + list.length + "</span></div><ul class=\"vt-list\">" +
      list.map(function (b) {
        var id = esc(b.id), on = String(b.id) === st.selected;
        return '<li><button type="button" class="vt-item' + (on ? " on" : "") + '" aria-pressed="' + on + '" data-sel="' + id + '" data-testid="button-tracking-result-' + id + '">' +
          '<span class="vt-reg">' + esc(b.registration || "No reg") + "</span>" +
          '<span class="vt-imeta"><strong>' + esc(b.reference || "No reference") + "</strong><span class=\"muted\">" + esc([b.make, b.model].filter(Boolean).join(" ") || "Vehicle") +
          (b.destination ? " &middot; to " + esc(b.destination) : "") + "</span></span>" + liveDot(b) + "</button></li>";
      }).join("") + "</ul></div>" +
      '<div class="vt-detail">' + (sel ? detail(sel) : '<div class="panel vt-empty" data-testid="status-tracking-select"><strong>Select a booking</strong><p class="muted">Several bookings can share a registration. Pick the right reference to see its live position and timeline.</p></div>') + "</div></div>";
    body.innerHTML = h;
    bindRetry(c);
    Array.prototype.forEach.call(body.querySelectorAll("[data-sel]"), function (b) {
      b.onclick = function () { st.selected = b.getAttribute("data-sel"); paint(c); var d = c.querySelector(".vt-detail h3"); if (d && window.innerWidth < 800) d.scrollIntoView({ block: "start" }); };
    });
  }
  function bindRetry(c) { var r = c.querySelector('[data-vt="retry"]'); if (r) r.onclick = function () { load(c, !st.data); }; }

  function freshness(b) {
    var l = b.location;
    // Never render a cached GPS point for a delivered, assigned-only or otherwise
    // inactive booking, even if an older response still says "sharing".
    if (ACTIVE.indexOf(String(b.status || "")) < 0 || !b.sharing || !l) return { kind: "none" };
    var lat = num(l.latitude), lon = num(l.longitude);
    if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) return { kind: "none" };
    var rec = Date.parse(l.recorded_at), rcv = Date.parse(l.received_at), ref = isFinite(rec) ? rec : rcv;
    var age = isFinite(ref) ? serverNow() - ref : Infinity;
    return { kind: age > STALE_MS ? "stale" : "live", lat: lat, lon: lon, acc: num(l.accuracy), at: ref, rcv: rcv, age: age };
  }
  function liveDot(b) {
    var f = freshness(b);
    if (f.kind === "live") return '<span class="vt-pill live">Live</span>';
    if (f.kind === "stale") return '<span class="vt-pill stale">Offline</span>';
    return "";
  }
  function mapUrl(lat, lon) {
    var d = 0.01, f = function (n) { return Number(n).toFixed(6); };
    return "https://www.openstreetmap.org/export/embed.html?bbox=" + f(lon - d) + "%2C" + f(lat - d) + "%2C" + f(lon + d) + "%2C" + f(lat + d) +
      "&layer=mapnik&marker=" + f(lat) + "%2C" + f(lon);
  }
  function detail(b) {
    var id = esc(b.id), f = freshness(b), status = String(b.status || "Unknown");
    var h = '<div class="panel vt-card" data-testid="card-tracking-' + id + '"><div class="vt-chead"><div><h3 data-testid="text-tracking-ref">' + esc(b.reference || "Booking") + "</h3>" +
      '<p class="muted">' + esc([b.make, b.model].filter(Boolean).join(" ") || "Vehicle") + ' &middot; <span class="vt-reg sm">' + esc(b.registration || "No reg") + "</span></p></div>" +
      '<span class="badge vt-status" data-testid="status-tracking-booking">' + esc(status) + "</span></div>" +
      '<dl class="vt-facts"><div><dt>Collection</dt><dd>' + esc(b.pickup || "Not set") + "</dd></div><div><dt>Delivery</dt><dd>" + esc(b.destination || "Not set") +
      "</dd></div><div><dt>Driver</dt><dd>" + esc(b.driver_name || "Not assigned") + "</dd></div></dl>";
    if (f.kind === "none") {
      var why = ENDED.indexOf(status) >= 0 ? "This booking has ended, so live location is no longer shared."
        : ACTIVE.indexOf(status) >= 0 ? "Location updates are unavailable right now. The Driver may not have started sharing, or their phone may be offline."
        : "The Driver has not started sharing location yet. Sharing begins after the vehicle is picked up.";
      h += '<div class="vt-noloc" role="status" data-testid="status-tracking-no-location"><strong>No live location</strong><p>' + why + "</p></div>";
    } else {
      h += '<div class="vt-locbar"><span class="vt-pill ' + f.kind + '" data-testid="status-tracking-freshness">' + (f.kind === "live" ? "Live" : "Offline &middot; no update for over 2 min") + "</span>" +
        '<span data-testid="text-tracking-updated">Last updated ' + esc(fmtTime(f.at)) + (isFinite(f.age) ? " (" + esc(ago(f.age)) + ")" : "") + "</span>" +
        (isFinite(f.acc) ? '<span data-testid="text-tracking-accuracy">Accuracy &plusmn;' + esc(Math.round(f.acc)) + " m</span>" : "") + "</div>" +
        '<div class="vt-map' + (f.kind === "stale" ? " is-stale" : "") + '"><iframe title="Last reported position of ' + esc(b.registration || b.reference || "vehicle") +
        '" loading="lazy" referrerpolicy="no-referrer" src="' + esc(mapUrl(f.lat, f.lon)) + '" data-testid="map-tracking"></iframe></div>' +
        '<p class="vt-coords muted"><span data-testid="text-tracking-coords">' + f.lat.toFixed(5) + ", " + f.lon.toFixed(5) + "</span> &middot; " +
        '<a href="https://www.openstreetmap.org/?mlat=' + f.lat.toFixed(6) + "&amp;mlon=" + f.lon.toFixed(6) + '#map=15/' + f.lat.toFixed(6) + "/" + f.lon.toFixed(6) +
        '" target="_blank" rel="noopener noreferrer" data-testid="link-tracking-open-map">Open larger map</a></p>';
    }
    var ev = Array.isArray(b.events) ? b.events.slice() : [];
    ev.sort(function (x, y) { return (Date.parse(y.at) || 0) - (Date.parse(x.at) || 0); });
    h += '<h4 class="vt-tl-h">Timeline</h4><ol class="vt-tl" data-testid="list-tracking-timeline">' +
      (ev.length ? ev.map(function (e, i) {
        return '<li class="' + (i === 0 ? "now" : "") + '"><strong>' + esc(e.status || "Update") + '</strong><span class="muted">' + esc(fmtTime(Date.parse(e.at))) + "</span></li>";
      }).join("") : '<li><span class="muted">No status changes recorded yet.</span></li>') + "</ol></div>";
    return h;
  }

  function stopTimers() {
    if (timer) clearInterval(timer); timer = null;
    if (focusFn) window.removeEventListener("focus", focusFn); focusFn = null;
    if (visFn) document.removeEventListener("visibilitychange", visFn); visFn = null;
  }
  function stop() { stopTimers(); stopDriver(); gen++; host = null; }
  function reset() {
    var h = host; stop();
    if (h) h.innerHTML = "";
    Array.prototype.forEach.call(document.querySelectorAll("[data-vt-driver]"), function (el) { el.innerHTML = ""; });
    st = { query: "", data: null, offset: 0, selected: "", loading: false, err: "", who: "" };
    dNotice = {};
    dBusy = {};
  }

  /* ---------- Driver sharing controls ---------- */
  var dTimer = null, dChange = null, dBusy = {}, dNotice = {};
  function renderDriver(b) {
    b = b || {};
    var nid = idOk(b._normalizedId) ? String(b._normalizedId) : "";
    var key = esc(nid || "none-" + String(b.ref || "").replace(/[^A-Za-z0-9-]/g, ""));
    return '<div class="vt-drv" data-vt-driver="' + esc(nid) + '" data-vt-status="' + esc(b.status || "") + '" data-testid="panel-driver-tracking-' + key + '" aria-live="polite">' + driverInner(nid, String(b.status || "")) + "</div>";
  }
  function driverInner(nid, status) {
    var s = null, svc = window.DriverTracking && typeof window.DriverTracking.status === "function";
    if (nid && svc) { try { s = window.DriverTracking.status(nid) || null; } catch (e) { s = { sharing: false, error: errText(e) }; } }
    var sharing = !!(s && s.sharing), eligible = ACTIVE.indexOf(status) >= 0, k = esc(nid || "none");
    var h = '<div class="vt-drv-head"><strong>Live location</strong><span class="vt-pill ' + (sharing ? "live" : "off") + '" data-testid="status-driver-sharing-' + k + '">' + (sharing ? "Sharing" : "Not sharing") + "</span></div>" +
      '<p class="vt-drv-note">While sharing, your position is visible to Admin and this booking\u2019s Client during the delivery only. Background sharing on the phone app needs the latest app build.</p>';
    if (s && s.mode) h += '<p class="vt-drv-note muted">Mode: ' + esc(s.mode) + "</p>";
    var block = "";
    if (!nid) block = "Location sharing is not available for this older booking. Ask Admin to enable it.";
    else if (!svc) block = "Location sharing is not available on this device.";
    else if (ENDED.indexOf(status) >= 0) block = "This booking is " + esc(status) + ". Location sharing has ended.";
    else if (!eligible && !sharing) block = "You can start sharing after the vehicle is marked Picked Up.";
    if (block) h += '<p class="vt-drv-block" data-testid="text-driver-sharing-blocked-' + k + '">' + block + "</p>";
    var busy = !!dBusy[nid];
    if (nid && svc && sharing) h += '<button type="button" class="btn secondary" data-vt-act="stop" ' + (busy ? "disabled" : "") + ' data-testid="button-driver-stop-sharing-' + k + '">' + (busy ? "Stopping..." : "Stop sharing") + "</button>";
    else if (!block || !nid) h += '<button type="button" class="btn primary" data-vt-act="start" ' + (busy || !nid || !svc || !eligible ? "disabled" : "") + ' data-testid="button-driver-start-sharing-' + k + '">' + (busy ? "Starting..." : "Start sharing") + "</button>";
    var n = dNotice[nid] || (s && s.error ? { kind: "err", text: s.error } : null);
    if (n) h += '<div class="vt-msg ' + (n.kind === "err" ? "err" : "ok") + '" role="' + (n.kind === "err" ? "alert" : "status") + '" data-testid="status-driver-sharing-msg-' + k + '">' + esc(n.text) + "</div>";
    return h;
  }
  function refreshDriver() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-vt-driver]"), function (el) {
      var nid = el.getAttribute("data-vt-driver") || "", status = el.getAttribute("data-vt-status") || "";
      var html = driverInner(idOk(nid) ? nid : "", status);
      if (el.innerHTML !== html) el.innerHTML = html;
    });
  }
  function onDriverClick(ev) {
    var btn = ev.target && ev.target.closest ? ev.target.closest("[data-vt-act]") : null;
    if (!btn) return;
    var el = btn.closest("[data-vt-driver]"); if (!el) return;
    var nid = el.getAttribute("data-vt-driver") || "", act = btn.getAttribute("data-vt-act");
    if (!idOk(nid) || dBusy[nid] || !window.DriverTracking) return;
    var who = actor();
    dBusy[nid] = true; delete dNotice[nid]; refreshDriver();
    Promise.resolve().then(function () { return act === "stop" ? window.DriverTracking.stop(nid) : window.DriverTracking.start(nid); })
      .then(function () { if (who !== actor()) return; dNotice[nid] = { kind: "ok", text: act === "stop" ? "Location sharing stopped." : "Location sharing started." }; },
        function (e) { if (who !== actor()) return; dNotice[nid] = { kind: "err", text: (act === "stop" ? "Could not stop sharing. " : "Could not start sharing. ") + errText(e) }; })
      .then(function () { delete dBusy[nid]; refreshDriver(); });
  }
  function mountDriver() {
    stopDriver();
    refreshDriver();
    document.addEventListener("click", onDriverClick);
    dChange = function () { refreshDriver(); };
    window.addEventListener("driver-tracking-change", dChange);
    dTimer = setInterval(function () {
      if (!document.querySelector("[data-vt-driver]")) return stopDriver();
      refreshDriver();
    }, DRIVER_MS);
  }
  function stopDriver() {
    if (dTimer) clearInterval(dTimer); dTimer = null;
    document.removeEventListener("click", onDriverClick);
    if (dChange) window.removeEventListener("driver-tracking-change", dChange); dChange = null;
  }

  window.VehicleTrackingUI = { draw: draw, stop: stop, reset: reset, renderDriver: renderDriver, mountDriver: mountDriver, refreshDriver: refreshDriver };
})();
