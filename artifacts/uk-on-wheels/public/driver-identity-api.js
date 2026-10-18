/* Existing Supabase storage; portrait bytes never enter the shared JSON store. */
window.DriverIdentityAPI = (() => {
  const versions = new Map(), pending = new WeakMap();
  let owner = null;
  function actor() {
    if (!SUPABASE_CONFIGURED || !currentSession?.user?.id) throw Error("Sign in to use company IDs.");
    const id = currentSession.user.id;
    if (owner !== id) { versions.clear(); owner = id; }
    return id;
  }
  function same(id) {
    if (currentSession?.user?.id !== id) throw Error("Your sign-in changed. Reload before continuing.");
  }
  function check(result) {
    if (!result.error) return result.data;
    const e = result.error;
    if (e.code==="PGRST202" && /register_hr_driver_portrait/i.test(e.message||""))
      throw Error("HR photo upload needs setup. Ask Admin to run supabase/hr-driver-photo-upload.sql.");
    if (["42P01","42883","PGRST202","PGRST205"].includes(e.code) || /bucket not found/i.test(e.message || ""))
      throw Error("Driver company IDs need setup. Ask Admin to run supabase/driver-company-id.sql.");
    throw Error(e.message || "The change could not be confirmed. Please retry.");
  }
  async function decorate(value, id) {
    same(id);
    if (!value?.user_id) throw Error("Invalid Driver identity response.");
    async function url(path) {
      if (!path) return null;
      const data = check(await sb.storage.from("driver-portraits").createSignedUrl(path,120));
      same(id);
      return data.signedUrl;
    }
    value = {...value, card:value.card ? {...value.card} : null};
    value.photo_url = await url(value.photo_path);
    if (value.card) value.card.photo_url = value.card.photo_path === value.photo_path ?
      value.photo_url : await url(value.card.photo_path);
    same(id);
    versions.set(value.user_id,value.version);
    return value;
  }
  async function rpc(name, args) {
    const id = actor(), result = check(await sb.rpc(name,args));
    return decorate(result,id);
  }
  async function normalize(file) {
    if (!file || !["image/jpeg","image/png","image/webp"].includes(file.type) || !file.size || file.size>10485760)
      throw Error("Choose a JPEG, PNG or WebP portrait up to 10 MB.");
    const bytes = new Uint8Array(await file.slice(0,12).arrayBuffer());
    const text = String.fromCharCode(...bytes);
    const valid = file.type==="image/jpeg" ? bytes[0]===255&&bytes[1]===216&&bytes[2]===255 :
      file.type==="image/png" ? bytes[0]===137&&text.slice(1,4)==="PNG" :
      text.startsWith("RIFF")&&text.slice(8,12)==="WEBP";
    if (!valid) throw Error("The file contents do not match its image type.");
    const objectURL = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = objectURL;
      await image.decode();
      if (!image.naturalWidth || !image.naturalHeight) throw Error("This image could not be read.");
      const size = Math.min(image.naturalWidth,image.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = Math.min(size,800);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(image,(image.naturalWidth-size)/2,(image.naturalHeight-size)/2,size,size,0,0,canvas.width,canvas.height);
      const blob = await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",0.88));
      if (!blob || !blob.size || blob.size>2097152) throw Error("The portrait could not be resized. Try a smaller image.");
      return blob;
    } finally { URL.revokeObjectURL(objectURL); }
  }
  function version(userId) {
    if (!versions.has(userId)) throw Error("Refresh the Driver list before changing a company ID.");
    return versions.get(userId);
  }
  async function uploadPortrait(file,target,hr) {
    const id=actor(), expected=hr?version(target):null;
    let upload=pending.get(file);
    if(!upload||upload.actor!==id||upload.target!==target) {
      upload={actor:id,target,path:target+"/"+crypto.randomUUID()+".jpg",blob:await normalize(file),uploaded:false};
      same(id);pending.set(file,upload);
    }
    if(!upload.uploaded) {
      check(await sb.storage.from("driver-portraits").upload(upload.path,upload.blob,{contentType:"image/jpeg",upsert:false}));
      upload.uploaded=true;
    }
    same(id);
    return hr?rpc("register_hr_driver_portrait",{p_user_id:target,p_path:upload.path,p_expected_version:expected})
      :rpc("register_driver_portrait",{p_path:upload.path});
  }
  return {
    own() { return rpc("own_driver_identity"); },
    async list() {
      const id = actor(), data = check(await sb.rpc("list_driver_identities"));
      same(id);
      if (!data || !Array.isArray(data.drivers)) throw Error("Invalid Driver list response.");
      const drivers = [];
      for (const row of data.drivers) drivers.push(await decorate(row,id));
      return {...data,drivers};
    },
    async uploadPhoto(file) {
      return uploadPortrait(file,actor(),false);
    },
    uploadHRPhoto(userId,file) { return uploadPortrait(file,userId,true); },
    issue(userId,validUntil) {
      const id = actor(); same(id);
      return rpc("issue_driver_company_id",{p_user_id:userId,p_valid_until:validUntil||null,p_expected_version:version(userId)});
    },
    revoke(userId,reason) {
      const id = actor(); same(id);
      return rpc("revoke_driver_company_id",{p_user_id:userId,p_reason:reason,p_expected_version:version(userId)});
    },
    reset() { owner=null; versions.clear(); }
  };
})();
