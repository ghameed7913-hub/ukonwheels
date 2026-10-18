/* UK On Wheels - Driver portrait + digital company ID (classic script) */
(function(){
"use strict";
var REFRESH_MS=45000,MAX_BYTES=10*1024*1024,TYPES=["image/jpeg","image/png","image/webp"],ID_TYPES=["image/jpeg","image/png","image/webp","application/pdf"];
var S={uid:null,gen:0,own:null,ownAt:0,loading:false,err:null,timer:null,focusBound:false,uploading:false,upErr:null,upOk:null,admin:null};

function esc(v){return typeof escapeHtml==="function"?escapeHtml(v):String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function sessUid(){try{return (typeof currentSession!=="undefined"&&currentSession&&currentSession.user&&currentSession.user.id)||null;}catch(e){return null;}}
function api(){return window.DriverIdentityAPI||null;}
function tab(){try{return typeof driverMobileTab!=="undefined"?driverMobileTab:null;}catch(e){return null;}}
function logo(){
  var l="";try{l=typeof LOGO_IMG!=="undefined"?String(LOGO_IMG||""):"";}catch(e){}
  if(!l)return '<span class="di-logo-text">UK ON WHEELS</span>';
  if(l.trim().charAt(0)==="<")return l;
  return '<img src="'+esc(l)+'" alt="UK On Wheels">';
}
function fmtDate(v){if(!v)return "";var d=new Date(v);if(isNaN(d))return String(v);return d.toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});}
function errText(e){
  var m=(e&&(e.message||e.error_description||e.details))||String(e||"Unknown error");
  if(/relation|does not exist|schema cache|function .* not|42P01|42883|PGRST20|not configured|bucket/i.test(m))
    m+=" — The Driver company ID setup is missing. Ask an administrator to run supabase/driver-company-id.sql.";
  return m;
}
function initials(n){return String(n||"?").trim().split(/\s+/).slice(0,2).map(function(p){return p.charAt(0).toUpperCase();}).join("")||"?";}
function stateInfo(card){
  if(!card)return {key:"pending",label:"Not issued",note:"Awaiting issue by HR. This is not a valid company ID."};
  var st=card.state;
  if(st==="active")return {key:"active",label:"Active",note:"Valid UK On Wheels Driver ID."};
  if(st==="revoked")return {key:"revoked",label:"Revoked",note:"This ID has been revoked and is not valid."+(card.revoked_at?" Revoked "+fmtDate(card.revoked_at)+".":"")};
  if(st==="expired")return {key:"expired",label:"Expired",note:"This ID has expired and is not valid. Ask HR to renew it."};
  if(st==="suspended")return {key:"suspended",label:"Suspended",note:"Account suspended. This ID is not valid."};
  return {key:"pending",label:"Unknown",note:"Status could not be confirmed. Do not present this ID."};
}
function photoHtml(url,name,cls){
  return url?'<img class="'+cls+'" src="'+esc(url)+'" alt="Portrait of '+esc(name||"Driver")+'" referrerpolicy="no-referrer">'
    :'<span class="'+cls+' di-ph-empty" aria-hidden="true">'+esc(initials(name))+'</span>';
}

function sniff(file){
  return new Promise(function(res){
    try{var r=new FileReader();r.onload=function(){var b=new Uint8Array(r.result||new ArrayBuffer(0));
      function at(o,arr){for(var i=0;i<arr.length;i++)if(b[o+i]!==arr[i])return false;return true;}
      if(at(0,[0xFF,0xD8,0xFF]))return res("image/jpeg");
      if(at(0,[0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]))return res("image/png");
      if(at(0,[0x52,0x49,0x46,0x46])&&at(8,[0x57,0x45,0x42,0x50]))return res("image/webp");
      if(at(0,[0x25,0x50,0x44,0x46,0x2D]))return res("application/pdf");
      res(null);};r.onerror=function(){res(null);};r.readAsArrayBuffer(file.slice(0,16));}catch(e){res(null);}
  });
}
async function checkIdFile(file){
  if(!file)return "Choose the company ID file first.";
  if(file.size>MAX_BYTES)return "That file is larger than 10 MB. Choose a smaller scan or export.";
  if(!file.size)return "That file is empty. Choose the company ID file again.";
  var kind=await sniff(file);
  if(!kind||ID_TYPES.indexOf(kind)<0)return "This file is not a JPEG, PNG, WebP or PDF. Export the company ID card in one of those formats.";
  if(file.type&&ID_TYPES.indexOf(file.type)>=0&&file.type!==kind)return "The file contents do not match its type. Re-export the company ID card and try again.";
  return null;
}
function isUploaded(card){return !!(card&&card.source==="uploaded");}
function docUsable(card){return !!(card&&card.state==="active"&&card.document&&card.document.url);}
function isPdf(doc){return !!(doc&&(doc.mime==="application/pdf"||/\.pdf$/i.test(String(doc.name||doc.path||""))));}

/* ---------- driver data ---------- */
function isDriverView(){var c=document.getElementById("content");return document.body.classList.contains("driver-mode")&&!!(c&&c.querySelector(".driverApp"));}
function sync(){var uid=sessUid();if(S.uid!==uid){var adm=S.admin;resetDriver();S.uid=uid;S.admin=adm;}return uid;}
function pendingFile(){var i=document.querySelector('#diProfile [data-di="file"]');return !!(i&&i.files&&i.files.length);}
function stopTimers(){if(S.timer)clearInterval(S.timer);S.timer=null;if(S.focusBound){window.removeEventListener("focus",onFocus);S.focusBound=false;}}
function stale(){return !S.own||Date.now()-S.ownAt>REFRESH_MS;}
function load(){
  var uid=sessUid(),a=api();
  if(!uid)return;
  if(!a||typeof a.own!=="function"){S.err="Company ID service is not available. Ask an administrator to run supabase/driver-company-id.sql.";S.own=null;redraw(true);return;}
  if(S.loading)return;
  S.loading=true;var gen=S.gen,before=ready();
  Promise.resolve().then(function(){return a.own();}).then(function(snap){
    if(gen!==S.gen||uid!==sessUid())return;
    if(snap&&snap.user_id!=null&&String(snap.user_id)!==String(uid))throw new Error("Identity response did not match the signed-in Driver.");
    S.own=snap||null;S.ownAt=Date.now();S.err=null;
  }).catch(function(e){
    if(gen!==S.gen||uid!==sessUid())return;
    S.err=errText(e);S.own=null;S.ownAt=0; /* never keep an unverified card visible */
  }).then(function(){
    if(gen!==S.gen)return;
    S.loading=false;redraw(before!==ready());
  });
}
function redraw(readyChanged){
  if(pendingFile()||S.uploading)return;
  var c=document.getElementById("content"),t=tab();
  if(!c||!document.body.classList.contains("driver-mode")||typeof drawDriver!=="function")return;
  if(t==="profile"||t==="companyId"||readyChanged){
    try{if(typeof driverPhotoIsSaving==="function"&&driverPhotoIsSaving())return;}catch(e){}
    drawDriver(c);
  }
}
function ensureTimers(){
  if(!S.timer)S.timer=setInterval(function(){
    if(!sessUid()||sessUid()!==S.uid){reset();return;}
    if(!isDriverView()){stopTimers();return;}
    if(S.err||S.uploading||pendingFile())return;
    var t=tab();if(t==="companyId"||t==="profile"||!ready())load();
  },REFRESH_MS);
  if(!S.focusBound){S.focusBound=true;window.addEventListener("focus",onFocus);}
}
function onFocus(){
  if(!S.uid||sessUid()!==S.uid){reset();return;}
  if(!isDriverView()){stopTimers();return;}
  if(S.uploading||pendingFile()||S.err)return;
  if(tab()==="companyId"||Date.now()-S.ownAt>15000)load();
}

/* ---------- driver render ---------- */
function ready(){
  var uid=sessUid();
  return !!(uid&&S.uid===uid&&S.own&&S.own.photo_path&&(S.own.user_id==null||String(S.own.user_id)===String(uid)));
}
function renderProfile(){
  sync();
  var o=S.own,has=!!(o&&o.photo_path),card=o&&o.card,si=stateInfo(card);
  var head='<section class="di-sec" id="diProfile" aria-labelledby="diPhotoTitle">';
  if(S.loading&&!o)return head+'<h3 id="diPhotoTitle">Driver portrait</h3><div class="di-skel-row" aria-busy="true" aria-label="Loading portrait"><span class="di-skel di-skel-ph"></span><span><span class="di-skel"></span><span class="di-skel short"></span></span></div></section>';
  if(S.err&&!o)return head+'<h3 id="diPhotoTitle">Driver portrait</h3><div class="hrr-msg err" role="alert">'+esc(S.err)+'</div><button class="btn secondary" type="button" data-di="retry">Retry</button></section>';
  var url=o&&o.photo_url;
  var h=head+'<div class="di-sec-head"><h3 id="diPhotoTitle">Driver portrait</h3>'+(has?'<span class="di-tag ok">Saved</span>':'<span class="di-tag warn">Required</span>')+'</div>';
  h+='<div class="di-portrait-row">'+photoHtml(has?url:null,o&&o.name,"di-ph-lg")+'<div class="di-portrait-copy">'+
    (has?'<p>Your profile photo is managed by Admin/HR. Contact them if it needs changing.</p>':'<p><b>Ask Admin/HR to upload your profile photo.</b> Jobs stay locked until Admin/HR saves it.</p>')+
    '<p class="di-small">Drivers cannot upload, replace or remove their profile photo.</p></div></div>';
  h+='<div class="di-id-teaser"><div><b>Digital ID</b><div class="di-small">'+esc(card&&card.reference?card.reference+" · ":"")+esc(si.label)+'</div></div>'+
    '<span class="di-badge di-'+si.key+'">'+esc(si.label)+'</span></div>'+
    '<button class="btn secondary di-full" type="button" onclick="setDriverMobileTab(\'companyId\')">Open Digital ID</button>'+
    '<p class="di-small">Your portrait is a profile photo only. It is not your company ID card.</p>';
  if(S.err)h+='<div class="hrr-msg err" role="alert">Could not refresh: '+esc(S.err)+' <button class="btn secondary" type="button" data-di="retry">Retry</button></div>';
  return h+'</section>';
}
function renderCard(){
  sync();
  var h='<div class="di-cardview" id="diCardView"><div class="di-idhead"><h3>Digital ID</h3><span class="di-small">Company-issued Driver ID</span></div>';
  var o=S.own;
  if(S.loading&&!o)return h+'<div class="di-card di-card-skel" aria-busy="true" aria-label="Loading Digital ID"><span class="di-skel di-skel-ph"></span><span class="di-skel"></span><span class="di-skel short"></span></div></div>';
  if(S.err||!o)return h+'<div class="di-card-msg" role="alert"><h3>Digital ID unavailable</h3><p>'+esc(S.err||"Your ID could not be verified right now.")+'</p><p class="di-small">Do not present any earlier screenshot as ID.</p><button class="btn" type="button" data-di="retry">Retry</button></div></div>';
  var card=o.card,si=stateInfo(card);
  if(!card)return h+'<div class="di-card-msg di-pending" role="status"><h3>No Digital ID uploaded yet</h3><p>Admin/HR have not uploaded your company ID card. Ask Admin or HR to upload it to the portal.</p><p class="di-small">Your profile portrait is not a company ID and must not be shown as one.</p></div></div>';
  var checked='<p class="di-small di-center">Checked '+esc(new Date(S.ownAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}))+' · refreshes automatically</p>';
  var valid=si.key==="active";
  if(isUploaded(card)){
    h+='<section class="di-upl'+(valid?"":" di-invalid")+'" aria-label="Digital ID status">'+
      '<div class="di-card-status di-'+si.key+'" role="status"><span class="di-dot" aria-hidden="true"></span><b>'+esc(si.label.toUpperCase())+'</b><span>'+esc(si.note)+'</span></div>'+
      '<dl class="di-card-dl di-upl-dl"><div><dt>Name</dt><dd>'+esc(card.name||o.name||"")+'</dd></div>'+
      '<div><dt>Card ref.</dt><dd class="di-mono">'+esc(card.reference||"")+'</dd></div>'+
      '<div><dt>Issued</dt><dd>'+esc(fmtDate(card.issued_at))+'</dd></div>'+
      '<div><dt>Valid until</dt><dd>'+esc(card.valid_until?fmtDate(card.valid_until):"No expiry set")+'</dd></div></dl></section>';
    if(!valid)return h+'<div class="di-card-msg" role="alert"><h3>Digital ID not available to show</h3><p>Your company ID card is hidden because it is '+esc(si.label.toLowerCase())+'. Contact Admin or HR.</p></div>'+checked+'</div>';
    var doc=card.document;
    if(!docUsable(card))return h+'<div class="di-card-msg" role="alert"><h3>Digital ID file unavailable</h3><p>The ID file could not be loaded securely. Retry, or ask Admin/HR to upload it again.</p><button class="btn" type="button" data-di="retry">Retry</button></div>'+checked+'</div>';
    if(isPdf(doc)){
      h+='<div class="di-doc di-doc-pdf"><iframe src="'+esc(doc.url)+'" title="UK On Wheels Digital ID PDF" loading="lazy" referrerpolicy="no-referrer"></iframe></div>'+
        '<a class="btn di-full di-openpdf" href="'+esc(doc.url)+'" target="_blank" rel="noopener noreferrer">Open Digital ID PDF</a>'+
        '<p class="di-small di-center">If the PDF does not show above (common on iPhone), use Open Digital ID PDF.</p>';
    }else{
      h+='<figure class="di-doc"><img src="'+esc(doc.url)+'" alt="UK On Wheels company ID card for '+esc(card.name||o.name||"Driver")+'" referrerpolicy="no-referrer"></figure>';
    }
    return h+checked+'</div>';
  }
  /* legacy generated card */
  h+='<p class="di-small">Earlier portal-generated card. Admin/HR may replace it with your uploaded company ID card.</p>';
  h+='<article class="di-card'+(valid?"":" di-invalid")+'" aria-label="UK On Wheels Driver company ID, status '+esc(si.label)+'">'+
    '<header class="di-card-top"><span class="di-card-logo">'+logo()+'</span><span class="di-card-kicker">DRIVER<br>IDENTITY</span></header>'+
    '<div class="di-card-stripe" aria-hidden="true"></div>'+
    '<div class="di-card-body">'+photoHtml(valid?(card.photo_url||null):null,card.name,"di-card-ph")+
    '<h2 class="di-card-name">'+esc(card.name)+'</h2><div class="di-card-role">Vehicle Delivery Driver</div>'+
    '<dl class="di-card-dl"><div><dt>Card ref.</dt><dd class="di-mono">'+esc(card.reference)+'</dd></div>'+
    '<div><dt>Issued</dt><dd>'+esc(fmtDate(card.issued_at))+'</dd></div>'+
    (card.valid_until?'<div><dt>Valid until</dt><dd>'+esc(fmtDate(card.valid_until))+'</dd></div>':'')+'</dl></div>'+
    '<footer class="di-card-status di-'+si.key+'" role="status"><span class="di-dot" aria-hidden="true"></span><b>'+esc(si.label.toUpperCase())+'</b><span>'+esc(si.note)+'</span></footer>'+
    (valid?'':'<div class="di-void" aria-hidden="true">NOT VALID</div>')+
    '</article>'+checked+'</div>';
  return h;
}

/* ---------- driver mount ---------- */
function mountDriver(){
  var uid=sessUid();
  if(!uid){reset();return;}
  sync();
  ensureTimers();
  if(stale()&&!S.loading&&!S.err)load();
  var root=document.getElementById("diProfile")||document.getElementById("diCardView");
  if(!root||root.dataset.diBound)return;
  root.dataset.diBound="1";
  root.addEventListener("click",function(ev){var b=ev.target.closest('[data-di="retry"]');if(b){S.err=null;load();redraw(true);}});
}
function resetDriver(){
  stopTimers();
  S.gen++;S.timer=null;S.uid=null;S.own=null;S.ownAt=0;S.loading=false;S.err=null;S.uploading=false;S.upErr=null;S.upOk=null;
}
function reset(){resetDriver();if(S.admin)S.admin.gen=-1;S.admin=null;}

/* ---------- admin ---------- */
async function drawAdmin(container){
  if(!container)return;
  var gen=++S.gen;S.admin={container:container,gen:gen,data:null,q:"",open:null};
  container.innerHTML='<div class="hrr-wrap di-admin"><div class="panel"><div class="hrr-head"><div><h2 style="margin:0">Driver photos &amp; company IDs</h2><div class="muted">Profile portraits and company Digital ID cards are separate. Upload the Driver&rsquo;s existing company ID card (image or PDF) as their Digital ID. Passport and licence evidence stays private in HR Employee Registration.</div></div></div><div data-body aria-busy="true"><div class="hrr-skel"></div><div class="hrr-skel"></div><div class="hrr-skel"></div></div></div></div>';
  var a=api();
  if(!a||typeof a.list!=="function"){adminBody('<div class="hrr-msg err" role="alert">Company ID service is not available. Run supabase/driver-company-id.sql.</div>');return;}
  try{
    var res=await a.list();
    if(!S.admin||S.admin.gen!==gen||!adminLive(S.admin))return;
    S.admin.data={canIssue:!!(res&&res.canIssue),drivers:(res&&res.drivers)||[]};
    adminRender();
  }catch(e){
    if(!S.admin||S.admin.gen!==gen||!adminLive(S.admin))return;
    adminBody('<div class="hrr-msg err" role="alert">'+esc(errText(e))+'</div><p><button class="btn secondary" type="button" data-di-a="reload">Retry</button></p>');
    bindAdmin();
  }
}
function adminDirty(){var A=S.admin;if(!A||!A.container)return false;var f=A.container.querySelector(".di-aform");if(!f)return false;return Array.prototype.some.call(f.querySelectorAll("input,textarea"),function(i){return i.type==="file"?!!(i.files&&i.files.length):i.value!==i.defaultValue;});}
function adminLive(A){return !!(A&&S.admin===A&&A.container.isConnected&&(typeof page==="undefined"||page==="driverCompanyIDs"));}
function adminBody(html){if(!adminLive(S.admin))return;var b=S.admin.container.querySelector("[data-body]");if(b){b.removeAttribute("aria-busy");b.innerHTML=html;}}
function adminRender(){
  var A=S.admin,d=A.data,q=A.q.toLowerCase();
  var rows=d.drivers.filter(function(r){return !q||[r.name,r.email,r.card&&r.card.reference].join(" ").toLowerCase().indexOf(q)>=0;});
  var counts={active:0,none:0,other:0};d.drivers.forEach(function(r){if(!r.card)counts.none++;else if(r.card.state==="active")counts.active++;else counts.other++;});
  var h='<div class="di-admin-stats"><span><b>'+counts.active+'</b> active</span><span><b>'+counts.none+'</b> not issued</span><span><b>'+counts.other+'</b> revoked / expired / suspended</span>'+
    (d.canIssue?'':'<span class="di-tag">View only</span>')+'</div>'+
    '<div class="hrr-toolbar"><input type="search" data-di-a="search" aria-label="Search Drivers" placeholder="Search name, email or card reference" value="'+esc(A.q)+'"><button class="btn secondary" type="button" data-di-a="reload">Refresh</button></div>';
  if(!d.drivers.length)h+='<div class="hrr-empty">No Driver accounts yet. Use Create User, then assign the Driver role. HR employee registration alone does not create a Driver login.</div>';
  else if(!rows.length)h+='<div class="hrr-empty">No Drivers match that search.</div>';
  else h+='<ul class="di-admin-list">'+rows.map(adminRow).join("")+'</ul>';
  adminBody(h);bindAdmin();
}
function adminRow(r){
  var A=S.admin,c=r.card,si=stateInfo(c),id=esc(r.user_id),open=A.open&&String(A.open.id)===String(r.user_id)?A.open:null;
  var h='<li class="di-arow" data-uid="'+id+'"><div class="di-arow-main">'+photoHtml(r.photo_url||null,r.name,"di-ph-sm")+
    '<div class="di-arow-who"><b>'+esc(r.name||"Unnamed Driver")+'</b><span class="di-small">'+esc(r.email||"")+(r.account_status&&r.account_status!=="active"?' · account '+esc(r.account_status):'')+'</span>'+
    '<span class="di-small">'+(r.photo_path?"Portrait on file":"<b>No portrait uploaded</b>")+'</span></div>'+
    '<div class="di-arow-card"><span class="di-mono">'+esc(c?c.reference:"—")+'</span><span class="di-badge di-'+si.key+'">'+esc(si.label)+'</span>'+
    (c?'<span class="di-small">Expiry: '+esc(c.valid_until?fmtDate(c.valid_until):"No expiry set")+'</span>':'')+
    '<span class="di-small">'+(isUploaded(c)?"Uploaded company ID":c?"Generated card (legacy)":"No Digital ID uploaded")+'</span>'+
    (isUploaded(c)&&c.document&&c.document.url?'<a class="di-small di-doclink" href="'+esc(c.document.url)+'" target="_blank" rel="noopener noreferrer">Review file'+(c.document.name?': '+esc(c.document.name):'')+'</a>':'')+'</div>';
  if(A.data.canIssue){
    var upl=isUploaded(c);
    h+='<div class="di-arow-act"><button class="btn secondary" type="button" data-di-a="open-photo">'+(r.photo_path?"Replace portrait":"Upload portrait")+'</button>'+
      '<button class="btn" type="button" data-di-a="open-digital"'+(r.photo_path?'':' disabled title="Upload a portrait first"')+'>'+(upl?"Replace Digital ID":"Upload Digital ID")+'</button>'+
      (c?'<button class="btn secondary" type="button" data-di-a="open-expiry">'+(c.valid_until?"Edit ID expiry":"Set ID expiry")+'</button>':'')+
      '<button class="btn secondary di-legacy" type="button" data-di-a="open-issue"'+(r.photo_path?'':' disabled title="Upload a portrait first"')+'>'+(c&&!upl?(c.state==="active"?"Reissue generated card":"Renew generated card"):"Generate portal card (legacy)")+'</button>'+
      (c&&c.state==="active"?'<button class="btn secondary di-danger" type="button" data-di-a="open-revoke">Revoke</button>':'')+'</div>';
  }
  h+='</div>';
  if(open&&A.data.canIssue){
    var fid="di-f-"+id;
    if(open.kind==="photo")h+='<form class="di-aform" data-di-a="photo"><label class="hrr-f" for="'+fid+'"><span>Driver profile portrait</span><input id="'+fid+'" type="file" name="portrait" accept="image/jpeg,image/png,image/webp" required><small>JPEG, PNG or WebP, up to 10 MB. Profile photo only; this is not the company ID card.</small></label>';
    else if(open.kind==="digital")h+='<form class="di-aform" data-di-a="digital"><label class="hrr-f" for="'+fid+'"><span>Company ID card file</span><input id="'+fid+'" type="file" name="idfile" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf" required><small>The existing company ID card: JPEG, PNG, WebP or PDF, up to 10 MB. The whole card is shown to the Driver, uncropped. Uploading also issues it as their active Digital ID. Do not upload passports or licences here.</small></label>'+
      '<label class="hrr-f" for="'+fid+'-u"><span>Digital ID expiry date (optional)</span><input id="'+fid+'-u" type="date" name="until" value="'+esc(c&&c.valid_until||"")+'"><small>Leave blank for no expiry.</small></label>';
    else if(open.kind==="expiry")h+='<form class="di-aform" data-di-a="expiry"><label class="hrr-f" for="'+fid+'"><span>Digital ID expiry date</span><input id="'+fid+'" type="date" name="until" value="'+esc(c.valid_until||"")+'"><small>Leave blank for no expiry. A past date makes the ID expired immediately. This updates portal validity only, not any date printed on the uploaded card. A revoked ID remains revoked.</small></label>';
    else if(open.kind==="issue")h+='<form class="di-aform" data-di-a="issue"><p class="di-small">Legacy option: creates a portal-generated card from the Driver&rsquo;s portrait. It does not upload or use a company ID file. Prefer Upload Digital ID.</p><label class="hrr-f" for="'+fid+'"><span>Digital ID expiry date (optional)</span><input id="'+fid+'" type="date" name="until"><small>Leave blank for no expiry.</small></label>';
    else h+='<form class="di-aform" data-di-a="revoke"><label class="hrr-f" for="'+fid+'"><span>Reason for revoking (required)</span><textarea id="'+fid+'" name="reason" required minlength="3" maxlength="500"></textarea></label>';
    h+='<div class="di-aform-msg" role="status" aria-live="polite"></div><div class="hrr-toolbar"><button class="btn'+(open.kind==="revoke"?" di-danger-solid":"")+'" type="submit">'+(open.kind==="photo"?"Upload portrait":open.kind==="digital"?"Upload and issue Digital ID":open.kind==="expiry"?"Save expiry date":open.kind==="issue"?"Generate portal card":"Confirm revoke")+'</button><button class="btn secondary" type="button" data-di-a="cancel">Cancel</button></div></form>';
  }
  return h+'</li>';
}
function bindAdmin(){
  var A=S.admin;if(!A)return;var c=A.container;
  if(c.dataset.diBound===String(A.gen))return;c.dataset.diBound=String(A.gen);
  c.addEventListener("click",function(ev){
    if(!adminLive(A)||S.admin.gen!==A.gen||A.busy)return;
    var b=ev.target.closest("[data-di-a]");if(!b||b.tagName==="FORM"||b.tagName==="INPUT")return;
    var act=b.getAttribute("data-di-a"),li=b.closest(".di-arow");
    if(act==="reload"){if(adminDirty()){var cm="You have an unsaved form open. Refresh and discard it?";Promise.resolve(typeof crmConfirm==="function"?crmConfirm(cm,"Discard changes?","Discard"):window.confirm(cm)).then(function(ok){if(ok&&adminLive(A)&&!A.busy)drawAdmin(c);});return;}drawAdmin(c);return;}
    if(act==="cancel"){S.admin.open=null;adminRender();return;}
    if(act==="open-issue"||act==="open-revoke"||act==="open-photo"||act==="open-digital"||act==="open-expiry"){if(adminDirty()&&!window.confirm("Discard the unsaved form that is already open?"))return;S.admin.open={id:li.getAttribute("data-uid"),kind:act==="open-photo"?"photo":act==="open-digital"?"digital":act==="open-expiry"?"expiry":act==="open-issue"?"issue":"revoke"};adminRender();var f=c.querySelector(".di-aform input,.di-aform textarea");if(f)f.focus();}
  });
  c.addEventListener("input",function(ev){
    if(!adminLive(A)||S.admin.gen!==A.gen||A.busy)return;
    if(ev.target.matches('[data-di-a="search"]')){if(adminDirty()){ev.target.value=S.admin.q;if(typeof crmToast==="function")crmToast("Finish or cancel the open form before searching.","Driver Digital ID");return;}S.admin.q=ev.target.value;var pos=ev.target.selectionStart;adminRender();var s=c.querySelector('[data-di-a="search"]');if(s){s.focus();try{s.setSelectionRange(pos,pos);}catch(e){}}}
  });
  c.addEventListener("submit",function(ev){
    if(!adminLive(A)||S.admin.gen!==A.gen)return;
    var f=ev.target.closest(".di-aform");if(!f)return;ev.preventDefault();adminSubmit(f);
  });
}
async function adminSubmit(f){
  var A=S.admin,gen=A.gen,kind=f.getAttribute("data-di-a"),uid=f.closest(".di-arow").getAttribute("data-uid"),a=api();
  if(!adminLive(A)||A.busy||!A.data.canIssue)return;
  var msg=f.querySelector(".di-aform-msg"),btn=f.querySelector('button[type="submit"]');
  function say(cls,t){msg.innerHTML="";var d=document.createElement("div");d.className="hrr-msg "+cls;if(cls==="err")d.setAttribute("role","alert");d.textContent=t;msg.appendChild(d);}
  var row=A.data.drivers.find(function(r){return String(r.user_id)===uid;});
  try{
    if(kind==="photo"){
      var file=f.elements.portrait.files[0];
      if(!file){say("err","Choose a Driver profile photo first.");return;}
      if(row&&row.card&&row.card.state==="active"){
        var warning="Replace the profile photo for "+(row.name||"this Driver")+"? The current company ID will be invalid until HR reissues it.";
        if(!(typeof crmConfirm==="function"?await crmConfirm(warning,"Replace Driver photo","Replace photo"):window.confirm(warning)))return;
      }
      if(A.busy)return;
      A.busy=true;btn.disabled=true;f.elements.portrait.disabled=true;say("info","Uploading profile photo...");
      var snap=await a.uploadHRPhoto(uid,file);
    }else if(kind==="digital"){
      var idf=f.elements.idfile.files[0],du=f.elements.until.value||null;
      var bad=await checkIdFile(idf);
      if(!adminLive(A)||S.admin.gen!==gen)return;
      if(bad){f.elements.idfile.setAttribute("aria-invalid","true");say("err",bad);return;}
      f.elements.idfile.removeAttribute("aria-invalid");
      if(du&&new Date(du+"T23:59:59")<new Date()){say("err","Valid-until date must be in the future.");return;}
      if(!row||!row.photo_path){say("err","Upload the Driver portrait first. A Digital ID needs a portrait on file.");return;}
      if(typeof a.uploadDigitalID!=="function"){say("err","Digital ID upload is not available yet. Ask an administrator to update the portal setup.");return;}
      if(row.card&&row.card.state==="active"){var rm="Replace the active Digital ID "+(row.card.reference||"")+" for "+(row.name||"this Driver")+"? The Driver will see the new file immediately.";if(!(typeof crmConfirm==="function"?await crmConfirm(rm,"Replace Digital ID","Replace"):window.confirm(rm)))return;}
      if(A.busy)return;
      A.busy=true;btn.disabled=true;f.elements.idfile.disabled=true;say("info","Uploading and issuing Digital ID...");
      snap=await a.uploadDigitalID(uid,idf,du);
    }else if(kind==="expiry"){
      var expiry=f.elements.until.value||null;
      if(!row||!row.card){say("err","Upload or issue a Digital ID first.");return;}
      if(typeof a.setExpiry!=="function"){say("err","Expiry editing needs the latest portal update and Supabase setup.");return;}
      var today=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/London",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
      var warning=!expiry&&row.card.valid_until?"Remove the expiry date? This ID will no longer expire by date.":expiry&&expiry<today?"This date is in the past. The Digital ID will be expired immediately and hidden from use. Save it?":null;
      if(warning&&!(typeof crmConfirm==="function"?await crmConfirm(warning,"Digital ID expiry","Save expiry"):window.confirm(warning)))return;
      if(!adminLive(A)||S.admin.gen!==gen||A.busy)return;
      A.busy=true;btn.disabled=true;say("info","Saving expiry date...");
      snap=await a.setExpiry(uid,expiry);
    }else if(kind==="issue"){
      var until=f.until.value||null;
      if(until&&new Date(until+"T23:59:59")<new Date()){say("err","Valid-until date must be in the future.");return;}
      if(row&&row.card&&row.card.state==="active"){var m="Reissue the ID for "+(row.name||"this Driver")+"? The current card "+row.card.reference+" will be replaced.";if(!(typeof crmConfirm==="function"?await crmConfirm(m,"Reissue company ID","Reissue"):window.confirm(m)))return;}
      if(A.busy)return;
      A.busy=true;btn.disabled=true;say("info","Issuing...");
      snap=await a.issue(uid,until);
    }else{
      var reason=f.reason.value.trim();
      if(reason.length<3){f.reason.setAttribute("aria-invalid","true");say("err","Enter a reason for revoking this ID.");f.reason.focus();return;}
      A.busy=true;btn.disabled=true;say("info","Revoking...");
      snap=await a.revoke(uid,reason);
    }
    if(!adminLive(A)||S.admin.gen!==gen)return;
    if(!snap||String(snap.user_id)!==uid)throw Error("The Driver update could not be confirmed. Refresh before continuing.");
    A.busy=false;A.data.drivers=A.data.drivers.map(function(r){return String(r.user_id)===uid?snap:r;});
    A.open=null;adminRender();
    if(typeof crmToast==="function")crmToast(kind==="photo"?"Portrait saved.":kind==="digital"?"Digital ID uploaded and issued.":kind==="expiry"?"Digital ID expiry saved.":kind==="issue"?"Portal card generated.":"Digital ID revoked.","Driver company ID");
  }catch(e){
    if(!adminLive(A)||S.admin.gen!==gen)return;
    A.busy=false;btn.disabled=false;if(f.elements.portrait)f.elements.portrait.disabled=false;if(f.elements.idfile)f.elements.idfile.disabled=false;
    btn.textContent=kind==="digital"?"Retry upload":btn.textContent;
    say("err",errText(e)+(kind==="photo"||kind==="digital"?" Your file is still selected; retry when ready.":""));
  }
}

window.DriverIdentityUI={ready:ready,renderProfile:renderProfile,renderCard:renderCard,mountDriver:mountDriver,drawAdmin:drawAdmin,reset:reset};
})();
