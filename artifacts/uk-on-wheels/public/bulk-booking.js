/* Bulk booking uses the existing secured booking RPC, one stable reference per vehicle. */
(() => {
  "use strict";
  const fieldIds = ["customerType","biz","privateCustomerName","privateCustomerMobile","privateCustomerEmail","pickup","dest","service","miles","bdate","ddate","receiver","mobile","dropoff","amount","notes"];
  let owner = null, mode = "single", rows = [], common = null, busy = false, generation = 0, sourceName = "";
  const el = id => document.getElementById(id);
  const userId = () => currentSession?.user?.id || (!SUPABASE_CONFIGURED ? currentUser?.email || "local-admin" : null);
  const allowed = () => (role === "client" && currentUser?.accountType === "business") || ((role === "admin" || role === "staff") && hasPermission("booking"));
  const key = id => "ukow-bulk-booking:" + id;
  const normalReg = value => String(value || "").replace(/[\s-]/g,"").toUpperCase();
  function customerKey(booking) {
    const text = value => String(value || "").trim().toLowerCase();
    if (booking.customerType === "Private") {
      const email = text(booking.privateCustomerEmail);
      return email ? "private:"+email : booking._clientId ? "client:"+booking._clientId : "";
    }
    return booking._businessId ? "business:"+booking._businessId : text(booking.business) ? "legacy-business:"+text(booking.business) : "";
  }
  function registrationKey(booking) {
    const customer = customerKey(booking), reg = normalReg(booking.reg);
    return customer && reg ? JSON.stringify([customer,reg]) : "";
  }
  function duplicateMessage(booking,existing = getStore().bookings || []) {
    const key = registrationKey(booking);
    const found = key && existing.find(b=>b.ref !== booking.ref && registrationKey(b) === key);
    return found ? "Registration "+normalReg(booking.reg)+" was already booked for this customer/branch ("+found.ref+"). Use a different registration or select a different saved customer/branch." : "";
  }
  const watchedFields = new WeakSet();
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
      sessionStorage.setItem(key(owner),JSON.stringify({version:1,mode,rows,common,sourceName}));
      return true;
    } catch (_) {
      status("The browser could not save this batch's recovery details. No further vehicles will be submitted until browser session storage is available.");
      return false;
    }
  }
  function load() {
    const id = userId();
    if (owner === id) return;
    owner = id; mode = "single"; rows = []; common = null; sourceName = "";
    if (!id) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(key(id)) || "null");
      if (saved?.version === 1 && Array.isArray(saved.rows) && saved.rows.length <= 100) {
        rows = saved.rows;
        for (const row of rows) if (row.status === "saving") {
          row.status = "uncertain"; row.message = "Interrupted save. Retry to check the saved booking before sending again.";
        }
        common = saved.common; sourceName = typeof saved.sourceName === "string" ? saved.sourceName : "";
        mode = ["bulk","multiple"].includes(saved.mode) ? saved.mode : "single";
      }
    } catch (_) { status("The saved bulk draft could not be restored. Check existing bookings before starting again."); }
  }
  function hasCommittedRows() { return rows.some(r => ["saved","uncertain","saving"].includes(r.status)); }
  function singleOnly() {
    // Do not restore or delete an old bulk draft for a now-private account.
    // Existing saved bookings are unchanged, and single-form input values are kept.
    mode="single";rows=[];common=null;sourceName="";
    if (el("bulkBookingPanel")) {el("bulkBookingPanel").hidden=true;el("bulkBookingPanel").innerHTML="";}
    if (el("singleVehicleFields")) el("singleVehicleFields").hidden=false;
    if (el("bookingSharedFields")) {el("bookingSharedFields").hidden=false;el("bookingSharedFields").disabled=false;}
    if (el("bulkSharedNotice")) el("bulkSharedNotice").hidden=true;
    if (el("bookingMode")) {el("bookingMode").value="single";el("bookingMode").disabled=true;}
    if (el("bookingVehicleCountControls")) el("bookingVehicleCountControls").hidden=true;
    if (el("tariffInfo")) el("tariffInfo").hidden=false;
    const button=document.querySelector('button[onclick="createBooking()"]');
    if (button) {button.textContent="Create Booking";button.disabled=busy;}
  }
  function draw() {
    if (!allowed()) return singleOnly();
    if (!el("bulkBookingPanel")) return;
    el("bulkBookingPanel").hidden = mode === "single";
    el("singleVehicleFields").hidden = mode !== "single";
    // An Excel row carries a complete booking, not a large duplicated shared form.
    el("bookingSharedFields").hidden = mode === "bulk";
    if (el("tariffInfo")) el("tariffInfo").hidden = mode === "bulk";
    if (el("bulkSharedNotice")) el("bulkSharedNotice").hidden = mode !== "bulk";
    if (el("bookingMode")) { el("bookingMode").value = mode; el("bookingMode").disabled = busy; }
    el("bookingSharedFields").disabled = busy || (mode !== "single" && hasCommittedRows());
    if (el("bookingVehicleCountControls")) el("bookingVehicleCountControls").hidden = mode === "bulk";
    if (el("bookingVehicleCount")) {
      el("bookingVehicleCount").value = mode === "multiple" ? rows.length || 1 : 1;
      el("bookingVehicleCount").disabled = busy || hasCommittedRows();
    }
    if (el("applyVehicleCount")) el("applyVehicleCount").disabled = busy || hasCommittedRows();
    el("bulkBookingEditor").disabled = busy;
    el("bulkVehicleRows").innerHTML = BulkBookingUI.renderRows(rows,busy,common || snapshot(),getStore().businesses || [],SUPABASE_CONFIGURED,{client:role === "client",sourceName});
    el("bulkBookingResults").innerHTML = BulkBookingUI.summary(rows,busy);
    const button = document.querySelector('button[onclick="createBooking()"]');
    if (button) {
      button.textContent = mode !== "single" ? busy ? "Creating vehicle bookings…" : rows.length && rows.every(r=>r.status === "saved") ? "All vehicles booked" : rows.some(r=>r.status !== "editing") ? "Retry remaining vehicles" : "Create all vehicle bookings" : "Create Booking";
      button.disabled = busy || (mode !== "single" && (!rows.length || rows.every(r=>r.status === "saved")));
    }
    if (el("bulkNewBatch")) el("bulkNewBatch").disabled = busy;
    if (el("bulkExcelFile")) el("bulkExcelFile").disabled = busy || hasCommittedRows();
    if (el("bulkWorkbookInfo")) el("bulkWorkbookInfo").textContent = sourceName
      ? sourceName+" — "+rows.length+" vehicle"+(rows.length===1?"":"s")+" loaded. "+(hasCommittedRows()?"Finish/retry this batch, or start a new batch before uploading another file.":"Review every row before saving.")
      : rows.length ? "Restored vehicle draft. Review the rows before saving." : "No file uploaded yet. Download and fill in the template first.";
  }
  function mount() {
    if (!allowed()) return singleOnly();
    if (!el("bulkBookingPanel")) return;
    load();
    el("bulkBookingPanel").innerHTML = BulkBookingUI.shell({client:role === "client",accountType:currentUser?.accountType,manual:mode === "multiple"}) + '<div class="actions"><button id="bulkNewBatch" type="button" class="btn secondary" onclick="BulkBooking.newBatch()">Start a new batch</button></div>';
    if (common && mode !== "single") {
      for (const id of fieldIds) if (el(id)) el(id).value = common[id] ?? "";
      toggleCustomerTypeFields();
    }
    for (const id of fieldIds) {
      const field=el(id);
      if (!field || watchedFields.has(field)) continue;
      watchedFields.add(field);
      const changed = () => {
        if (mode === "single" || busy || hasCommittedRows()) return;
        common = snapshot(); persist(); draw();
      };
      field.addEventListener("input",changed);
      field.addEventListener("change",changed);
    }
    draw();
  }
  function refresh() {
    if (!allowed()) return singleOnly();
    if (mode !== "single" && !busy && !hasCommittedRows()) {
      common = snapshot(); persist();
    }
    draw();
  }
  function setMode(value) {
    if (!allowed()) return singleOnly();
    if (busy) return;
    load();
    if (value !== mode && hasCommittedRows() && rows.some(r=>r.status !== "saved")) {
      status("Finish or reconcile this batch first, or use Start a new batch. Saved bookings will not be deleted.");
      draw(); return;
    }
    if (value === "multiple") return setVehicleCount(rows.length || 2);
    mode = value === "bulk" ? "bulk" : "single";
    common = snapshot(); persist(); mount();
  }
  function needsVehicleCount() {
    return allowed() && mode !== "bulk" && Number(el("bookingVehicleCount")?.value ?? 1) !== (mode === "multiple" ? rows.length : 1);
  }
  async function setVehicleCount(value = el("bookingVehicleCount")?.value) {
    if (!allowed() || busy) return false;
    load();
    const count=Number(value), id=owner;
    if (!Number.isInteger(count) || count<1 || count>100) {
      status("Enter a whole number of vehicles from 1 to 100.");
      if (typeof alert === "function") alert("Enter a whole number of vehicles from 1 to 100.");
      return false;
    }
    if (hasCommittedRows()) {status("Finish this batch, then start a new batch to change the vehicle count.");draw();return false;}
    if (rows.length>count && rows.slice(count).some(hasRowInput) &&
      !await crmConfirm("Reducing the vehicle count will discard details for the last "+(rows.length-count)+" unsaved vehicles.","Change vehicle count","Discard those vehicle details")) {draw();return false;}
    if (busy || owner!==id || userId()!==id) return false;
    const previous={rows,mode,common,sourceName};
    rows=rows.slice(0,count);
    while(rows.length<count)rows.push(newRow());
    if (previous.mode==="single" && !hasRowInput(rows[0])) {
      rows[0].vehicle=el("veh")?.value.trim()||"";
      rows[0].reg=el("reg")?.value.trim()||"";
    }
    mode="multiple"; common=snapshot();sourceName="";
    if (!persist()) {({rows,mode,common,sourceName}=previous);return false;}
    mount();status("Enter and review all "+count+" vehicles, then create their bookings. Nothing has been saved yet.");
    return true;
  }
  function addRow() {
    if (!allowed() || busy || mode !== "bulk") return;
    if (rows.length >= 100) return status("A batch can contain up to 100 vehicles. Finish this batch before starting another.");
    rows.push(newRow()); persist(); draw();
  }
  function updateRow(id,field,value) {
    if (!allowed() || busy || !["vehicle","reg","miles","amount"].includes(field)) return;
    const row = rows.find(r=>r.id === id);
    if (!row || ["saved","uncertain","saving"].includes(row.status) || (role === "client" && field === "amount")) return;
    if (row.importErrors) delete row.importErrors[field];
    if (row.importWarnings) delete row.importWarnings[field];
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
    if (role === "client" && ["customerType","biz","privateCustomerName","privateCustomerMobile","privateCustomerEmail"].includes(field)) return;
    if (row.importErrors) delete row.importErrors[field];
    if (row.importWarnings) delete row.importWarnings[field];
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
    if (!allowed() || busy) return;
    if (rows.some(r=>["uncertain","saving"].includes(r.status))) return status("Retry this batch to check interrupted saves before starting a new batch.");
    if (rows.some(r=>r.status !== "saved" && hasRowInput(r)) &&
      !await crmConfirm("Discard the remaining unsaved vehicle rows? Any bookings already saved will remain.","Start a new batch","Discard unsaved rows")) return;
    if (busy) return;
    rows = []; sourceName = ""; common = snapshot();
    if (mode === "multiple") rows.push(newRow()); else mode = "bulk";
    persist(); mount(); status("New batch ready. Saved bookings from previous batches are unchanged.");
  }
  function number(value,label) {
    const n = Number(value || 0);
    if (!Number.isFinite(n) || n < 0) throw new Error(label+" must be a valid number of zero or more.");
    return n;
  }
  function ownClientDetails(values) {
    const business = currentUser?.accountType === "business";
    if (business && !currentUser?.businessId) throw new Error("Your Client account has no linked business. Ask Admin to link it before booking.");
    return {...values,customerType:business?"Business":"Private",biz:business?currentUser.businessId:"",
      privateCustomerName:business?"":currentUser?.userName || currentUser?.name || "",
      privateCustomerMobile:business?"":currentUser?.phone || values.privateCustomerMobile || "",
      privateCustomerEmail:business?"":currentSession?.user?.email || currentUser?.email || ""};
  }
  function resolveBusiness(value) {
    const text = String(value || "").trim().toLowerCase();
    const businesses = getStore().businesses || [];
    const exact = businesses.find(b=>b.id && b.id.toLowerCase() === text);
    if (exact) return exact.id;
    const matches = businesses.filter(b=>String(b.name || "").trim().toLowerCase() === text);
    return matches.length === 1 ? matches[0].id || matches[0].name : value;
  }
  function validateRows(shared) {
    let valid = true;
    const rowKey = row => {
      const values = role === "client" ? ownClientDetails(row.details || shared) : row.details || shared;
      return registrationKey({
        customerType:values.customerType || "Business",
        _businessId:values.biz,business:values.biz,
        privateCustomerEmail:values.privateCustomerEmail,reg:row.reg
      });
    };
    const registrations = new Map();
    for (const row of rows) {
      try {
        const key = rowKey(row);
        if (key) registrations.set(key,(registrations.get(key) || 0)+1);
      } catch (_) { /* The row-specific validation below explains incomplete details. */ }
    }
    rows.forEach((row,index)=>{
      if (row.status === "saved") return;
      const errors = Object.values(row.importErrors || {});
      try {
        const key = rowKey(row);
        if (key && registrations.get(key)>1) errors.push("Registration "+normalReg(row.reg)+" appears more than once for this customer/branch in this batch.");
      } catch (_) { /* Account errors are reported by prepare. */ }
      try {
        const booking = prepare(shared,[row])[0];
        const duplicate = duplicateMessage(booking);
        if (duplicate) errors.push(duplicate);
      }
      catch (error) { errors.push(error.message.replace(/^Vehicle 1:\s*/,"")); }
      if (errors.length) {
        valid = false;
        row.message = (row.excelRow ? "Excel row "+row.excelRow : "Vehicle "+(index+1))+": "+errors.join(" ");
      } else if (!["uncertain","saving"].includes(row.status)) row.message = "";
    });
    return valid;
  }
  async function downloadTemplate(format) {
    try {
      if (!allowed()) throw new Error("Sign in to a booking account first.");
      if (!window.BookingExcel) throw new Error("Excel tools are still loading. Refresh the page and try again.");
      format=format || "Business";
      if (format!=="Business") throw new Error("Excel bulk booking is for businesses. Use the single-vehicle form for a Private Client.");
      await window.BookingExcel.downloadTemplate({
        format,client:role === "client",accountType:currentUser?.accountType,name:currentUser?.name || "",
        businesses:role === "client" ? [] : (getStore().businesses || []).filter(b=>b.id && String(b.status || "Active").toLowerCase()==="active" && String(b.accountType || "business").toLowerCase()==="business")
      });
      status("Business Excel template downloaded. Fill the Bookings sheet, then upload it here.");
    } catch (error) { status(error.message || "The template could not be downloaded."); }
  }
  async function uploadFile(file,input) {
    if (!file || busy || !allowed() || mode !== "bulk") return;
    load();
    const id = owner, runGeneration = generation;
    try {
      assertOwner(id);
      if (hasCommittedRows()) throw new Error("Finish or reconcile this batch, then start a new batch before uploading another file.");
      if (rows.some(hasRowInput) && !await crmConfirm("Replace the unsaved preview with this Excel file? No saved booking will be deleted.","Replace bulk preview","Replace unsaved rows")) return;
      assertOwner(id);
      if (busy || hasCommittedRows() || mode !== "bulk") return;
      if (!window.BookingExcel) throw new Error("Excel tools are still loading. Refresh the page and try again.");
      busy = true; draw(); status("Reading Excel file…");
      const records = await window.BookingExcel.readFile(file);
      assertOwner(id);
      const imported = records.map(record=>{
        const row = newRow(), values = {...record.values};
        row.excelRow = record.excelRow; row.importErrors = {...record.errors}; row.importWarnings = {...record.warnings};
        if (role === "client") {
          const own = ownClientDetails(values);
          for (const field of ["customerType","biz","privateCustomerName","privateCustomerEmail"]) {
            const supplied = String(values[field] || "").trim().toLowerCase();
            const expected = String(own[field] || "").trim().toLowerCase();
            const ownName = String(currentUser?.name || "").trim().toLowerCase();
            if (supplied && supplied !== expected && !(field === "biz" && supplied === ownName)) row.importErrors[field] = "Client bookings must use your own signed-in account. Leave the customer columns blank or correct the Excel file.";
          }
          if (Number(values.amount || 0) !== 0) row.importErrors.amount = "Clients cannot set charges. Leave Customer charge blank in the Excel file; Operations sets it.";
          Object.assign(values,own);
        } else values.biz = resolveBusiness(values.biz);
        Object.assign(row,{vehicle:values.vehicle || "",reg:values.reg || "",miles:values.miles || "",amount:values.amount || "",details:values});
        return row;
      });
      // Persist the replacement before dropping the previous editable draft.
      const previous = {rows,common,sourceName};
      rows = imported; common = snapshot(); sourceName = file.name;
      validateRows(common);
      if (!persist()) { rows=previous.rows;common=previous.common;sourceName=previous.sourceName;return; }
      status(rows.some(r=>r.message)?"File loaded with errors. Fix the highlighted rows or correct and upload the file again. No bookings have been created.":rows.length+" vehicles ready to review. Uploading has not created any bookings; save when everything is correct.");
    } catch (error) {
      if (owner === id && userId() === id) status(error.message || "The Excel file could not be imported. Your previous preview was kept.");
    } finally {
      if (input) input.value = "";
      if (generation === runGeneration) busy = false;
      if (owner === id && userId() === id) draw();
    }
  }
  function prepare(shared,vehicles) {
    if (!vehicles.length) throw new Error("Add at least one vehicle to the batch.");
    const seen = new Set();
    return vehicles.map((row,index) => {
    if (role === "client" && Number(row.amount || 0) !== 0) throw new Error("Vehicle "+(index+1)+": Clients cannot set customer charges. Leave that column blank.");
    const values = role === "client" ? ownClientDetails(row.details || shared) : row.details || shared;
    const label = "Vehicle "+(index+1)+": ";
    const sharedCustomer = !row.details;
    const type = values.customerType || "Business";
    let business, businessId = null;
    if (type === "Business") {
      const selected = role === "client" ? {id:currentUser.businessId,name:currentUser.name,status:"Active"} : selectedBookingBusiness(values.biz);
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
      const key = registrationKey({customerType:type,_businessId:businessId,business,privateCustomerEmail:values.privateCustomerEmail,reg});
      if (key && seen.has(key)) throw new Error("Registration "+reg+" appears more than once for this customer/branch in this batch.");
      if (key) seen.add(key);
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
         amount:role === "client" ? 0 : row.amount == null || row.amount === "" ? defaultAmount : number(row.amount,"Vehicle "+(index+1)+" charge"),
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
    const query = sb.from("bookings").select("id,reference,booking_request_reference,vehicle_registration,created_by");
    // Only interpolate generated, strictly validated UUID draft keys into OR.
    const byReference = /^UKOW-[0-9]{4}-[A-F0-9]{32}$/.test(booking.ref)
      ? query.or("reference.eq."+booking.ref+",booking_request_reference.eq."+booking.ref)
      : query.eq("reference",booking.ref);
    const {data,error} = await byReference.maybeSingle();
    assertOwner(id);
    if (error) throw new Error("Could not verify whether this vehicle is already saved: "+error.message);
    if (data && (data.created_by !== id || normalReg(data.vehicle_registration) !== normalReg(booking.reg))) throw new Error("This reference belongs to a different booking. Contact Admin; do not submit this row again.");
    return data;
  }
  async function saveOne(booking,id) {
    assertOwner(id);
    if (SUPABASE_CONFIGURED) {
      let saved;
      if (role === "client") {
        const result = await sb.rpc("client_create_bulk_booking",{p_reference:booking.ref,p_booking:booking});
        if (result.error) {
          if (["PGRST202","42883"].includes(result.error.code)) throw new Error("Client Excel booking needs the Supabase setup: ask Admin to run supabase/client-bulk-booking-patch.sql. Your uploaded preview has been kept.");
          throw new Error(result.error.message);
        }
        saved = result.data;
      } else saved = await createLinkedBooking(booking,booking.ref);
      assertOwner(id);
      if (!saved?.id || (saved.reference !== booking.ref && saved.booking_request_reference !== booking.ref)) throw new Error("The server did not confirm this vehicle's booking reference.");
      return saved;
    }
    const s = getStore();
    if (!s.bookings.some(b=>b.ref === booking.ref)) s.bookings.unshift(booking);
    const ok = await saveStore(s);
    if (ok === false) throw new Error("The local booking could not be saved.");
    return booking;
  }
  async function submit() {
    if (busy || !allowed() || mode === "single") return;
    load();
    const id = owner;
    const runGeneration = generation;
    try {
      assertOwner(id);
      if (SUPABASE_CONFIGURED && !currentSession) throw new Error("Sign in again before creating bookings.");
      if (role !== "client" && el("biz")?.disabled && !hasCommittedRows()) throw new Error("Please wait for saved businesses to finish loading.");
      if (!hasCommittedRows()) common = snapshot();
      if (!validateRows(common)) {
        persist(); draw(); status("Fix the highlighted vehicle rows before saving. No additional bookings have been created."); return;
      }
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
            row.reference = existing.reference || existing.ref;
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
          row.reference = saved.reference || saved.ref;
          row.status = "saved"; row.bookingId = saved.id; row.message = "Booking saved.";
        } catch (e) {
          assertOwner(id);
          try {
            const recovered = await lookup(booking,id);
            row.status = recovered ? "saved" : "failed";
            if (recovered) row.reference = recovered.reference || recovered.ref;
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
      status((savedCount === rows.length ? "All "+savedCount+" vehicles booked successfully. Each has its own reference and is available in New Booked Vehicles"+(role === "client"?" and your Bookings list.":", ready for Driver assignment.") : savedCount+" of "+rows.length+" vehicles saved. Review the row messages and retry remaining vehicles; saved bookings will not be created again.")+refreshError);
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
    owner = null; mode = "single"; rows = []; common = null; busy = false; sourceName = "";
  }
  window.BulkBooking = {mount,setMode,setVehicleCount,needsVehicleCount,addRow,updateRow,setOwnDetails,updateDetail,refresh,downloadTemplate,uploadFile,removeRow,newBatch,submit,clearSession,isActive:()=>mode !== "single" && allowed(),isBusy:()=>busy,hasUnsaved:()=>mode !== "single" && rows.some(r=>r.status!=="saved" && hasRowInput(r)),isComplete:()=>mode !== "single" && rows.length>0 && rows.every(r=>r.status==="saved"),prepare,normalReg,customerKey,registrationKey,duplicateMessage};
})();
