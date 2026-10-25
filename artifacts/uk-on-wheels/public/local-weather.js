/* Local weather widget. Classic script, exposes window.LocalWeather.mount(element). */
(function(){
  "use strict";
  var REFRESH_MS = 15 * 60 * 1000, WARN_PREVIEW = 3, TIMEOUT_MS = 15000;
  var S = {
    mode: "none",            // none | gps | manual
    coords: null,            // {lat, lon}
    data: null, error: "", loading: false, stale: false,
    searching: false, results: null, searchError: "", query: "",
    showSearch: false, expanded: false, geoMsg: "", geoBusy: false,
    started: false, reqId: 0, searchId: 0, geoId: 0, ctrl: null, sctrl: null, timer: null
  };
  var root = null;

  function apiUrl(params){
    var u = new URL("weather-api", document.baseURI);
    Object.keys(params).forEach(function(k){ u.searchParams.set(k, params[k]); });
    return u.toString();
  }
  function esc(v){ return String(v == null ? "" : v).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  function safeUrl(u){ try { var x = new URL(String(u)); return x.protocol === "https:" || x.protocol === "http:" ? x.href : ""; } catch(e){ return ""; } }
  function r2(n){ return Math.round(Number(n) * 100) / 100; }
  function fmt(iso, withDay){
    if(!iso) return "unknown";
    var d = new Date(iso); if(isNaN(d)) return "unknown";
    var o = { hour: "2-digit", minute: "2-digit" };
    if(withDay){ o.weekday = "short"; o.day = "numeric"; o.month = "short"; }
    return d.toLocaleString("en-GB", o);
  }
  function fetchJson(url, ctrl){
    var to = setTimeout(function(){ ctrl.abort("timeout"); }, TIMEOUT_MS);
    return fetch(url, { signal: ctrl.signal, credentials: "include", headers: { Accept: "application/json" } })
      .then(function(r){ return r.json().catch(function(){ throw new Error("The weather service is not available yet. Please try again later."); }).then(function(b){ if(!r.ok) throw new Error(b && b.error ? b.error : "Weather service returned " + r.status); if(!b || (!Array.isArray(b.places) && (!b.place || !b.warnings))) throw new Error("The weather service returned an incomplete response."); return b; }); })
      .finally(function(){ clearTimeout(to); });
  }
  function errText(e){
    if(!navigator.onLine) return "You appear to be offline. Weather will refresh when you reconnect.";
    if(e && e.name === "AbortError") return "The weather service took too long to respond.";
    return (e && e.message) || "Weather could not be loaded.";
  }

  function load(){
    if(!S.coords) return;
    if(S.ctrl) S.ctrl.abort();
    var ctrl = new AbortController(), id = ++S.reqId;
    S.ctrl = ctrl; S.loading = true; S.error = ""; paint();
    fetchJson(apiUrl({ lat: S.coords.lat, lon: S.coords.lon }), ctrl).then(function(b){
      if(id !== S.reqId) return;
      S.data = b; S.stale = false; S.loading = false; S.expanded = false; paint();
    }).catch(function(e){
      if(id !== S.reqId) return;
      S.loading = false; S.error = errText(e); S.stale = !!S.data; paint();
    });
  }

  function geolocate(userInitiated){
    var geoId = ++S.geoId;
    if(!("geolocation" in navigator)){ S.geoMsg = "Location is not available in this browser. Search for a town or city instead."; paint(); return; }
    S.geoBusy = true; S.geoMsg = ""; paint();
    navigator.geolocation.getCurrentPosition(function(p){
      if(geoId !== S.geoId || !root || !root.isConnected) return;
      S.geoBusy = false;
      if(S.mode === "manual" && !userInitiated) { paint(); return; }
      S.mode = "gps"; S.coords = { lat: r2(p.coords.latitude), lon: r2(p.coords.longitude) };
      S.showSearch = false; S.results = null; load();
    }, function(err){
      if(geoId !== S.geoId || !root || !root.isConnected) return;
      S.geoBusy = false;
      S.geoMsg = err.code === 1 ? "Location permission was denied. Allow location in your browser settings, or search for a town or city."
        : err.code === 3 ? "Finding your location timed out. Try again or search for a town or city."
        : "Your location could not be determined. Search for a town or city instead.";
      if(!S.data) S.showSearch = true;
      paint();
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 });
  }

  function search(q){
    q = String(q || "").trim(); S.query = q;
    if(q.length < 2){ S.searchError = "Enter at least 2 characters."; S.results = null; paint(); return; }
    if(S.sctrl) S.sctrl.abort();
    var ctrl = new AbortController(), id = ++S.searchId;
    S.sctrl = ctrl; S.searching = true; S.searchError = ""; S.results = null; paint();
    fetchJson(apiUrl({ q: q }), ctrl).then(function(b){
      if(id !== S.searchId) return;
      S.searching = false; S.results = (b.places || []).slice(0, 5);
      if(!S.results.length) S.searchError = "No places found for \u201C" + q + "\u201D. Check the spelling or try a nearby town.";
      paint();
    }).catch(function(e){ if(id !== S.searchId) return; S.searching = false; S.searchError = errText(e); paint(); });
  }

  function pick(i){
    var p = S.results && S.results[i]; if(!p) return;
    ++S.geoId; S.geoBusy = false;
    S.mode = "manual"; S.coords = { lat: r2(p.latitude), lon: r2(p.longitude) };
    S.results = null; S.showSearch = false; S.query = ""; S.geoMsg = "";
    load();
  }

  function tick(){
    if(!root || !root.isConnected || document.visibilityState !== "visible" || !S.coords) return;
    var last = S.data && S.data.fetchedAt ? new Date(S.data.fetchedAt).getTime() : 0;
    if(Date.now() - last >= REFRESH_MS - 5000){
      if(S.mode === "gps") geolocate(false); else load();
    }
  }

  function start(){
    if(S.started) return; S.started = true;
    var auto = function(){ if(root && root.isConnected && S.mode === "none") geolocate(false); };
    if(navigator.permissions && navigator.permissions.query){
      navigator.permissions.query({ name: "geolocation" }).then(function(st){ if(st.state === "granted") auto(); else paint(); }).catch(function(){ paint(); });
    }
    S.timer = setInterval(tick, 60 * 1000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("online", function(){ if(root && root.isConnected && S.error && S.coords) load(); });
  }

  function warningsHtml(w){
    if(!w) return "";
    var items = Array.isArray(w.items) ? w.items : [];
    var area = w.area ? " for " + esc(w.area) : "";
    var head = '<div class="lw-wh">Met Office warnings' + area + '</div>';
    if(w.status !== "ok"){
      var label = w.status === "unsupported" ? "Warnings not available for this location" : w.status === "unmatched" ? "Warning region could not be matched" : "Warnings could not be checked";
      return '<div class="lw-warn lw-warn-unknown" role="note">' + head + '<p><strong>' + label + '.</strong> This does not mean there are no warnings. ' + esc(w.message || "") + ' <a href="https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings" target="_blank" rel="noopener noreferrer">Check the Met Office</a>.</p></div>';
    }
    if(!items.length) return '<div class="lw-warn lw-warn-none">' + head + '<p>No matching regional warnings' + (w.checkedAt ? ' (checked ' + esc(fmt(w.checkedAt)) + ')' : '') + '.</p><p>' + esc(w.message || "") + ' <a href="https://www.metoffice.gov.uk/weather/warnings-and-advice/uk-warnings" target="_blank" rel="noopener noreferrer">Check warning map</a>.</p></div>';
    var shown = S.expanded ? items : items.slice(0, WARN_PREVIEW);
    var list = shown.map(function(it){
      var lvl = ["yellow","amber","red"].indexOf(it.level) >= 0 ? it.level : "yellow";
      var u = safeUrl(it.url);
      return '<li class="lw-wi lw-' + lvl + '"><span class="lw-lvl">' + lvl + '</span><div><b>' + esc(it.title) + '</b><p>' + esc(it.description) + '</p>' +
        (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener noreferrer">Full warning</a>' : '') + '</div></li>';
    }).join("");
    var more = items.length > WARN_PREVIEW ? '<button type="button" class="lw-link" data-lw="expand" aria-expanded="' + S.expanded + '">' + (S.expanded ? "Show fewer" : "Show all " + items.length + " warnings") + '</button>' : "";
    return '<div class="lw-warn">' + head + '<p class="lw-count">' + items.length + ' current or upcoming warning' + (items.length === 1 ? "" : "s") + (w.checkedAt ? ', checked ' + esc(fmt(w.checkedAt)) : '') + '</p><p>' + esc(w.message || "") + '</p><ul>' + list + '</ul>' + more + '</div>';
  }

  function html(){
    var d = S.data, wx = d && d.weather, place = d && d.place;
    var status = S.loading ? (d ? "Refreshing\u2026" : "Loading weather\u2026") : S.geoBusy ? "Finding your location\u2026" : "";
    var top = '<div class="lw-head"><div class="lw-title"><span class="lw-eyebrow">Local weather' + (S.mode === "gps" ? " \u00B7 your location" : S.mode === "manual" ? " \u00B7 chosen place" : "") + '</span>' +
      (place ? '<strong title="' + esc(place.label) + '">' + esc(place.label || place.name) + '</strong>' : '<strong>Choose a location</strong>') + '</div>' +
      '<div class="lw-actions">' +
      '<button type="button" class="lw-btn" data-lw="locate"' + (S.geoBusy ? " disabled" : "") + '>Use my location</button>' +
      '<button type="button" class="lw-btn" data-lw="toggle" aria-expanded="' + S.showSearch + '">' + (place ? "Change city" : "Search city") + '</button>' +
      (S.coords ? '<button type="button" class="lw-btn" data-lw="refresh"' + (S.loading ? " disabled" : "") + '>Refresh</button>' : '') +
      '</div></div>';
    var body = "";
    if(!d && S.loading) body = '<div class="lw-skel" aria-hidden="true"><i></i><i></i></div>';
    else if(!d && !S.coords) body = '<p class="lw-hint">Use my location shares your approximate position (rounded to about 1 km) with our weather service, MET Norway and OpenStreetMap to find your local forecast. Or search for a town or city.</p>';
    if(d){
      body += wx ? '<div class="lw-now' + (S.stale ? " lw-stale" : "") + '"><span class="lw-temp">' + Math.round(wx.temperatureC) + '\u00B0C</span><span class="lw-cond">' + esc(wx.condition) + '</span><span class="lw-wind">Wind ' + Math.round(wx.windKph) + ' km/h</span></div>' +
        '<p class="lw-meta">Forecast for ' + esc(fmt(wx.forecastAt, true)) + ' \u00B7 Last refreshed ' + esc(fmt(d.fetchedAt || wx.updatedAt, true)) + '</p>'
        : '<p class="lw-err">Current weather unavailable' + (d.weatherError ? ': ' + esc(d.weatherError) : '') + '. Last refreshed ' + esc(fmt(d.fetchedAt, true)) + '.</p>';
      if(S.stale) body += '<p class="lw-err">Showing earlier data. ' + esc(S.error) + '</p>';
      body += warningsHtml(d.warnings);
    } else if(S.error) body += '<p class="lw-err">' + esc(S.error) + '</p>';
    if(S.error && !S.loading && S.coords) body += '<button type="button" class="lw-link" data-lw="refresh">Try again</button>';
    if(S.geoMsg) body += '<p class="lw-err">' + esc(S.geoMsg) + '</p>';
    var form = "";
    if(S.showSearch){
      form = '<form class="lw-search" data-lw="search" role="search"><label class="lw-sr" for="lw-q">Town or city</label><input id="lw-q" name="q" autocomplete="off" placeholder="Town or city, e.g. Leeds" value="' + esc(S.query) + '"><button type="submit" class="lw-btn lw-primary"' + (S.searching ? " disabled" : "") + '>' + (S.searching ? "Searching\u2026" : "Search") + '</button></form>';
      if(S.searchError) form += '<p class="lw-err">' + esc(S.searchError) + '</p>';
      if(S.results && S.results.length) form += '<ul class="lw-results" aria-label="Search results">' + S.results.map(function(p, i){
        return '<li><button type="button" data-lw="pick" data-i="' + i + '"><b>' + esc(p.name) + '</b><small>' + esc(p.label) + (p.areas && p.areas.length ? ' \u00B7 ' + esc(p.areas.join(", ")) : '') + '</small></button></li>';
      }).join("") + '</ul>';
    }
    var attr = '<p class="lw-attr">Weather <a href="https://www.met.no/en" target="_blank" rel="noopener noreferrer">MET Norway</a> (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>, values rounded and wind converted) \u00B7 Places \u00A9 <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a> \u00B7 Warnings <a href="https://www.metoffice.gov.uk/" target="_blank" rel="noopener noreferrer">Met Office</a></p>';
    return top + '<div class="lw-status" aria-live="polite" role="status">' + esc(status) + '</div>' + form + '<div class="lw-body" aria-busy="' + S.loading + '">' + body + '</div>' + attr;
  }

  function paint(){
    if(!root) return;
    var active = document.activeElement, focusKey = active && root.contains(active) ? (active.id || active.getAttribute("data-lw")) : null;
    root.innerHTML = html();
    if(focusKey){ var el = root.querySelector("#" + focusKey) || root.querySelector('[data-lw="' + focusKey + '"]'); if(el && !el.disabled) el.focus(); }
  }

  function build(){
    root = document.createElement("section");
    root.className = "lw-root"; root.setAttribute("aria-label", "Local weather");
    root.addEventListener("click", function(e){
      var b = e.target.closest("[data-lw]"); if(!b || b.tagName === "FORM") return;
      var a = b.getAttribute("data-lw");
      if(a === "locate") geolocate(true);
      else if(a === "toggle"){ S.showSearch = !S.showSearch; paint(); if(S.showSearch){ var i = root.querySelector("#lw-q"); if(i) i.focus(); } }
      else if(a === "refresh"){ if(S.mode === "gps") geolocate(false); else load(); }
      else if(a === "expand"){ S.expanded = !S.expanded; paint(); }
      else if(a === "pick") pick(Number(b.getAttribute("data-i")));
    });
    root.addEventListener("submit", function(e){ e.preventDefault(); var i = root.querySelector("#lw-q"); search(i ? i.value : ""); });
    root.addEventListener("input", function(e){ if(e.target.id === "lw-q") S.query = e.target.value; });
  }

  window.LocalWeather = {
    mount: function(el){
      try {
        if(!el) return;
        if(!root) build();
        if(root.parentNode !== el) el.appendChild(root);
        paint(); start();
      } catch(e){ if(window.console) console.warn("Local weather unavailable", e); }
    }
  };
})();
