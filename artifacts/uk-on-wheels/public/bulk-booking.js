/* Bulk booking uses the existing secured booking RPC, one stable reference per vehicle. */
(() => {
  "use strict";
  const fieldIds = ["customerType","biz","privateCustomerName","privateCustomerMobile","privateCustomerEmail","pickup","dest","service","miles","bdate","ddate","receiver","mobile","dropoff","amount","notes"];
  let owner = null, mode = "single", rows = [], common = null, busy = false, generation = 0;
  const el = id => document.getElementById(id);
  const userId = () => currentSession?.user?.id || (!SUPABASE_CONFIGURED ? currentUser?.email || "local-admin" : null);
  const allowed = () => (role === "admin" || role === "staff") && hasPermission("booking");
  const key = id => "ukow-bulk-booking:" + id;
  const normalReg = value => String(value || "").replace(/[\s-]/g,"").toUpperCase();
  const newRow = () => {
    const id = crypto.randomUUID();
    return {id, vehicle:"", reg:"", miles:"", amount:"", status:"editing", message:"", reference:"UKOW-"+new Date().getFullYear()+"-"+id.replace(/-/g,"").toUpperCase()};
  };
  function assertOwner(id) {
    if (!allowed() || !id || userId() !== id || owner !== id) throw new Error("Your account changed. Sign in again before continuing this batch.");
  }
  function status(message) {
    if (el("bulkBookingStatus")) el("bulkBookingStatus").textContent = message;
  }
  function snapshot() {
    return Object.fromEntries(fieldIds.map(id => [id,el(id)?.value || ""]));
  }
  function persist() {
    if (!owner) return false;
    try {
      sessionStorage.setItem(key(owner),JSON.stringify({version:1,mode,rows,common}));
      return true;
    } catch (_) {
      status("The browser could not save this batch's recovery details. No further vehicles will be submitted until browser session storage is available.");
      return false;
    }
  }
  function load() {
    const id = userId();
    if (owner === id) return;
    owner = id; mode = "single"; rows = []; common = null;
    if (!id) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key(id)) || "null");
      if (saved?.version === 1 && Array.isArray(saved.rows) && saved.rows.length <= 100) {
        rows = saved.rows;
        for (const row of rows) if (row.status === "saving") {
          row.status = "uncertain"; row.message = "Interrupted save. Retry to check the saved booking before sending again.";
        }
        common = saved.common; mode = saved.mode === "bulk" ? "bulk" : "single";
      }
    } catch (_) { status("The saved bulk draft could not be restored. Check existing bookings before starting again."); }
  }
  function hasCommittedRows() { return rows.some(r => ["saved","uncertain","saving"].includes(r.status)); }
  function draw() {
    if (!el("bulkBookingPanel")) return;
    el("bulkBookingPanel").hidden = mode !== "bulk";
    el("singleVehicleFields").hidden = mode === "bulk";
    if (el("bulkSharedNotice")) el("bulkSharedNotice").hidden = mode !== "bulk";
    if (el("bookingMode")) { el("bookingMode").value = mode; el("bookingMode").disabled = busy; }
    el("bookingSharedFields").disabled = busy || (mode === "bulk" && hasCommittedRows());
    el("bulkBookingEditor").disabled = busy;
    el("bulkVehicleRows").innerHTML = BulkBookingUI.renderRows(rows,busy,common || snapshot(),getStore().businesses || [],SUPABASE_CONFIGURED);
    el("bulkBookingResults").innerHTML = BulkBookingUI.summary(rows,busy);
    const button = document.querySelector('button[onclick="createBooking()"]');
    if (button) {
      button.textContent = mode === "bulk" ? busy ? "Creating vehicle bookings…" : rows.length && rows.every(r=>r.status === "saved") ? "All vehicles booked" : rows.some(r=>r.status !== "editing") ? "Retry remaining vehicles" : "Create all vehicle bookings" : "Create Booking";
      button.disabled = busy || (mode === "bulk" && rows.length > 0 && rows.every(r=>r.status === "saved"));
    }
    if (el("bulkNewBatch")) el("bulkNewBatch").disabled = busy;
  }
  function mount() {
    if (!allowed() || !el("bulkBookingPanel")) return;
    load();
    el("bulkBookingPanel").innerHTML = BulkBookingUI.shell() + '<div class="actions"><button id="bulkNewBatch" type="button" class="btn secondary" onclick="BulkBooking.newBatch()">Start a new batch</button></div>';
    if (common && mode === "bulk") {
      for (const id of fieldIds) if (el(id)) el(id).value = common[id] ?? "";
      toggleCustomerTypeFields();
    }
    for (const id of fieldIds) {
      const changed = () => {
        if (mode !== "bulk" || busy || hasCommittedRows()) return;
        common = snapshot(); persist(); draw();
      };
      el(id)?.addEventListener("input",changed);
      el(id)?.addEventListener("change",changed);
    }
    draw();
  }
  function refresh() {
    if (mode === "bulk" && !busy && !hasCommittedRows()) {
      common = snapshot(); persist();
    }
    draw();
  }
  function setMode(value) {
    if (!allowed() || busy) return;
    load();
    if (value !== "bulk" && hasCommittedRows() && rows.some(r=>r.status !== "saved")) {
      status("Finish or reconcile this batch first, or use Start a new batch. Saved bookings will not be deleted.");
      draw(); return;
    }
    mode = value === "bulk" ? "bulk" : "single";
    if (mode === "bulk" && !rows.length) {
      rows = [newRow(),newRow()];
      rows[0].vehicle = el("veh")?.value || "";
      rows[0].reg = el("reg")?.value || "";
    }
    common = snapshot(); persist(); draw();
  }
  function addRow() {
    if (busy || mode !== "bulk") return;
    if (rows.length >= 100) return status("A batch can contain up to 100 vehicles. Finish this batch before starting another.");
    rows.push(newRow()); persist(); draw();
  }
  function updateRow(id,field,value) {
    if (busy || !["vehicle","reg","miles","amount"].includes(field)) return;
    const row = rows.find(r=>r.id === id);
    if (!row || ["saved","uncertain","saving"].includes(row.status)) return;
    row[field] = value; row.status = "editing"; row.message = "";
    persist();
  }
  function editableRow(id) {
    if (!allowed() || busy) return null;
    const row = rows.find(r=>r.id === id);
    return row && !["saved","uncertain","saving"].includes(row.status) ? row : null;
  }
  function setOwnDetails(id,enabled) {
    const row = editableRow(id);
    if (!row) return;
    if (enabled && !row.details) {
      row.details = {...(hasCommittedRows() ? common : snapshot())};
      // Capture current defaults once. Separate details never fall back to another customer's data.
      row.miles = row.miles || row.details.miles || "";
      row.amount = row.amount || row.details.amount || "";
    } else if (!enabled) row.details = null;
    row.status = "editing"; row.message = "";
    persist(); draw();
  }
  function updateDetail(id,field,value) {
    const row = editableRow(id);
    if (!row?.details || !fieldIds.includes(field) || ["miles","amount"].includes(field)) return;
    row.details[field] = value; row.status = "editing"; row.message = "";
    persist();
    if (field === "customerType") draw();
  }
  const hasRowInput = row => !!(row.vehicle || row.reg || row.details || row.miles || row.amount);
  function removeRow(id) {
    if (busy) return;
    const row = rows.find(r=>r.id === id);
    if (!row || ["saved","uncertain","saving"].includes(row.status)) return;
    rows = rows.filter(r=>r.id !== id); persist(); draw();
  }
  async function newBatch() {
    if (busy) return;
    if (rows.some(r=>["uncertain","saving"].includes(r.status))) return status("Retry this batch to check interrupted saves before starting a new batch.");
    if (rows.some(r=>r.status !== "saved" && hasRowInput(r)) &&
      !await crmConfirm("Discard the remaining unsaved vehicle rows? Any bookings already saved will remain.","Start a new batch","Discard unsaved rows")) return;
    if (busy) return;
    rows = [newRow(),newRow()]; common = snapshot(); mode = "bulk";
    persist(); draw(); status("New batch ready. Saved bookings from previous batches are unchanged.");
  }
  function number(value,label) {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n < 0) throw new Error(label+" must be a valid number of zero or more.");
    return n;
  }
  function prepare(shared,vehicles) {
    if (!vehicles.length) throw new Error("Add at least one vehicle to the batch.");
    const seen = new Set();
    return vehicles.map((row,index) => {
    const values = row.details || shared;
    const label = "Vehicle "+(index+1)+": ";
    const sharedCustomer = !row.details;
    const type = values.customerType || "Business";
    let business, businessId = null;
    if (type === "Business") {
      const selected = selectedBookingBusiness(values.biz);
      if (!selected || String(selected.accountType || "business").toLowerCase() !== "business" || String(selected.status || "Active").toLowerCase() !== "active" || (SUPABASE_CONFIGURED && !selected.id)) throw new Error(label+"Select an active saved business before creating the batch.");
      business = selected.name; businessId = selected.id || null;
    } else if (type === "Private") {
      if (!values.privateCustomerName?.trim()) throw new Error(label+"Enter the private customer name.");
      if (SUPABASE_CONFIGURED && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.privateCustomerEmail?.trim() || "")) throw new Error(label+"Enter the private Client's portal email.");
      business = "Private Customer";
    } else throw new Error(label+"Choose a Business or Private customer.");
    for (const [id,label] of [["pickup","collection address"],["dest","delivery address"],["receiver","receiver name"],["mobile","receiver mobile number"]]) {
      if (!values[id]?.trim()) throw new Error("Vehicle "+(index+1)+": Enter the "+(sharedCustomer?"shared ":"")+label+".");
    }
    const defaultMiles = row.details ? 0 : number(values.miles,"Shared miles");
    const defaultAmount = row.details ? 0 : number(values.amount,"Shared charge");
      const reg = normalReg(row.reg), vehicle = String(row.vehicle || "").trim();
      if (!vehicle || !reg) throw new Error("Vehicle "+(index+1)+": enter make/model and registration.");
      if (seen.has(reg)) throw new Error("Registration "+reg+" appears more than once in this batch.");
      seen.add(reg);
       const notes = [values.notes?.trim(),values.dropoff ? "Latest drop-off time: "+values.dropoff : ""].filter(Boolean).join("\n");
       const service = values.service || "Vehicle Delivery";
       if (!["Vehicle Delivery","Vehicle Collection & Delivery","Recovery / AA"].includes(service)) throw new Error(label+"Choose a valid service type.");
      return {
        ref:row.reference,customerType:type,_businessId:businessId,business,
         privateCustomerName:type === "Private" ? values.privateCustomerName?.trim() || "" : "",
         privateCustomerMobile:type === "Private" ? values.privateCustomerMobile?.trim() || "" : "",
         privateCustomerEmail:type === "Private" ? values.privateCustomerEmail?.trim() || "" : "",
         vehicle,reg,pickup:values.pickup.trim(),destination:values.dest.trim(),
         service,
         miles:row.miles == null || row.miles === "" ? defaultMiles : number(row.miles,"Vehicle "+(index+1)+" miles"),
         amount:row.amount == null || row.amount === "" ? defaultAmount : number(row.amount,"Vehicle "+(index+1)+" charge"),
         bookingDate:values.bdate || new Date().toISOString().slice(0,10),
         deliveryDate:values.ddate || "",receiver:values.receiver.trim(),receiverMobile:values.mobile.trim(),
         dropoffTill:values.dropoff || "",notes,status:"New Booked Vehicle",paymentStatus:"Pending",driver:"",
        createdBy:currentUser?.name || "Admin",createdAt:new Date().toLocaleString(),
        timeline:[{title:"Booking Created",text:"Created in a bulk vehicle booking"}]
      };
    });
  }
  async function lookup(booking,id) {
    assertOwner(id);
    if (!SUPABASE_CONFIGURED) return getStore().bookings.find(b=>b.ref === booking.ref) || null;
    const {data,error} = await sb.from("bookings").select("id,reference,vehicle_registration,created_by").eq("reference",booking.ref).maybeSingle();
    assertOwner(id);
    if (error) throw new Error("Could not verify whether this vehicle is already saved: "+error.message);
    if (data && (data.created_by !== id || normalReg(data.vehicle_registration) !== normalReg(booking.reg))) throw new Error("This reference belongs to a different booking. Contact Admin; do not submit this row again.");
    return data;
  }
  async function saveOne(booking,id) {
    assertOwner(id);
    if (SUPABASE_CONFIGURED) {
      const saved = await createLinkedBooking(booking,booking.ref);
      assertOwner(id);
      if (!saved?.id || saved.reference !== booking.ref) throw new Error("The server did not confirm this vehicle's booking reference.");
      return saved;
    }
    const s = getStore();
    if (!s.bookings.some(b=>b.ref === booking.ref)) s.bookings.unshift(booking);
    const ok = await saveStore(s);
    if (ok === false) throw new Error("The local booking could not be saved.");
    return booking;
  }
  async function submit() {
    if (busy || !allowed() || mode !== "bulk") return;
    load();
    const id = owner;
    const runGeneration = generation;
    try {
      assertOwner(id);
      if (SUPABASE_CONFIGURED && !currentSession) throw new Error("Sign in again before creating bookings.");
      if (el("biz")?.disabled && !hasCommittedRows()) throw new Error("Please wait for saved businesses to finish loading.");
      if (!hasCommittedRows()) common = snapshot();
      const bookings = prepare(common,rows);
      if (!persist()) return;
      busy = true; draw();
      const count = rows.filter(r=>r.status !== "saved").length;
      status("Saving "+count+" vehicle bookings. Keep this page open.");
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i], booking = bookings[i];
        if (row.status === "saved") continue;
        assertOwner(id);
        // Verify the stable reference before every write, including retries after lost responses.
        try {
          const existing = await lookup(booking,id);
          if (existing) {
            row.status = "saved"; row.message = "Previously saved booking recovered.";
            row.bookingId = existing.id; persist(); draw(); continue;
          }
        } catch (e) {
          assertOwner(id);
          row.status = "uncertain"; row.message = e.message; persist(); draw(); break;
        }
        row.status = "saving"; row.message = "Saving vehicle…";
        if (!persist()) { row.status = "editing"; break; }
        draw();
        try {
          const saved = await saveOne(booking,id);
          row.status = "saved"; row.bookingId = saved.id; row.message = "Booking saved.";
        } catch (e) {
          assertOwner(id);
          try {
            const recovered = await lookup(booking,id);
            row.status = recovered ? "saved" : "failed";
            row.bookingId = recovered?.id;
            row.message = recovered ? "Booking saved; confirmation recovered." : e.message;
          } catch (checkError) {
            row.status = "uncertain"; row.message = checkError.message;
          }
          persist(); draw(); break; // Stop on the first failure; do not hide partial results.
        }
        if (!persist()) { draw(); break; }
        draw();
      }
      assertOwner(id);
      let refreshError = "";
      if (SUPABASE_CONFIGURED && rows.some(r=>r.status === "saved")) {
        try {
          await loadNormalizedPortalData();
          if (typeof sharedReadError !== "undefined" && sharedReadError) refreshError = " The booking list could not refresh; reload it before assigning Drivers.";
        }
        catch (_) { refreshError = " The booking list could not refresh; reload it before assigning Drivers."; }
      }
      assertOwner(id);
      const savedCount = rows.filter(r=>r.status === "saved").length;
      status((savedCount === rows.length ? "All "+savedCount+" vehicles booked successfully. Each has its own reference and can be assigned to a Driver." : savedCount+" of "+rows.length+" vehicles saved. Review the row messages and retry remaining vehicles; saved bookings will not be created again.")+refreshError);
    } catch (e) {
      if (owner === id && userId() === id) status(e.message || "The batch could not be saved.");
    } finally {
      if (generation === runGeneration) busy = false;
      if (owner === id && userId() === id) { persist(); draw(); }
    }
  }
  function clearSession() {
    if (owner) { try { sessionStorage.removeItem(key(owner)); } catch (_) {} }
    generation++;
    owner = null; mode = "single"; rows = []; common = null; busy = false;
  }
  window.BulkBooking = {mount,setMode,addRow,updateRow,setOwnDetails,updateDetail,refresh,removeRow,newBatch,submit,clearSession,isActive:()=>mode === "bulk" && allowed(),isBusy:()=>busy,hasUnsaved:()=>mode === "bulk" && rows.some(r=>r.status!=="saved" && hasRowInput(r)),isComplete:()=>mode === "bulk" && rows.length>0 && rows.every(r=>r.status==="saved"),prepare,normalReg};
})();
