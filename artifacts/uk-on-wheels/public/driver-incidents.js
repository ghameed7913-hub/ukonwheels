/* UK On Wheels - Driver incident reports (classic script, global window.IncidentUI) */
(function(){
"use strict";
var MAX_BYTES=10*1024*1024;
var OK_TYPES=["image/jpeg","image/png","image/webp"];
var TYPES=["Accident","Incident","Delay","Recovery"];
var FAULTS=[["driver","Driver"],["other","Other party"],["shared","Shared"],["unknown","Unknown"]];
var KINDS=[["incident","Incident scene"],["licence","Other party licence"],["insurance","Other party insurance"]];
var FIELD_KEYS=["fullName","driverNumber","registration","make","model","type","occurredAt","location","description","fault","policeReference","recoveryCompany","recoveryReference","weather","roadConditions","injuries","damage","witnesses","actionsTaken","otherName","otherPhone","otherAddress","otherInsurance","otherRegistration","otherMake","otherModel","otherColour"];
var LABELS={fullName:"Full name",driverNumber:"Driver ID number",registration:"Vehicle registration",make:"Make",model:"Model",type:"Report type",occurredAt:"Date and time",location:"Location",description:"What happened",fault:"Fault (driver account)",policeReference:"Police reference",recoveryCompany:"Recovery company",recoveryReference:"Recovery reference",weather:"Weather",roadConditions:"Road conditions",injuries:"Injuries",damage:"Damage",witnesses:"Witnesses",actionsTaken:"Actions taken",otherName:"Other party full name",otherPhone:"Other party phone",otherAddress:"Other party address",otherInsurance:"Other party insurance company / policy",otherRegistration:"Other vehicle registration",otherMake:"Other vehicle make",otherModel:"Other vehicle model",otherColour:"Other vehicle colour"};
var REQUIRED=["fullName","driverNumber","registration","make","model","type","occurredAt","location","description","fault"];

function esc(v){return typeof escapeHtml==="function"?escapeHtml(v):String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function toast(m,t){try{if(typeof crmToast==="function")crmToast(m,t||"Incident report");}catch(e){}}
function api(){return window.IncidentAPI||null;}
function apiMissing(){var a=api();return !a||["list","saveDraft","upload","photos","submit"].some(function(k){return typeof a[k]!=="function";});}
var SETUP_MSG="Incident reporting storage is not set up. An administrator must run <code>supabase/incident_reports_patch.sql</code> in Supabase, then reload the portal. The patch creates the private incident-evidence bucket. Nothing has been saved.";
function errText(e){return (e&&(e.message||e.error_description||e.error))||String(e||"Unknown error");}
function userKey(){try{return (typeof currentSession!=="undefined"&&currentSession&&currentSession.user&&currentSession.user.id)||null;}catch(e){return null;}}
function userObj(){try{return typeof currentUser!=="undefined"?currentUser:null;}catch(e){return null;}}
function fmtDate(v){if(!v)return "";var d=new Date(v);return isNaN(d)?String(v):d.toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});}
function localNow(){var d=new Date();d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);}
function bookings(){try{return ((typeof driverAssignedRows==="function"?driverAssignedRows():[])||[]).filter(function(b){return !!b._normalizedId;});}catch(e){return [];}}
function bookingId(b){return String((b&&(b._normalizedId||b.id||b.ref))||"");}
function bookingFor(id){if(!id)return null;id=String(id);return bookings().find(function(b){return bookingId(b)===id||String(b.ref||"")===id;})||null;}
function splitVehicle(b){var v=String(b.vehicle||"").trim().split(/\s+/);return {make:b.make||v[0]||"",model:b.model||v.slice(1).join(" ")||""};}

/* ---------- State (memory only, per authenticated user) ---------- */
var S=null;
function blank(){return {user:userKey(),reports:[],loaded:false,loading:false,listError:"",tab:"form",detailId:null,detailPhotos:null,detailErr:"",
 draft:null,files:[],persisted:[],persistedErr:"",busy:false,progress:null,formMsg:null,invalid:{},gen:0,pendingOpen:null};}
function st(){var k=userKey();if(!S||S.user!==k){if(S)revokeAll(S);S=blank();}return S;}
function revokeAll(s){(s.files||[]).forEach(function(f){if(f.url){try{URL.revokeObjectURL(f.url);}catch(e){}}});}
function newDraft(){var u=userObj()||{};var d={};FIELD_KEYS.forEach(function(k){d[k]="";});d.fullName=u.name||u.full_name||"";d.driverNumber=u.driverNumber||u.driver_number||"";d.occurredAt=localNow();var x={id:uuid(),saved:false,status:"draft",booking_id:"",details:d};x.snap=snap(x);return x;}
function uuid(){try{if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();}catch(e){}var h="0123456789abcdef",o="";for(var i=0;i<36;i++){o+=(i===8||i===13||i===18||i===23)?"-":i===14?"4":h[(Math.random()*16)|0];}return o;}
function snap(d){return JSON.stringify([d.booking_id||"",FIELD_KEYS.map(function(k){return d.details[k]==null?"":String(d.details[k]);})]);}
function ensureDraft(s){if(!s.draft)s.draft=newDraft();return s.draft;}
function applyBooking(d,id,force){var b=bookingFor(id);if(!b)return;var v=splitVehicle(b);
 if(force||!d.details.registration)d.details.registration=b.reg||b.registration||d.details.registration;
 if(force||!d.details.make)d.details.make=v.make||d.details.make;
 if(force||!d.details.model)d.details.model=v.model||d.details.model;}

/* ---------- Markup helpers ---------- */
function field(k,o){o=o||{};var d=S.draft.details;var v=d[k]==null?"":d[k];var id="inc_"+k;var inv=S.invalid[k]?' aria-invalid="true"':"";var dis=o.ro?" disabled":"";
 var lab='<label for="'+id+'">'+esc(o.label||LABELS[k])+(REQUIRED.indexOf(k)>=0?' <em>(required)</em>':o.known?' <em>(provide if known)</em>':' <em>(optional)</em>')+'</label>';
 var ctl;
 if(o.area)ctl='<textarea id="'+id+'" data-f="'+k+'"'+inv+dis+'>'+esc(v)+'</textarea>';
 else if(o.opts)ctl='<select id="'+id+'" data-f="'+k+'"'+inv+dis+'><option value="">Select</option>'+o.opts.map(function(x){return '<option'+(x===v?" selected":"")+'>'+esc(x)+'</option>';}).join("")+'</select>';
 else ctl='<input id="'+id+'" data-f="'+k+'" type="'+(o.type||"text")+'" value="'+esc(v)+'"'+(o.ac?' autocomplete="'+o.ac+'"':"")+inv+dis+'>';
 return '<div class="incField'+(o.full?" full":"")+'">'+lab+ctl+(o.hint?'<div class="incHint">'+esc(o.hint)+'</div>':"")+'</div>';}
function msg(m){if(!m)return "";return '<div class="incMsg '+m.kind+'" role="'+(m.kind==="error"?"alert":"status")+'">'+(m.html?m.text:esc(m.text))+'</div>';}
function statusBadge(s){return s==="submitted"?'<span class="badge green">Submitted</span>':'<span class="badge amber">Draft</span>';}
function safety(){return '<div class="incSafety" role="note"><strong>Safety first.</strong><ul><li>If anyone is in immediate danger or injured, call <strong>999</strong> before anything else.</li><li>Do not use this form while driving. Pull over somewhere safe and switch off the engine.</li><li>The fault selection records your account only. It is not a legal finding of liability.</li></ul></div>';}

function thumbsPending(ro){var s=S;if(!s.files.length)return "";
 return '<div class="incThumbs">'+s.files.map(function(f){var cls=f.status==="done"?"done":f.status==="failed"?"failed":f.status==="uploading"?"uploading":"";
  var lbl={pending:"Not uploaded",uploading:"Uploading",failed:"Upload failed",done:"Uploaded"}[f.status];
  return '<div class="incThumb">'+(f.url?'<img src="'+esc(f.url)+'" alt="Preview of '+esc(f.file.name)+'">':'<div class="ph">No preview</div>')+
  '<div class="meta"><b>'+esc(f.file.name)+'</b><span>'+esc(kindLabel(f.kind))+' &middot; '+(f.file.size/1048576).toFixed(1)+' MB</span><span class="incState '+cls+'">'+lbl+'</span>'+(f.error?'<span style="color:#b31d2c">'+esc(f.error)+'</span>':"")+'</div>'+
  (f.status!=="done"&&f.status!=="uploading"&&!ro?'<button type="button" data-act="rm" data-key="'+f.key+'"'+(s.busy?" disabled":"")+'>Remove</button>':"")+'</div>';}).join("")+'</div>';}
function kindLabel(k){var m=KINDS.find(function(x){return x[0]===k;});return m?m[1]:(k||"Photo");}
function thumbsPersisted(list,refreshAct){if(!list||!list.length)return '<p class="muted" style="font-size:12.5px;margin:6px 0">No photos stored yet.</p>';
 return '<div class="incThumbs">'+list.map(function(p){return '<div class="incThumb">'+(p.url&&!p.error?'<img src="'+esc(p.url)+'" alt="'+esc(kindLabel(p.category))+' photo" loading="lazy">':'<div class="ph">'+esc(p.error?"Viewing link unavailable":"No link")+'</div>')+
  '<div class="meta"><b>'+esc(p.file_name||"Photo")+'</b><span>'+esc(kindLabel(p.category))+'</span>'+(p.error?'<span style="color:#b31d2c">'+esc(p.error)+'</span>':"")+'</div>'+
  (p.url&&!p.error?'<a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer">Open full size</a>':"")+'</div>';}).join("")+'</div>'+
  (refreshAct?'<div class="actions"><button type="button" class="btn secondary" data-act="'+refreshAct+'">Refresh viewing links</button></div>':"");}

function formHtml(){var s=S,d=ensureDraft(s),dt=d.details,ro=d.status==="submitted",b=s.busy;
 var fo=dt.fault==="other"||dt.fault==="shared";
 var bopts='<option value="">No related booking</option>'+bookings().map(function(x){var id=bookingId(x);return '<option value="'+esc(id)+'"'+(id===String(d.booking_id||"")?" selected":"")+'>'+esc((x.ref||id)+" \u00b7 "+(x.reg||"")+" "+(x.vehicle||""))+'</option>';}).join("");
 if(d.booking_id&&!bookingFor(d.booking_id))bopts+='<option value="'+esc(d.booking_id)+'" selected>Booking '+esc(d.booking_id)+'</option>';
 var prog=s.progress?'<div class="incMsg info" role="status" aria-live="polite">'+esc(s.progress.label)+'<div class="incProg"><i style="transform:scaleX('+(s.progress.total?s.progress.done/s.progress.total:0)+')"></i></div></div>':"";
 return safety()+msg(s.formMsg)+
 (d.saved?'<div class="incMsg info">Editing '+(ro?"submitted":"draft")+' report <b>'+esc(String(d.id).slice(0,8))+'</b>. '+(ro?"Submitted reports cannot be changed.":"Saved drafts can be reopened and continued.")+'</div>':"")+
 '<form id="incForm" novalidate><fieldset style="border:0;margin:0;padding:0;min-width:0"'+(ro?" disabled":"")+'>'+
 '<div class="incCard"><h4>Driver and vehicle</h4><div class="incGrid">'+
 '<div class="incField full"><label for="inc_booking">Related booking <em>(optional)</em></label><select id="inc_booking" data-booking>'+bopts+'</select><div class="incHint">Choosing a booking fills in vehicle details you have not already typed.</div></div>'+
 field("fullName",{ac:"name"})+field("driverNumber")+field("registration")+field("make")+field("model")+'</div></div>'+
 '<div class="incCard"><h4>What happened</h4><div class="incGrid">'+
 field("type",{opts:TYPES})+field("occurredAt",{type:"datetime-local"})+field("location",{full:true,hint:"Road, junction, town or postcode. what3words is fine."})+
 field("description",{area:true,full:true})+
 '<div class="incField full" role="radiogroup" aria-labelledby="inc_fault_l"><label id="inc_fault_l">Fault (your account) <em>(required)</em></label><div class="incFault">'+FAULTS.map(function(f){return '<label><input type="radio" name="inc_fault" data-f="fault" value="'+f[0]+'"'+(dt.fault===f[0]?" checked":"")+'>'+f[1]+'</label>';}).join("")+'</div>'+(s.invalid.fault?'<div class="incHint" style="color:#b31d2c">Select an option. Choose Unknown if unsure.</div>':"")+'</div>'+
 (fo?'<div class="incOther full"><h4>Other party</h4><p class="incHint" style="margin:-4px 0 10px">Record what you can safely obtain. Missing details will not block submission.</p><div class="incGrid">'+
  ["otherName","otherPhone","otherAddress","otherInsurance","otherRegistration","otherMake","otherModel","otherColour"].map(function(k){return field(k,{known:true,full:k==="otherAddress",type:k==="otherPhone"?"tel":"text"});}).join("")+'</div></div>':"")+
 '</div></div>'+
 '<div class="incCard"><h4>Conditions and outcome</h4><div class="incGrid">'+
 field("weather")+field("roadConditions")+field("injuries",{area:true,full:true})+field("damage",{area:true,full:true})+field("witnesses",{area:true,full:true})+field("actionsTaken",{area:true,full:true})+
 field("policeReference")+field("recoveryCompany")+field("recoveryReference")+'</div></div>'+
 '</fieldset></form>'+
 '<div class="incCard"><h4>Photos</h4>'+
 (ro?"":'<div class="incGrid"><div class="incField full"><label for="inc_kind">Photo category</label><select id="inc_kind"'+(b?" disabled":"")+'>'+KINDS.map(function(k){return '<option value="'+k[0]+'"'+(k[0]===(s.kind||"incident")?" selected":"")+'>'+k[1]+'</option>';}).join("")+'</select><div class="incHint">Licence and insurance photos are private and only visible to you and UK On Wheels admin.</div></div></div>'+
 '<div class="incPick"><label class="btn primary" for="inc_cap">Take photo<input id="inc_cap" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"'+(b?" disabled":"")+'></label>'+
 '<label class="btn secondary" for="inc_files">Choose files<input id="inc_files" type="file" accept="image/jpeg,image/png,image/webp" multiple'+(b?" disabled":"")+'></label></div>'+
 '<div class="incHint">JPEG, PNG or WebP, up to 10 MB each. iPhone HEIC photos: set Settings &gt; Camera &gt; Formats to "Most Compatible", or share the photo as JPEG first.</div>')+
 thumbsPending(ro)+
 (d.saved?'<h4 style="margin-top:14px">Stored with this report</h4>'+(s.persistedErr?msg({kind:"error",text:s.persistedErr}):"")+thumbsPersisted(s.persisted,"refreshPersisted"):"")+'</div>'+
 prog+
 (ro?'<div class="actions"><button type="button" class="btn secondary" data-act="new">Start a new report</button></div>':
 '<div class="incBar"><button type="button" class="btn secondary" data-act="save"'+(b?" disabled":"")+'>'+(b==="save"?"Saving":"Save draft")+'</button><button type="button" class="btn primary" data-act="submit"'+(b?" disabled":"")+'>'+(b==="submit"?"Submitting":"Submit report")+'</button></div>'+
 (d.saved||s.files.length?'<div class="actions"><button type="button" class="btn secondary" data-act="new"'+(b?" disabled":"")+'>Start a new report</button></div>':""));}

function listHtml(){var s=S;
 if(s.listError)return msg({kind:"error",text:s.listError,html:true})+'<div class="actions"><button type="button" class="btn secondary" data-act="reload">Retry</button></div>';
 if(s.loading&&!s.loaded)return '<div class="incList"><div class="incSkel"></div><div class="incSkel"></div><div class="incSkel"></div></div>';
 if(!s.reports.length)return '<div class="incEmpty"><b>No reports yet.</b><br>Reports you save or submit appear here, including their photos.</div>';
 return '<div class="incList">'+s.reports.map(function(r){var d=r.details||{};return '<button type="button" class="incItem" data-act="openReport" data-id="'+esc(r.id)+'"><span class="incItemTop">'+statusBadge(r.status)+'<small>'+esc(fmtDate(r.created_at))+'</small></span><strong>'+esc((d.type||"Report")+" \u00b7 "+(d.registration||"No registration"))+'</strong><small>'+esc(d.location||"Location not entered")+'</small></button>';}).join("")+'</div>';}

function detailHtml(r,photos,perr,refreshAct){var d=r.details||{};var b=r.booking_id?bookingFor(r.booking_id):null;
 return '<div class="incCard"><div class="incItemTop">'+statusBadge(r.status)+'<small class="muted">'+esc(fmtDate(r.created_at))+'</small></div>'+
 '<dl class="incDl" style="margin-top:10px"><dt>Report ID</dt><dd>'+esc(r.id)+'</dd><dt>Booking</dt><dd>'+esc(b?(b.ref||r.booking_id):(r.booking_id||"None"))+'</dd>'+(r.driver_id?'<dt>Driver account</dt><dd>'+esc(r.driver_id)+'</dd>':"")+
 FIELD_KEYS.map(function(k){var v=d[k];if(k==="fault"){var f=FAULTS.find(function(x){return x[0]===v;});v=f?f[1]:v;}if(k==="occurredAt")v=fmtDate(v);return '<dt>'+esc(LABELS[k])+'</dt><dd>'+(v?esc(v):'<span class="muted">Not provided</span>')+'</dd>';}).join("")+'</dl></div>'+
 '<div class="incCard"><h4>Photos</h4>'+(perr?msg({kind:"error",text:perr}):"")+(photos==null&&!perr?'<div class="incSkel"></div>':thumbsPersisted(photos||[],refreshAct))+'</div>';}

function renderDriver(){var s=st();ensureDraft(s);
 return '<div class="inc" id="incRoot">'+innerDriver()+'</div>';}
function innerDriver(){var s=S;var head='<div class="incHead"><div><h3>Incident reports</h3><p>Document accidents, incidents, delays and recoveries.</p></div></div>'+
 '<div class="incTabs" role="group" aria-label="Incident views"><button type="button" data-act="tab" data-tab="form" aria-pressed="'+(s.tab==="form")+'">'+(S.draft&&S.draft.saved&&S.draft.status==="submitted"?"Report":"Current report")+'</button><button type="button" data-act="tab" data-tab="list" aria-pressed="'+(s.tab!=="form")+'">My reports'+(s.reports.length?" ("+s.reports.length+")":"")+'</button></div>';
 if(apiMissing())head+=msg({kind:"error",text:SETUP_MSG,html:true});
 if(s.tab==="form")return head+formHtml();
 if(s.tab==="detail"){var r=s.reports.find(function(x){return String(x.id)===String(s.detailId);});
  if(!r)return head+'<div class="incEmpty">Report not found.</div>';
  return head+'<div class="actions" style="margin:0 0 10px"><button type="button" class="btn secondary" data-act="tab" data-tab="list">Back to list</button>'+(r.status==="draft"?'<button type="button" class="btn primary" data-act="continue" data-id="'+esc(r.id)+'"'+(s.busy?" disabled":"")+'>Continue this draft</button>':"")+'</div>'+detailHtml(r,s.detailPhotos,s.detailErr,"refreshDetail");}
 return head+listHtml();}

/* ---------- Rendering lifecycle ---------- */
function root(){var el=document.getElementById("incRoot");return el&&el.isConnected?el:null;}
function rerender(){var el=root();if(!el||!S||S.user!==userKey())return;var y=window.scrollY;var a=document.activeElement&&document.activeElement.id;el.innerHTML=innerDriver();if(a){var n=document.getElementById(a);if(n&&el.contains(n))try{n.focus({preventScroll:true});}catch(e){}}window.scrollTo(0,y);}
function captureForm(){var el=root();if(!el||!S||!S.draft||S.draft.status==="submitted")return;
 el.querySelectorAll("[data-f]").forEach(function(n){if(n.type==="radio"){if(n.checked)S.draft.details.fault=n.value;}else S.draft.details[n.getAttribute("data-f")]=n.value;});
 var bs=el.querySelector("[data-booking]");if(bs)S.draft.booking_id=bs.value;}

async function loadList(){var s=st();var gen=++s.gen;var u=s.user;
 if(apiMissing()){s.listError=SETUP_MSG;s.loaded=true;rerender();return;}
 s.loading=true;s.listError="";rerender();
 try{var rows=await api().list();if(!S||S!==s||s.user!==userKey()||gen!==s.gen)return;
  s.reports=(rows||[]).filter(function(r){return !u||!r.driver_id||r.driver_id===u;}).sort(function(a,b){return String(b.created_at).localeCompare(String(a.created_at));});s.loaded=true;
  if(s.pendingOpen){var po=s.pendingOpen;s.pendingOpen=null;applyOpen(po);}
 }catch(e){if(S!==s||gen!==s.gen)return;s.listError="Could not load your reports: "+esc(errText(e))+". Your current form is unaffected.";}
 finally{if(S===s){s.loading=false;rerender();}}}

async function loadPersisted(){var s=S,d=s&&s.draft;if(!d||!d.saved||apiMissing())return;var id=d.id;
 try{var p=await api().photos(id);if(S!==s||!s.draft||s.draft.id!==id)return;s.persisted=p||[];s.persistedErr="";}
 catch(e){if(S!==s)return;s.persistedErr="Could not load stored photos: "+errText(e);}rerender();}
async function loadDetail(){var s=S,id=s.detailId;s.detailPhotos=null;s.detailErr="";rerender();
 try{var p=await api().photos(id);if(S!==s||s.detailId!==id)return;s.detailPhotos=p||[];}catch(e){if(S!==s||s.detailId!==id)return;s.detailErr="Could not load photos: "+errText(e);}rerender();}

/* ---------- Files ---------- */
var keySeq=0;
function addFiles(list){var s=S,bad=[];Array.prototype.forEach.call(list||[],function(f){
 var t=(f.type||"").toLowerCase();
 if(OK_TYPES.indexOf(t)<0){bad.push(f.name+(/heic|heif/i.test(t+f.name)?" is HEIC. Convert to JPEG (iPhone: Settings > Camera > Formats > Most Compatible).":" is not a JPEG, PNG or WebP image."));return;}
  if(f.size<1||f.size>MAX_BYTES){bad.push(f.name+" must be non-empty and no larger than 10 MB.");return;}
 var url="";try{url=URL.createObjectURL(f);}catch(e){}
 s.files.push({key:"f"+(++keySeq),file:f,kind:s.kind||"incident",url:url,status:"pending",error:""});});
 s.formMsg=bad.length?{kind:"error",text:"Some files were not added: "+bad.join(" ")}:null;rerender();}
function removeFile(key){var s=S;var i=s.files.findIndex(function(f){return f.key===key;});if(i<0)return;var f=s.files[i];if(f.status==="uploading")return;if(f.url)try{URL.revokeObjectURL(f.url);}catch(e){}s.files.splice(i,1);rerender();}

/* ---------- Save / submit ---------- */
function validate(){var d=S.draft.details,inv={};REQUIRED.forEach(function(k){if(!String(d[k]||"").trim())inv[k]=true;});if(d.type&&TYPES.indexOf(d.type)<0)inv.type=true;S.invalid=inv;return Object.keys(inv);}
async function persistDraft(){var s=S,d=s.draft;var sent=snap(d);var rep=await api().saveDraft({id:d.id,details:Object.assign({},d.details),booking_id:d.booking_id||null});
 if(!rep||!rep.id)throw new Error("Save returned no report ID");if(String(rep.id)!==String(d.id))throw new Error("Server returned a different report ID");
 if(S!==s)throw new Error("Session changed");
 d.saved=true;d.status=rep.status||"draft";if(rep.booking_id!=null&&rep.booking_id!=="")d.booking_id=String(rep.booking_id);
 d.snap=sent;upsert(rep);return rep;}
function upsert(rep){var s=S,i=s.reports.findIndex(function(r){return String(r.id)===String(rep.id);});if(i>=0)s.reports[i]=rep;else s.reports.unshift(rep);}
async function uploadPending(){var s=S,d=s.draft;var todo=s.files.filter(function(f){return f.status!=="done";});var total=todo.length,done=0,failed=0;
 for(var i=0;i<todo.length;i++){var f=todo[i];if(S!==s)throw new Error("Session changed");f.status="uploading";f.error="";
  s.progress={label:"Uploading photo "+(i+1)+" of "+total+": "+f.file.name,done:done,total:total};rerender();
  try{var meta=await api().upload(d.id,f.file,f.kind);if(!meta)throw new Error("No upload confirmation");f.status="done";done++;}
  catch(e){f.status="failed";f.error=errText(e);failed++;}
  s.progress={label:"Uploaded "+done+" of "+total,done:done,total:total};rerender();}
 s.files.filter(function(f){return f.status==="done";}).forEach(function(f){if(f.url)try{URL.revokeObjectURL(f.url);}catch(e){}});
 s.files=s.files.filter(function(f){return f.status!=="done";});
 return failed;}
async function run(mode){var s=S;if(s.busy)return;captureForm();
 if(apiMissing()){s.formMsg={kind:"error",text:SETUP_MSG,html:true};rerender();return;}
 if(s.draft.status==="submitted")return;
 if(mode==="submit"){var miss=validate();if(miss.length){s.formMsg={kind:"error",text:"Complete the required fields: "+miss.map(function(k){return LABELS[k];}).join(", ")+"."};rerender();var n=document.getElementById(miss[0]==="fault"?"inc_fault_l":"inc_"+miss[0]);if(n&&n.scrollIntoView)n.scrollIntoView({block:"center"});return;}}
 else S.invalid={};
 s.busy=mode;s.formMsg=null;s.progress={label:"Saving report details",done:0,total:1};rerender();
 try{
  await persistDraft();
   if(S!==s||s.user!==userKey())return;
  var failed=await uploadPending();
   if(S!==s||s.user!==userKey())return;
  if(failed){s.formMsg={kind:"error",text:failed+" photo"+(failed>1?"s":"")+" failed to upload. The report details are saved as a draft"+(mode==="submit"?" and it has NOT been submitted":"")+". Check your connection and try again; uploaded photos will not be sent twice."};return;}
  if(mode==="submit"){s.progress={label:"Submitting report",done:1,total:1};rerender();
    var rep=await api().submit(s.draft.id);if(S!==s||s.user!==userKey())return;if(!rep||rep.status!=="submitted")throw new Error("Server did not confirm submission");
   upsert(rep);s.draft.status="submitted";s.formMsg={kind:"ok",text:"Report submitted to UK On Wheels operations. It can no longer be edited."};toast("Incident report submitted");}
  else{s.formMsg={kind:"ok",text:"Draft saved with its photos. You can continue it later from My reports."};toast("Draft saved");}
 }catch(e){if(S!==s)return;s.formMsg={kind:"error",text:(mode==="submit"?"Report NOT submitted. ":"Draft not saved. ")+errText(e)+" Your entries and photos are still here."};}
 finally{if(S===s){s.busy=false;s.progress=null;rerender();loadPersisted();}}}

function continueDraft(id){var s=S;var r=s.reports.find(function(x){return String(x.id)===String(id);});if(!r||s.busy)return;
 if(hasUnsaved()&&s.draft&&String(s.draft.id)!==String(id)){s.formMsg={kind:"error",text:"Your current report has unsaved changes or photos. Save it first or remove them before opening another draft."};s.tab="form";rerender();return;}
 var base=newDraft().details;s.draft={id:r.id,saved:true,status:r.status,booking_id:r.booking_id?String(r.booking_id):"",details:Object.assign(base,r.details||{})};s.draft.snap=snap(s.draft);
 revokeAll(s);s.files=[];s.persisted=[];s.persistedErr="";s.invalid={};s.formMsg=null;s.tab="form";rerender();loadPersisted();}
function startNew(){var s=S;if(s.busy)return;if(hasUnsaved()&&!s.confirmNew){s.confirmNew=true;s.formMsg={kind:"error",text:"This report has unsaved changes or photos. Save the draft first, or press Start a new report again to discard them."};rerender();return;}s.confirmNew=false;revokeAll(s);s.files=[];s.persisted=[];s.persistedErr="";s.invalid={};s.formMsg=null;s.draft=newDraft();s.tab="form";rerender();}

function applyOpen(o){var s=st();var b=bookingFor(o.ref);
 if(!s.draft||s.draft.status==="submitted"||(!s.draft.saved&&!s.files.length&&!hasUnsaved())){if(s.draft&&s.draft.status==="submitted")startNew();ensureDraft(s);}
 if(b&&!s.draft.saved){s.draft.booking_id=bookingId(b);applyBooking(s.draft,s.draft.booking_id,false);}
 if(o.type&&TYPES.indexOf(o.type)>=0&&!s.draft.saved)s.draft.details.type=o.type;s.tab="form";}

/* ---------- Events (delegated, bound per root element) ---------- */
function bind(el){if(el.__incBound)return;el.__incBound=true;
  el.addEventListener("submit",function(e){e.preventDefault();});
 el.addEventListener("input",function(e){var t=e.target;if(!S||!S.draft||S.draft.status==="submitted")return;var k=t.getAttribute&&t.getAttribute("data-f");
  if(k&&t.type!=="radio"){S.draft.details[k]=t.value;if(S.invalid[k]&&t.value.trim()){delete S.invalid[k];t.removeAttribute("aria-invalid");}}});
 el.addEventListener("change",function(e){var t=e.target;if(!S)return;
  if(t.name==="inc_fault"){S.draft.details.fault=t.value;delete S.invalid.fault;captureForm();rerender();return;}
  if(t.hasAttribute("data-booking")){captureForm();S.draft.booking_id=t.value;applyBooking(S.draft,t.value,false);rerender();return;}
  if(t.id==="inc_kind"){S.kind=t.value;return;}
  if(t.id==="inc_files"||t.id==="inc_cap"){captureForm();addFiles(t.files);t.value="";return;}
  var k=t.getAttribute("data-f");if(k)S.draft.details[k]=t.value;});
 el.addEventListener("click",function(e){var b=e.target.closest("[data-act]");if(!b||!el.contains(b)||b.disabled)return;var a=b.getAttribute("data-act");
  if(a==="tab"){captureForm();var t=b.getAttribute("data-tab");S.tab=t;rerender();if(t==="list"&&!S.loading)loadList();}
  else if(a==="save")run("save");else if(a==="submit")run("submit");
  else if(a==="rm")removeFile(b.getAttribute("data-key"));
  else if(a==="reload")loadList();
  else if(a==="new")startNew();
  else if(a==="openReport"){captureForm();S.tab="detail";S.detailId=b.getAttribute("data-id");loadDetail();}
  else if(a==="refreshDetail")loadDetail();
  else if(a==="refreshPersisted")loadPersisted();
  else if(a==="continue")continueDraft(b.getAttribute("data-id"));});}
function mountDriver(){var el=root();if(!el)return;st();bind(el);el.innerHTML=innerDriver();if(!S.loaded&&!S.loading)loadList();else if(S.draft&&S.draft.saved&&!S.persisted.length&&!S.persistedErr)loadPersisted();}

/* ---------- Admin (read-only) ---------- */
var A={gen:0,reports:[],sel:null,photos:null,perr:"",err:""};
async function renderAdmin(container){if(!container)return;var gen=++A.gen;var u=userKey();
  function alive(){return gen===A.gen&&container.isConnected&&userKey()===u&&(typeof page==="undefined"||page==="incidents")&&(typeof role==="undefined"||role==="admin");}
 function draw(){if(!alive())return;var r=A.reports.find(function(x){return String(x.id)===String(A.sel);});
  container.innerHTML='<div class="incHead"><div><h3>Incident reports</h3><p>All driver reports. Read-only. Photo links are private and expire.</p></div><button type="button" class="btn secondary" data-aact="reload">Reload</button></div>'+
  (A.err?msg({kind:"error",text:A.err,html:true}):"")+
  '<div class="inc incAdmin"><div>'+(A.loading?'<div class="incList"><div class="incSkel"></div><div class="incSkel"></div></div>':!A.reports.length&&!A.err?'<div class="incEmpty">No incident reports have been filed.</div>':
  '<div class="incList">'+A.reports.map(function(x){var d=x.details||{};return '<button type="button" class="incItem'+(String(x.id)===String(A.sel)?" sel":"")+'" data-aact="sel" data-id="'+esc(x.id)+'"><span class="incItemTop">'+statusBadge(x.status)+'<small>'+esc(fmtDate(x.created_at))+'</small></span><strong>'+esc((d.type||"Report")+" \u00b7 "+(d.registration||"No reg"))+'</strong><small>'+esc((d.fullName||"Unknown driver")+" \u00b7 "+(d.location||""))+'</small></button>';}).join("")+'</div>')+
  '</div><div>'+(r?detailHtml(r,A.photos,A.perr,"x").replace('data-act="x"','data-aact="photos"'):'<div class="incEmpty">Select a report to view full details and photos.</div>')+'</div></div>';}
 async function photos(){var id=A.sel;A.photos=null;A.perr="";draw();try{var p=await api().photos(id);if(!alive()||A.sel!==id)return;A.photos=p||[];}catch(e){if(!alive())return;A.perr="Could not load photos: "+errText(e);}draw();}
 async function load(){A.err="";if(apiMissing()){A.err=SETUP_MSG;A.reports=[];draw();return;}A.loading=true;draw();
  try{var rows=await api().list();if(!alive())return;A.reports=(rows||[]).slice().sort(function(a,b){return String(b.created_at).localeCompare(String(a.created_at));});}
  catch(e){if(!alive())return;A.err="Could not load incident reports: "+esc(errText(e));}A.loading=false;draw();if(A.sel&&A.reports.some(function(x){return String(x.id)===String(A.sel);}))photos();}
  container.__incAdminActions={load:load,photos:photos};
  if(!container.__incAdmin){container.__incAdmin=true;container.addEventListener("click",function(e){var b=e.target.closest("[data-aact]");if(!b||!container.contains(b))return;var a=b.getAttribute("data-aact"),actions=container.__incAdminActions;
   if(a==="reload")actions.load();else if(a==="sel"){A.sel=b.getAttribute("data-id");actions.photos();}else if(a==="photos")actions.photos();});}
 await load();}

/* ---------- Public ---------- */
function open(bookingRef,type){var s=st();captureForm();var o={ref:bookingRef,type:type};if(s.loaded||!bookingRef)applyOpen(o);else{applyOpen(o);}
 try{if(typeof setDriverMobileTab==="function")setDriverMobileTab("incidents");else{window.driverMobileTab="incidents";if(typeof drawDriver==="function")drawDriver(document.getElementById("content"));}}catch(e){}
 setTimeout(function(){if(root())mountDriver();},0);}
function reset(){if(S){revokeAll(S);S.files=[];S.persisted=[];S.draft=null;S.gen++;}S=null;A={gen:A.gen+1,reports:[],sel:null,photos:null,perr:"",err:""};}
function isBusy(){return !!(S&&S.busy);}
function hasUnsaved(){if(!S||!S.draft||S.user!==userKey())return false;captureForm();if(S.draft.status==="submitted")return false;return snap(S.draft)!==S.draft.snap||S.files.some(function(f){return f.status!=="done";});}

window.IncidentUI={renderDriver:renderDriver,mountDriver:mountDriver,renderAdmin:renderAdmin,open:open,reset:reset,isBusy:isBusy,isSaving:isBusy,hasUnsaved:hasUnsaved,captureForm:captureForm,FIELD_KEYS:FIELD_KEYS.slice()};
})();
