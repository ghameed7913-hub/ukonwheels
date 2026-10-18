/* UK On Wheels - Driver Payments (read-only payslip view). Pure renderer. */
(function () {
  "use strict";
  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  var fmt = (function () {
    try { var f = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }); return function (n) { return f.format(n); }; }
    catch (e) { return function (n) { return (n < 0 ? "-" : "") + "\u00a3" + Math.abs(n).toFixed(2); }; }
  })();
  function num(v) { var n = Number(v); return isFinite(n) ? n : null; }
  function money(v) { var n = num(v); return n == null ? "" : esc(fmt(n)); }
  function has(v) { return v !== undefined && v !== null && v !== ""; }
  function date(v) {
    if (!has(v)) return "";
    var d = new Date(v);
    if (isNaN(d.getTime())) return esc(v);
    return esc(d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }));
  }
  function dateTime(v) {
    if (!has(v)) return "";
    var d = new Date(v);
    if (isNaN(d.getTime())) return esc(v);
    return esc(d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }));
  }
  function monthLabel(m) {
    if (!has(m)) return "Pay period not set";
    var r = /^(\d{4})-(\d{2})$/.exec(String(m));
    if (r) { var d = new Date(+r[1], +r[2] - 1, 1); return esc(d.toLocaleDateString("en-GB", { month: "long", year: "numeric" })); }
    return esc(m);
  }
  function refreshBtn(label, busy) {
    return '<button type="button" class="btn secondary dpRefresh" data-testid="button-payments-refresh" onclick="window.DriverPayments&&DriverPayments.refresh()"' +
      (busy ? ' disabled aria-disabled="true"' : "") + ">" + esc(label) + "</button>";
  }
  var ROWS = [
    ["basic", "Basic pay", 1], ["vehiclePay", "Vehicle pay", 1], ["overtime", "Overtime", 1],
    ["fuel", "Fuel expenses", 1], ["food", "Food expenses", 1], ["travel", "Travel expenses", 1],
    ["gross", "Gross", 0], ["taxAmount", "Tax deducted", -1], ["advance", "Advance deducted", -1]
  ];
  function breakdown(it) {
    var rows = "";
    ROWS.forEach(function (r) {
      if (!has(it[r[0]]) || num(it[r[0]]) == null) return;
      var cls = r[0] === "gross" ? " dpRowGross" : r[2] < 0 ? " dpRowDeduct" : "";
      var lbl = r[1];
      if (r[0] === "taxAmount" && has(it.taxPct)) lbl += " (" + esc(it.taxPct) + "%)";
      rows += '<div class="dpRow' + cls + '"><dt>' + lbl + "</dt><dd>" + (r[2] < 0 ? "&minus; " : "") + money(it[r[0]]) + "</dd></div>";
    });
    if (has(it.taxEnabled)) rows += '<div class="dpRow"><dt>Tax applied</dt><dd>' + (it.taxEnabled === true || it.taxEnabled === "true" ? "Yes" : "No") + "</dd></div>";
    var body = rows ? '<dl class="dpBreak">' + rows + "</dl>" :
      '<p class="dpNote">No detailed calculation was stored for this payslip. The net amount below is the figure recorded by HR.</p>';
    return body + '<dl class="dpBreak dpBreakNet"><div class="dpRow"><dt>Net (as recorded by HR)</dt><dd>' + money(it.net) + "</dd></div></dl>";
  }
  function card(it, open) {
    var n = num(it.net), paid = it.status === "Paid", owed = !paid && n != null && n < 0;
    var id = esc(it.id);
    var stateCls = paid ? "dpPaid" : owed ? "dpOwed" : "dpPending";
    var badge = paid ? '<span class="badge green dpBadge">Paid</span>' : '<span class="badge amber dpBadge">Pending</span>';
    var sub = paid ? (has(it.paidOn) ? "Paid on " + date(it.paidOn) : "Paid, date not recorded")
      : owed ? "Balance owed to company" : n === 0 ? "Zero amount, pending per HR" : "Awaiting payment";
    return '<details class="dpCard ' + stateCls + '" data-payment-ref="' + id + '" data-testid="card-payment-' + id + '"' + (open ? " open" : "") + ">" +
      "<summary>" +
        '<span class="dpTop"><span class="dpMonth">' + monthLabel(it.month) + "</span>" + badge + "</span>" +
        '<span class="dpAmt' + (owed ? " dpNeg" : "") + '" data-testid="text-payment-net-' + id + '">' + (n == null ? "Amount unavailable" : money(n)) + "</span>" +
        '<span class="dpSub">' + sub + "</span>" +
        '<span class="dpRef">Ref ' + id + (has(it.name) ? " &middot; " + esc(it.name) : "") + "</span>" +
        '<span class="dpMore" aria-hidden="true">Calculation details</span>' +
      "</summary>" +
      '<div class="dpBody">' + breakdown(it) +
        '<p class="dpMeta">Created ' + (date(it.createdAt) || "date not recorded") + (paid && has(it.paidOn) ? " &middot; Paid " + date(it.paidOn) : "") + "</p>" +
        (owed ? '<p class="dpNote dpNoteOwed">This payslip shows a negative net. It is a balance owed to UK On Wheels, not a payment to you. Speak to HR with any questions.</p>' : "") +
        '<p class="dpNote">Read-only. Amounts and status are set by HR.</p>' +
      "</div></details>";
  }
  function render(state) {
    state = state || {};
    var items = Array.isArray(state.items) ? state.items : [];
    var openIds = Array.isArray(state.openIds) ? state.openIds.map(String) : [];
    var loading = !!state.loading, error = state.error ? String(state.error) : "";
    var h = '<div class="driverPayments" aria-busy="' + (loading ? "true" : "false") + '">';
    h += '<div class="driverSectionTitle"><h3 style="margin:0">My Payments</h3>' + refreshBtn(loading ? "Refreshing..." : "Refresh", loading) + "</div>";
    h += '<p class="dpStatusLine" role="status" aria-live="polite">' +
      (loading ? "Loading your payslips..." : state.lastUpdated ? "Last updated " + dateTime(state.lastUpdated) : "Not yet loaded") + "</p>";

    if (error) {
      h += '<div class="dpAlert" role="alert" data-testid="status-payments-error"><strong>' +
        (items.length ? "Could not refresh payments." : "Could not load payments.") + "</strong> " + esc(error) +
        (items.length ? " Showing the last loaded data" + (state.lastUpdated ? " from " + dateTime(state.lastUpdated) : "") + "; it may be out of date." : "") +
        '<div class="dpAlertAct">' + refreshBtn("Try again", loading) + "</div></div>";
    }

    if (!items.length) {
      if (loading) {
        h += '<div class="dpSkel" aria-hidden="true"><i></i><i></i><i></i></div>';
      } else if (!error) {
        h += state.lastUpdated
          ? '<div class="driverEmpty" data-testid="status-payments-empty">No payslips have been issued to you yet. When HR creates one it will appear here.</div>'
          : '<div class="driverEmpty">Payments have not been loaded yet.<div class="dpAlertAct">' + refreshBtn("Load payments", false) + "</div></div>";
      }
      return h + "</div>";
    }

    var pendPay = 0, pendPayN = 0, owed = 0, owedN = 0, paidSum = 0, paidN = 0;
    items.forEach(function (it) {
      var n = num(it.net); if (n == null) return;
      if (it.status === "Paid") { paidSum += n; paidN++; }
      else if (n < 0) { owed += n; owedN++; }
      else { pendPay += n; pendPayN++; }
    });
    h += '<div class="dpSummary">' +
      '<div class="dpSum dpSumPend"><b>Pending to you</b><strong data-testid="text-pending-total">' + esc(fmt(pendPay)) + "</strong><small>" + pendPayN + " payslip" + (pendPayN === 1 ? "" : "s") + "</small></div>" +
      '<div class="dpSum dpSumPaid"><b>Paid</b><strong data-testid="text-paid-total">' + esc(fmt(paidSum)) + "</strong><small>" + paidN + " payslip" + (paidN === 1 ? "" : "s") + "</small></div>" +
      (owedN ? '<div class="dpSum dpSumOwed"><b>Owed to company</b><strong data-testid="text-owed-total">' + esc(fmt(Math.abs(owed))) + "</strong><small>" + owedN + " pending, not included above</small></div>" : "") +
      "</div>";

    var sorted = items.slice().sort(function (a, b) {
      var am = String(a.month || ""), bm = String(b.month || "");
      if (am !== bm) return am < bm ? 1 : -1;
      return String(b.createdAt || "") < String(a.createdAt || "") ? -1 : 1;
    });
    var pending = sorted.filter(function (i) { return i.status !== "Paid"; });
    var paid = sorted.filter(function (i) { return i.status === "Paid"; });
    function group(title, list) {
      if (!list.length) return "";
      return '<section class="dpGroup"><h4>' + title + ' <span class="driverPill">' + list.length + "</span></h4>" +
        list.map(function (it) { return card(it, openIds.indexOf(String(it.id)) !== -1); }).join("") + "</section>";
    }
    h += group("Pending", pending) + group("Paid", paid);
    return h + "</div>";
  }
  window.DriverPaymentsUI = { render: render };
})();
