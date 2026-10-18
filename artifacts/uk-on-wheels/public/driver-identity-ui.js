/* UK On Wheels - Driver portrait + digital company ID (classic script) */
(function(){
"use strict";
var REFRESH_MS=45000,MAX_BYTES=10*1024*1024,TYPES=["image/jpeg","image/png","image/webp"];
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
    (has?'<p>Your portrait is on file and used on your company ID.</p>':'<p><b>Upload a clear, recent head-and-shoulders photo.</b> Jobs stay locked until your portrait is saved.</p>')+
    '<p class="di-small">JPEG, PNG or WebP, up to 10 MB. Plain background, face uncovered, no filters.</p></div></div>';
  if(has&&card&&card.state==="active")h+='<div class="hrr-msg info" role="note">Replacing your portrait will need HR to reissue your company ID. Your current ID may stop being valid until then.</div>';
  h+='<form class="di-upload" data-di="form" novalidate><label class="di-file"><span>'+(has?"Replace portrait":"Choose portrait")+'</span>'+
    '<input type="file" accept="image/jpeg,image/png,image/webp" data-di="file" aria-describedby="diUpMsg"></label>'+
    '<button class="btn" type="submit" data-di="upload"'+(S.uploading?' disabled aria-busy="true"':'')+'>'+(S.uploading?"Uploading...":"Upload portrait")+'</button>'+
    '<div id="diUpMsg" role="status" aria-live="polite">'+(S.upErr?'<div class="hrr-msg err" role="alert">'+esc(S.upErr)+'</div>':S.upOk?'<div class="hrr-msg ok">'+esc(S.upOk)+'</div>':'')+'</div></form>';
  h+='<div class="di-id-teaser"><div><b>Company ID</b><div class="di-small">'+esc(card&&card.reference?card.reference+" · ":"")+esc(si.label)+'</div></div>'+
    '<span class="di-badge di-'+si.key+'">'+esc(si.label)+'</span></div>'+
    '<button class="btn secondary di-full" type="button" onclick="setDriverMobileTab(\'companyId\')">Show company ID</button>';
  if(S.err)h+='<div class="hrr-msg err" role="alert">Could not refresh: '+esc(S.err)+' <button class="btn secondary" type="button" data-di="retry">Retry</button></div>';
  return h+'</section>';
}
function renderCard(){
  sync();
  var back='<button class="btn secondary di-back" type="button" onclick="setDriverMobileTab(\'profile\')">Back to profile</button>';
  var h='<div class="di-cardview" id="diCardView">'+back;
  var o=S.own;
  if(S.loading&&!o)return h+'<div class="di-card di-card-skel" aria-busy="true" aria-label="Loading company ID"><span class="di-skel di-skel-ph"></span><span class="di-skel"></span><span class="di-skel short"></span></div></div>';
  if(S.err||!o)return h+'<div class="di-card-msg" role="alert"><h3>Company ID unavailable</h3><p>'+esc(S.err||"Your ID could not be verified right now.")+'</p><p class="di-small">Do not present any earlier screenshot as ID.</p><button class="btn" type="button" data-di="retry">Retry</button></div></div>';
  var card=o.card,si=stateInfo(card);
  if(!card)return h+'<div class="di-card-msg di-pending" role="status"><h3>No company ID issued</h3><p>'+(o.photo_path?"Your portrait is saved. HR will issue your digital company ID.":"Upload your portrait first, then HR can issue your ID.")+'</p><p class="di-small">This screen is not a form of identification.</p></div></div>';
  var valid=si.key==="active";
  h+='<article class="di-card'+(valid?"":" di-invalid")+'" aria-label="UK On Wheels Driver company ID, status '+esc(si.label)+'">'+
    '<header class="di-card-top"><span class="di-card-logo">'+logo()+'</span><span class="di-card-kicker">DRIVER<br>IDENTITY</span></header>'+
    '<div class="di-card-stripe" aria-hidden="true"></div>'+
    '<div class="di-card-body">'+photoHtml(card.photo_url||null,card.name,"di-card-ph")+
    '<h2 class="di-card-name">'+esc(card.name)+'</h2><div class="di-card-role">Vehicle Delivery Driver</div>'+
    '<dl class="di-card-dl"><div><dt>Card ref.</dt><dd class="di-mono">'+esc(card.reference)+'</dd></div>'+
    '<div><dt>Issued</dt><dd>'+esc(fmtDate(card.issued_at))+'</dd></div>'+
    (card.valid_until?'<div><dt>Valid until</dt><dd>'+esc(fmtDate(card.valid_until))+'</dd></div>':'')+'</dl></div>'+
    '<footer class="di-card-status di-'+si.key+'" role="status"><span class="di-dot" aria-hidden="true"></span><b>'+esc(si.label.toUpperCase())+'</b><span>'+esc(si.note)+'</span></footer>'+
    (valid?'':'<div class="di-void" aria-hidden="true">NOT VALID</div>')+
    '</article><p class="di-small di-center">Checked '+esc(new Date(S.ownAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}))+' · refreshes automatically</p></div>';
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
  var form=root.querySelector('[data-di="form"]');
  if(form)form.addEventListener("submit",function(ev){ev.preventDefault();upload(form);});
}
function setUpMsg(form,cls,msg){var m=form.querySelector("#diUpMsg");if(m){m.innerHTML="";if(msg){var d=document.createElement("div");d.className="hrr-msg "+cls;if(cls==="err")d.setAttribute("role","alert");d.textContent=msg;m.appendChild(d);}}}
async function upload(form){
  if(S.uploading)return;
  var input=form.querySelector('[data-di="file"]'),f=input&&input.files&&input.files[0],a=api(),uid=S.uid,gen=S.gen;
  S.upOk=null;
  if(!f){setUpMsg(form,"err","Choose a photo first.");return;}
  if(TYPES.indexOf(f.type)<0){setUpMsg(form,"err","Use a JPEG, PNG or WebP photo.");return;}
  if(f.size>MAX_BYTES){setUpMsg(form,"err","That photo is larger than 10 MB. Choose a smaller one.");return;}
  if(!a||typeof a.uploadPhoto!=="function"){setUpMsg(form,"err","Upload service unavailable. Ask an administrator to run supabase/driver-company-id.sql.");return;}
  var card=S.own&&S.own.card;
  if(card&&card.state==="active"){
    var msg="Your company ID "+(card.reference||"")+" is active. Replacing your portrait means HR must reissue your ID before it can be shown again. Continue?";
    var ok=typeof crmConfirm==="function"?await crmConfirm(msg,"Replace portrait?","Replace portrait",true):window.confirm(msg);
    if(!ok)return;
  }
  S.uploading=true;var btn=form.querySelector('[data-di="upload"]');if(btn){btn.disabled=true;btn.textContent="Uploading...";btn.setAttribute("aria-busy","true");}
  setUpMsg(form,"info","Uploading your portrait...");
  var before=ready();
  try{
    var snap=await a.uploadPhoto(f);
    if(gen!==S.gen||uid!==sessUid())return;
    if(!snap||(snap.user_id!=null&&String(snap.user_id)!==String(uid)))throw new Error("Upload response did not match the signed-in Driver.");
    S.own=snap;S.ownAt=Date.now();S.err=null;S.upErr=null;S.upOk=before?"Portrait saved.":"Portrait saved. Jobs are now unlocked.";S.uploading=false;
    input.value="";
    if(isDriverView()&&typeof drawDriver==="function")drawDriver(document.getElementById("content")); /* single redraw; Driver stays on profile */
  }catch(e){
    if(gen!==S.gen||uid!==sessUid())return;
    S.uploading=false;S.upErr=null;
    if(btn){btn.disabled=false;btn.textContent="Retry upload";btn.removeAttribute("aria-busy");}
    setUpMsg(form,"err","Upload failed: "+errText(e)+" Your selected photo is kept; press Retry upload.");
  }
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
  container.innerHTML='<div class="hrr-wrap di-admin"><div class="panel"><div class="hrr-head"><div><h2 style="margin:0">Driver company IDs</h2><div class="muted">Issue, renew and revoke digital Driver identity cards.</div></div></div><div data-body aria-busy="true"><div class="hrr-skel"></div><div class="hrr-skel"></div><div class="hrr-skel"></div></div></div></div>';
  var a=api();
  if(!a||typeof a.list!=="function"){adminBody('<div class="hrr-msg err" role="alert">Company ID service is not available. Run supabase/driver-company-id.sql.</div>');return;}
  try{
    var res=await a.list();
    if(!S.admin||S.admin.gen!==gen||!container.isConnected)return;
    S.admin.data={canIssue:!!(res&&res.canIssue),drivers:(res&&res.drivers)||[]};
    adminRender();
  }catch(e){
    if(!S.admin||S.admin.gen!==gen||!container.isConnected)return;
    adminBody('<div class="hrr-msg err" role="alert">'+esc(errText(e))+'</div><p><button class="btn secondary" type="button" data-di-a="reload">Retry</button></p>');
    bindAdmin();
  }
}
function adminBody(html){var b=S.admin&&S.admin.container.querySelector("[data-body]");if(b){b.removeAttribute("aria-busy");b.innerHTML=html;}}
function adminRender(){
  var A=S.admin,d=A.data,q=A.q.toLowerCase();
  var rows=d.drivers.filter(function(r){return !q||[r.name,r.email,r.card&&r.card.reference].join(" ").toLowerCase().indexOf(q)>=0;});
  var counts={active:0,none:0,other:0};d.drivers.forEach(function(r){if(!r.card)counts.none++;else if(r.card.state==="active")counts.active++;else counts.other++;});
  var h='<div class="di-admin-stats"><span><b>'+counts.active+'</b> active</span><span><b>'+counts.none+'</b> not issued</span><span><b>'+counts.other+'</b> revoked / expired / suspended</span>'+
    (d.canIssue?'':'<span class="di-tag">View only</span>')+'</div>'+
    '<div class="hrr-toolbar"><input type="search" data-di-a="search" aria-label="Search Drivers" placeholder="Search name, email or card reference" value="'+esc(A.q)+'"><button class="btn secondary" type="button" data-di-a="reload">Refresh</button></div>';
  if(!d.drivers.length)h+='<div class="hrr-empty">No Driver accounts yet. Drivers appear here once they have a portal login.</div>';
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
    (c&&c.valid_until?'<span class="di-small">until '+esc(fmtDate(c.valid_until))+'</span>':'')+'</div>';
  if(A.data.canIssue){
    h+='<div class="di-arow-act"><button class="btn" type="button" data-di-a="open-issue"'+(r.photo_path?'':' disabled title="Driver must upload a portrait first"')+'>'+(c?(c.state==="active"?"Reissue":"Renew / reissue"):"Issue ID")+'</button>'+
      (c&&c.state==="active"?'<button class="btn secondary di-danger" type="button" data-di-a="open-revoke">Revoke</button>':'')+'</div>';
  }
  h+='</div>';
  if(open&&A.data.canIssue){
    var fid="di-f-"+id;
    if(open.kind==="issue")h+='<form class="di-aform" data-di-a="issue"><label class="hrr-f" for="'+fid+'"><span>Valid until (optional)</span><input id="'+fid+'" type="date" name="until"><small>Leave blank for no expiry. A new card reference replaces any previous card.</small></label>';
    else h+='<form class="di-aform" data-di-a="revoke"><label class="hrr-f" for="'+fid+'"><span>Reason for revoking (required)</span><textarea id="'+fid+'" name="reason" required minlength="3" maxlength="500"></textarea></label>';
    h+='<div class="di-aform-msg" role="status" aria-live="polite"></div><div class="hrr-toolbar"><button class="btn'+(open.kind==="revoke"?" di-danger-solid":"")+'" type="submit">'+(open.kind==="issue"?"Confirm issue":"Confirm revoke")+'</button><button class="btn secondary" type="button" data-di-a="cancel">Cancel</button></div></form>';
  }
  return h+'</li>';
}
function bindAdmin(){
  var A=S.admin;if(!A)return;var c=A.container;
  if(c.dataset.diBound===String(A.gen))return;c.dataset.diBound=String(A.gen);
  c.addEventListener("click",function(ev){
    if(!S.admin||S.admin.container!==c)return;
    var b=ev.target.closest("[data-di-a]");if(!b||b.tagName==="FORM"||b.tagName==="INPUT")return;
    var act=b.getAttribute("data-di-a"),li=b.closest(".di-arow");
    if(act==="reload"){drawAdmin(c);return;}
    if(act==="cancel"){S.admin.open=null;adminRender();return;}
    if(act==="open-issue"||act==="open-revoke"){S.admin.open={id:li.getAttribute("data-uid"),kind:act==="open-issue"?"issue":"revoke"};adminRender();var f=c.querySelector(".di-aform input,.di-aform textarea");if(f)f.focus();}
  });
  c.addEventListener("input",function(ev){
    if(ev.target.matches('[data-di-a="search"]')){S.admin.q=ev.target.value;var pos=ev.target.selectionStart;adminRender();var s=c.querySelector('[data-di-a="search"]');if(s){s.focus();try{s.setSelectionRange(pos,pos);}catch(e){}}}
  });
  c.addEventListener("submit",function(ev){
    var f=ev.target.closest(".di-aform");if(!f)return;ev.preventDefault();adminSubmit(f);
  });
}
async function adminSubmit(f){
  var A=S.admin,gen=A.gen,kind=f.getAttribute("data-di-a"),uid=f.closest(".di-arow").getAttribute("data-uid"),a=api();
  var msg=f.querySelector(".di-aform-msg"),btn=f.querySelector('button[type="submit"]');
  function say(cls,t){msg.innerHTML="";var d=document.createElement("div");d.className="hrr-msg "+cls;if(cls==="err")d.setAttribute("role","alert");d.textContent=t;msg.appendChild(d);}
  var row=A.data.drivers.find(function(r){return String(r.user_id)===uid;});
  try{
    if(kind==="issue"){
      var until=f.until.value||null;
      if(until&&new Date(until+"T23:59:59")<new Date()){say("err","Valid-until date must be in the future.");return;}
      if(row&&row.card&&row.card.state==="active"){var m="Reissue the ID for "+(row.name||"this Driver")+"? The current card "+row.card.reference+" will be replaced.";if(!(typeof crmConfirm==="function"?await crmConfirm(m,"Reissue company ID","Reissue"):window.confirm(m)))return;}
      btn.disabled=true;say("info","Issuing...");
      var snap=await a.issue(uid,until);
    }else{
      var reason=f.reason.value.trim();
      if(reason.length<3){f.reason.setAttribute("aria-invalid","true");say("err","Enter a reason for revoking this ID.");f.reason.focus();return;}
      btn.disabled=true;say("info","Revoking...");
      snap=await a.revoke(uid,reason);
    }
    if(!S.admin||S.admin.gen!==gen||!A.container.isConnected)return;
    A.data.drivers=A.data.drivers.map(function(r){return String(r.user_id)===uid?(snap||r):r;});
    A.open=null;adminRender();
    if(typeof crmToast==="function")crmToast(kind==="issue"?"Company ID issued.":"Company ID revoked.","Driver company ID");
  }catch(e){
    if(!S.admin||S.admin.gen!==gen)return;
    btn.disabled=false;say("err",errText(e));
  }
}

window.DriverIdentityUI={ready:ready,renderProfile:renderProfile,renderCard:renderCard,mountDriver:mountDriver,drawAdmin:drawAdmin,reset:reset};
})();
