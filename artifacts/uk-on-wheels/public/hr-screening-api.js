/* Private HR records live outside the shared portal store. No credentials are saved. */
window.HRScreeningAPI = (() => {
  const bucket = "hr-screening";
  const pendingUploads = new WeakMap();
  let draftId = null;
  function session() {
    if (!SUPABASE_CONFIGURED || !currentSession?.user?.id) throw Error("Sign in to use HR screening.");
    return currentSession.user.id;
  }
  function check(result) {
    if (!result.error) return result.data;
    const e = result.error;
    if (["42P01", "42883", "PGRST202", "PGRST205"].includes(e.code) || /bucket not found/i.test(e.message || ""))
      throw Error("HR screening needs setup. Ask Admin to run supabase/hr-screening-patch.sql. Your unsaved form has been kept.");
    throw Error(e.message || "HR changes could not be confirmed. Your unsaved form has been kept.");
  }
  function same(actor) {
    if (currentSession?.user?.id !== actor) throw Error("Your sign-in changed. Reload HR before continuing.");
  }
  async function rows(table, employeeId) {
    const actor = session(), result = [];
    for (let offset = 0; ; offset += 500) {
      let q = sb.from(table).select("*");
      if (employeeId) q = q.eq("employee_id", employeeId);
      const batch = check(await q.order("created_at", {ascending:false}).order("id").range(offset, offset+499)) || [];
      same(actor); result.push(...batch);
      if (batch.length < 500) return result;
    }
  }
  async function validateFile(file) {
    const types = {"image/png":"png","image/jpeg":"jpg","image/webp":"webp","application/pdf":"pdf"};
    const ext = types[file?.type];
    if (!ext || !file.size || file.size > 10485760) throw Error("Choose a PNG, JPG, WebP or PDF file up to 10 MB.");
    const b = new Uint8Array(await file.slice(0,12).arrayBuffer());
    const text = String.fromCharCode(...b);
    const valid = ext==="pdf" ? text.startsWith("%PDF-") : ext==="png" ?
      b[0]===137 && text.slice(1,4)==="PNG" : ext==="jpg" ? b[0]===255 && b[1]===216 && b[2]===255 :
      text.startsWith("RIFF") && text.slice(8,12)==="WEBP";
    if (!valid) throw Error("The file contents do not match its image/PDF type.");
    return ext;
  }
  return {
    async capabilities() {
      const actor=session();
      const [read,write]=await Promise.all([sb.rpc("hr_screening_access",{p_write:false}),sb.rpc("hr_screening_access",{p_write:true})]);
      same(actor); return {canRead:!!check(read),canWrite:!!check(write)};
    },
    list() { return rows("hr_employee_records"); },
    async get(id) {
      const actor=session();
      const [r,documents]=await Promise.all([sb.from("hr_employee_records").select("*").eq("id",id).single(),rows("hr_employee_documents",id)]);
      same(actor); return {record:check(r),documents};
    },
    async save(input) {
      const actor=session();
      if (!input.id) {
        if (!draftId || draftId.actor!==actor) draftId={actor,id:crypto.randomUUID()};
        input={...input,id:draftId.id};
      }
      const record=check(await sb.rpc("save_hr_employee",{p_input:input}));
      same(actor);
      if (draftId?.id===record.id) draftId=null;
      return record;
    },
    async upload(employeeId,file,category,version) {
      const actor=session(), ext=await validateFile(file);
      same(actor);
      let pending=pendingUploads.get(file);
      if (!pending || pending.employeeId!==employeeId || pending.actor!==actor) {
        pending={actor,employeeId,path:employeeId+"/"+crypto.randomUUID()+"."+ext};
        pendingUploads.set(file,pending);
      }
      if (!pending.uploaded) {
        check(await sb.storage.from(bucket).upload(pending.path,file,{contentType:file.type,upsert:false}));
        pending.uploaded=true;
      }
      same(actor);
      const doc=check(await sb.rpc("register_hr_employee_document",{p_employee_id:employeeId,p_path:pending.path,p_name:file.name,p_category:category,p_version:version}));
      same(actor); return doc;
    },
    async documentUrl(path) {
      const actor=session();
      const data=check(await sb.storage.from(bucket).createSignedUrl(path,120,{download:true}));
      same(actor); return data.signedUrl;
    }
  };
})();
