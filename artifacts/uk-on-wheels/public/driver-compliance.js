/* Drivers receive only their own expiry notices, never private HR records. */
window.DriverCompliance = (() => {
  let status = null, timer = null, generation = 0, busy = false;
  const E = value => escapeHtml(String(value ?? ""));
  function message(value) {
    const docs = (value?.expired || []).map(x => x.label).join(", ");
    return "Driver access is blocked because these documents have expired: " + docs +
      ". Please provide renewed documents to HR. Only HR can update the record and restore access.";
  }
  async function fetchStatus() {
    const result = await sb.rpc("driver_document_status");
    if (result.error) throw Error("Document checks could not be confirmed. Ask Admin to run supabase/driver-document-access.sql, or try again if the connection is unavailable.");
    if (!result.data || !Array.isArray(result.data.expired) || typeof result.data.blocked !== "boolean")
      throw Error("Document checks returned an invalid response. Please contact Admin.");
    return result.data;
  }
  function stop() {
    generation++;
    if (timer) clearInterval(timer);
    timer = null;
    status = null;
  }
  async function deny(text) {
    stop();
    // Security locks cannot be postponed by an unsaved-form confirmation.
    IncidentUI.captureForm?.();
    closeDriverCameras();
    document.getElementById("app")?.classList.add("hidden");
    document.getElementById("login")?.classList.remove("hidden");
    document.getElementById("evidenceOverlay")?.remove();
    document.body.classList.remove("driver-mode");
    if (scopedStoreTimer) { clearInterval(scopedStoreTimer); scopedStoreTimer = null; }
    const channels = [sharedStoreChannel, normalizedChannel].filter(Boolean);
    sharedStoreChannel = null; normalizedChannel = null;
    currentSession = null; currentUser = null; currentStaffUser = null;
    STORE_CACHE = null; storeReady = false;
    window.BulkBooking?.clearSession();
    showAuthView("signin", text, "error");
    const app = document.getElementById("app");
    if (app) app.innerHTML = "";
    await Promise.allSettled(channels.map(channel => sb.removeChannel(channel)));
    try { await sb.auth.signOut({scope:"local"}); } catch (_) { /* UI and API remain locked. */ }
    // Sign-out must not hide the reason for the lock.
    setAuthNotice(text, "error");
  }
  async function checkSession() {
    stop();
    const g = generation;
    let value;
    try { value = await fetchStatus(); }
    catch (error) {
      if (g === generation) await deny(error.message);
      throw error;
    }
    if (g !== generation) throw Error("Your sign-in changed. Please try again.");
    if (value.blocked) {
      const text = message(value);
      await deny(text);
      throw Error(text);
    }
    status = value;
    return value;
  }
  async function refresh() {
    if (busy || role !== "driver" || !currentSession?.user?.id) return;
    busy = true;
    const g = generation, actor = currentSession.user.id;
    try {
      const value = await fetchStatus();
      if (g !== generation || currentSession?.user?.id !== actor) return;
      if (value.blocked) return await deny(message(value));
      status = value;
      const target = document.getElementById("driverDocumentAlerts");
      if (target) target.innerHTML = notices();
    } catch (error) {
      if (g === generation && currentSession?.user?.id === actor) await deny(error.message);
    } finally { busy = false; }
  }
  function start() {
    if (timer) clearInterval(timer);
    if (role === "driver") timer = setInterval(refresh, 60000);
  }
  function notices() {
    const rows = status?.expired || [];
    if (!rows.length) return "";
    return `<div class="driverProfileCard" role="alert"><b>Expired documents — please provide replacements to HR</b>
      <ul>${rows.map(x => `<li>${E(x.label)} expired on ${E(x.date)}</li>`).join("")}</ul>
      <p>HR must update your employee registration. You cannot change these documents in the Driver portal.</p></div>`;
  }
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
  return {checkSession, start, stop, notices, refresh};
})();
