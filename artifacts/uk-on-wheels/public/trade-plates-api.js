/* Trade plates are private server records, never part of the shared app_store. */
window.TradePlatesAPI = (() => {
  function actor() {
    if (!SUPABASE_CONFIGURED || !currentSession?.user?.id) throw Error("Sign in to use trade plates.");
    return currentSession.user.id;
  }
  async function rpc(name, args = {}) {
    const id = actor();
    const result = await sb.rpc(name,args);
    if (currentSession?.user?.id !== id) throw Error("Your sign-in changed. Reopen Trade plates.");
    if (result.error) {
      if (["42P01","42883","PGRST202","PGRST205"].includes(result.error.code))
        throw Error("Trade plates need setup. Ask Admin to run supabase/driver-trade-plates.sql. No assignment was confirmed.");
      throw Error(result.error.message || "The trade plate change could not be confirmed. Refresh before retrying.");
    }
    return result.data;
  }
  const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || "");
  function assignment(value) {
    if (!value || !uuid(value.driver_id) || typeof value.plate_number !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.expires_on || "") ||
      !Number.isSafeInteger(value.version) || value.version < 1)
      throw Error("The server returned an invalid trade plate assignment. Refresh before continuing.");
    return value;
  }
  function version(value, allowEmpty = false) {
    if (!Number.isSafeInteger(value) || value < (allowEmpty ? 0 : 1)) throw Error("Refresh the trade plate list before making changes.");
    return value;
  }
  return {
    async list() {
      const value = await rpc("list_driver_trade_plates");
      if (!value?.canManage || !Array.isArray(value.drivers) || !Array.isArray(value.assignments))
        throw Error("HR trade plate access could not be confirmed.");
      value.assignments.forEach(assignment);
      return value;
    },
    async mine() {
      const id = actor(), value = await rpc("my_driver_trade_plate");
      if (!value || !Object.hasOwn(value,"assignment")) throw Error("The Driver trade plate response was incomplete.");
      if (value.assignment && assignment(value.assignment).driver_id !== id) throw Error("This trade plate is not assigned to your account.");
      return value;
    },
    async save({driverId,plateNumber,expiresOn,expectedVersion}) {
      if (!uuid(driverId)) throw Error("Choose a saved Driver.");
      return assignment(await rpc("save_driver_trade_plate",{
        p_driver_id:driverId,p_plate_number:plateNumber,p_expires_on:expiresOn,
        p_expected_version:version(expectedVersion,true)
      }));
    },
    async remove({driverId,expectedVersion}) {
      if (!uuid(driverId)) throw Error("Choose a saved Driver.");
      const value = await rpc("remove_driver_trade_plate",{p_driver_id:driverId,p_expected_version:version(expectedVersion)});
      if (value?.removed !== true) throw Error("Removal was not confirmed. Refresh the assignment list before retrying.");
    }
  };
})();
