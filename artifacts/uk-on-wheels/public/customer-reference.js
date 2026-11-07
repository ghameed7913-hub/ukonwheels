/* Keep customer references in the existing persisted client_notes contract.
 * This human-readable first line survives both secured creation RPCs, reloads
 * and legacy bookings without changing the system-generated booking reference.
 */
(() => {
  "use strict";
  const prefix = "Customer reference: ";
  const escape = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function notes(reference, instructions = "") {
    const value = String(reference || "").trim();
    if (value.length > 120 || /[\r\n]/.test(value)) throw new Error("Customer reference must be a single line of up to 120 characters.");
    return value ? prefix + value + (instructions ? "\n\n" + instructions : "") : instructions;
  }
  function value(booking) {
    const first = String(booking?.notes || booking?.client_notes || "").split(/\r?\n/, 1)[0];
    return first.startsWith(prefix) ? first.slice(prefix.length).trim() : "";
  }
  function summary(booking) {
    const reference = value(booking);
    return reference ? '<div class="muted customer-reference">Customer reference: ' + escape(reference) + '</div>' : "";
  }
  function detail(booking) {
    const reference = value(booking);
    return reference ? '<div><b>Customer reference</b><p>' + escape(reference) + '</p></div>' : "";
  }
  window.CustomerReference = {notes, value, summary, detail};
})();
