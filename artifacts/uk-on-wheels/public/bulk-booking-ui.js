(function(){
"use strict";
function esc(v){return String(v==null?"":v).replace(/[&<>"'`=\/]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","`":"&#96;","=":"&#61;","/":"&#47;"}[c];});}
function js(v){return esc(JSON.stringify(String(v==null?"":v)).replace(/</g,"\\u003c").replace(/>/g,"\\u003e"));}
var LABEL={editing:"Ready",saving:"Saving",saved:"Saved",failed:"Failed",uncertain:"Result unknown"};
var CLS={editing:"",saving:"amber",saved:"green",failed:"red",uncertain:"amber"};
function shell(context){
 var client=!!(context&&context.client);
 if(client&&context.accountType!=="business")return "";
 var downloads='<button type="button" class="btn secondary bulk-dl" onclick="BulkBooking.downloadTemplate(\'Business\')">Download Business Excel</button>';
 return '<div class="bulk-wrap">'+
 '<div class="bulk-intro"><b>Bulk booking from Excel</b><p class="muted">One spreadsheet row per vehicle. Each vehicle is saved as its own booking with its own reference in New Booked Vehicle.'+(client?' Bookings are made for your own account; Operations sets charges.':'')+'</p></div>'+
 '<ol class="bulk-steps">'+
  '<li class="bulk-step"><span class="bulk-step-n" aria-hidden="true">1</span><div class="bulk-step-body"><b>Download the Business booking format</b><p class="muted">Excel bulk booking is for businesses. Simple cells, no dropdowns, and all relevant vehicle and journey fields. Private Clients use the single-vehicle booking form.</p><div class="actions">'+downloads+'</div></div></li>'+
  '<li class="bulk-step"><span class="bulk-step-n" aria-hidden="true">2</span><div class="bulk-step-body"><b>Upload the completed file</b><p class="muted">.xlsx only. Uploading a new file replaces unsaved rows.</p>'+
  '<fieldset id="bulkBookingEditor" class="bulk-editor"><legend class="bulk-sr">Vehicles to book</legend>'+
  '<label class="bulk-upload"><span class="bulk-upload-label">Choose Excel file</span><input id="bulkExcelFile" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-describedby="bulkWorkbookInfo" onchange="BulkBooking.uploadFile(this.files[0],this)"></label>'+
  '<p id="bulkWorkbookInfo" class="bulk-info muted" aria-live="polite">No file uploaded yet.</p></fieldset>'+
  '</div></li>'+
  '<li class="bulk-step bulk-step-full"><span class="bulk-step-n" aria-hidden="true">3</span><div class="bulk-step-body"><b>Review and save</b><p class="muted">Check each vehicle, open full details to correct anything, then save.</p>'+
  '<div id="bulkVehicleRows" class="bulk-rows"></div>'+
  '</div></li></ol>'+
 '<p id="bulkBookingStatus" class="bulk-status muted" role="status" aria-live="polite"></p>'+
 '<div id="bulkBookingResults" class="bulk-results"></div></div>';
}
function renderRows(rows,busy,shared,businesses,linkedOnly,context){
 rows=rows||[];shared=shared||{};businesses=businesses||[];context=context||{};
 var client=!!context.client;
 if(!rows.length)return '<div class="bulk-empty"><b>Nothing to review yet</b><span class="muted">Download the template, fill one row per vehicle, then upload it above. Every vehicle will appear here for review before anything is saved.</span></div>';
 var head='<div class="bulk-review-head"><b>'+rows.length+' vehicle'+(rows.length===1?'':'s')+' to review</b>'+(context.sourceName?'<span class="muted">from '+esc(context.sourceName)+'</span>':'')+'</div>';
 return head+rows.map(function(r,i){
  var st=LABEL[r.status]?r.status:"editing",n=i+1,lock=!!busy||st==="saving"||st==="saved"||st==="uncertain";
  var id=js(r.id),dis=lock?" disabled":"",pid="bulk-"+esc(r.id)+"-";
  var own=!!r.details,imported=own&&r.excelRow!=null,v=r.details||shared;
  function inp(f,label,val,type,ph,req,extraDis,hint){
   return '<label class="bulk-field bulk-f-'+f+'"><span>'+label+(req?' <i aria-hidden="true">*</i>':'')+'</span><input id="'+pid+f+'" type="'+type+'"'+(type==="number"?' min="0" step="any" inputmode="decimal"':'')+' value="'+esc(val)+'" placeholder="'+esc(ph)+'" aria-label="Vehicle '+n+' '+label+'"'+(req?' required aria-required="true"':'')+(lock||extraDis?" disabled":"")+' oninput="BulkBooking.updateRow('+id+',\''+f+'\',this.value)" onchange="BulkBooking.updateRow('+id+',\''+f+'\',this.value)">'+(hint?'<small class="bulk-hint">'+hint+'</small>':'')+'</label>';
  }
  var detailDis=lock||!own?" disabled":"";
  function detail(f,label,type,req,options,forceDis){
   var attrs=' id="'+pid+f+'" aria-label="Vehicle '+n+' '+label+'"'+(forceDis?" disabled":detailDis)+(req?' required aria-required="true"':'');
   var handler=' onchange="BulkBooking.updateDetail('+id+',\''+f+'\',this.value)"';
   var value=v[f]||"",field;
   if(options)field='<select'+attrs+handler+'>'+options.map(function(o){return '<option value="'+esc(o.value)+'"'+(String(o.value)===String(value)?' selected':'')+(o.disabled?' disabled':'')+'>'+esc(o.label)+'</option>';}).join("")+'</select>';
   else if(type==="textarea")field='<textarea'+attrs+' oninput="BulkBooking.updateDetail('+id+',\''+f+'\',this.value)"'+handler+'>'+esc(value)+'</textarea>';
   else field='<input'+attrs+' type="'+type+'" value="'+esc(value)+'" oninput="BulkBooking.updateDetail('+id+',\''+f+'\',this.value)"'+handler+'>';
   return '<label class="bulk-field'+(f==="notes"?' bulk-wide':'')+'"><span>'+label+(req?' <i aria-hidden="true">*</i>':'')+'</span>'+field+'</label>';
  }
  var choices=[{value:"",label:"Select Business"}].concat(businesses.filter(function(b){return String(b.accountType||"business").toLowerCase()==="business";}).map(function(b){
   var inactive=String(b.status||"Active").toLowerCase()!=="active",unlinked=linkedOnly&&!b.id;
   return {value:b.id||b.name,label:b.name+(inactive?" - inactive":unlinked?" - needs a linked business account":""),disabled:inactive||unlinked};
  }));
  if(v.biz&&!choices.some(function(b){return b.value===v.biz;}))choices.push({value:v.biz,label:"Selected business is unavailable",disabled:true});
  var priv=(v.customerType||"Business")==="Private";
  var bizName=(function(){var m=businesses.filter(function(b){return (b.id||b.name)===v.biz;})[0];return m?m.name:(v.biz||"");})();
  var who=client?"Your account":priv?(v.privateCustomerName||"Private customer"):(bizName||"No business");
  var identity=client?
   '<div class="bulk-locked bulk-wide"><span>Customer</span><b>Your own account</b><small class="muted">Client bookings are always made for your own account and cannot be changed here.</small></div>':
   detail("customerType","Customer type","select",true,[{value:"Business",label:"Business Customer"},{value:"Private",label:"Private Customer - Admin Only"}])+
   (priv?detail("privateCustomerName","Private customer name","text",true)+detail("privateCustomerMobile","Private customer mobile number","tel",false)+detail("privateCustomerEmail","Private Client portal email","email",true):detail("biz","Business","select",true,choices));
  var toggle=imported?'<p class="muted bulk-detail-hint">Imported from Excel row '+esc(r.excelRow)+'. These details belong to this vehicle only.</p>':
   '<label class="bulk-separate"><input type="checkbox" aria-label="Vehicle '+n+' Set separate details for this vehicle"'+(own?' checked':'')+dis+' onchange="BulkBooking.setOwnDetails('+id+',this.checked)"><span>Set separate details for this vehicle</span></label>'+
   '<p class="muted bulk-detail-hint">'+(own?'These details belong to this vehicle only.':'Using the shared customer and journey. Tick the box to edit separately.')+'</p>';
  var details='<details class="bulk-details"'+(st==="failed"||(r.message&&st==="editing")?' open':'')+'><summary>Full details</summary>'+toggle+
   '<div class="bulk-detail-grid">'+identity+
   detail("pickup","Collection address","text",true)+detail("dest","Delivery address","text",true)+
   detail("service","Service type","select",false,[{value:"Vehicle Delivery",label:"Vehicle Delivery"},{value:"Vehicle Collection & Delivery",label:"Vehicle Collection & Delivery"},{value:"Recovery / AA",label:"Recovery / AA"}])+
   detail("bdate","Booking date","date",false)+detail("ddate","Requested delivery date","date",false)+
   detail("receiver","Person receiving vehicle","text",true)+detail("mobile","Receiver mobile number","tel",true)+
   detail("dropoff","Latest drop-off time","time",false)+detail("notes","Special instructions","textarea",false)+
   '</div></details>';
  var msg=r.message?esc(r.message):(st==="uncertain"?"Server result unknown. Retry to reconcile before editing.":"");
  var overview='<div class="bulk-overview"><span><em>Customer</em>'+esc(who)+'</span><span><em>Route</em>'+esc(v.pickup||"-")+' to '+esc(v.dest||"-")+'</span><span><em>Receiver</em>'+esc(v.receiver||"-")+(v.mobile?' / '+esc(v.mobile):'')+'</span><span><em>Delivery</em>'+esc(v.ddate||"-")+(v.dropoff?' by '+esc(v.dropoff):'')+'</span><span><em>Service</em>'+esc(v.service||"Vehicle Delivery")+'</span></div>';
  return '<div class="bulk-row bulk-'+st+'" role="group" aria-label="Vehicle '+n+'">'+
   '<div class="bulk-num" aria-hidden="true">'+n+'</div>'+
   (r.excelRow!=null?'<div class="bulk-src">Excel row '+esc(r.excelRow)+'</div>':'')+
   inp("vehicle","Make and model",r.vehicle,"text","e.g. Ford Transit",true)+
   inp("reg","Registration",r.reg,"text","e.g. AB12 CDE",true)+
   inp("miles","Estimated miles",r.miles,"number",own?"0":shared.miles||"0",false)+
   inp("amount","Customer charge (£)",client?"":r.amount,"number",client?"Set by Operations":(own?"0":shared.amount||"0"),false,client,client?"Operations sets charges":"")+
   '<div class="bulk-state"><span class="badge '+CLS[st]+'">'+LABEL[st]+'</span>'+
   (st==="saved"&&r.reference?'<span class="bulk-ref">Ref '+esc(r.reference)+'</span>':'')+
   (msg?'<span class="bulk-msg'+(st==="failed"||(r.message&&st==="editing")?' bulk-err':'')+'">'+msg+'</span>':'')+'</div>'+
   '<button type="button" class="btn danger bulk-remove" aria-label="Remove vehicle '+n+'"'+dis+' onclick="BulkBooking.removeRow('+id+')">Remove</button>'+
   overview+details+
  '</div>';
 }).join("");
}
function summary(rows,busy){
 rows=rows||[];var c={saved:0,failed:0,uncertain:0,editing:0,saving:0},refs=[];
 rows.forEach(function(r){var s=LABEL[r.status]?r.status:"editing";c[s]++;if(s==="saved"&&r.reference)refs.push(r.reference);});
 var remaining=c.editing+c.saving+c.failed+c.uncertain,h='<div class="bulk-summary panel">';
 h+='<div class="bulk-counts"><span class="badge green">'+c.saved+' saved</span><span class="badge">'+remaining+' remaining</span><span class="badge red">'+c.failed+' failed</span><span class="badge amber">'+c.uncertain+' unknown</span>'+(busy?'<span class="badge amber">Saving in progress</span>':'')+'</div>';
 if(refs.length)h+='<p class="bulk-refs"><b>Saved references:</b> '+refs.map(esc).join(", ")+'</p>';
 if(c.saved&&(c.failed||c.uncertain||c.editing))h+='<p class="bulk-warn">Partial save: '+c.saved+' booking'+(c.saved===1?' was':'s were')+' created and will not be undone. Fix or retry the remaining vehicles only.</p>';
 if(c.failed)h+='<p class="bulk-warn">'+c.failed+' vehicle'+(c.failed===1?'':'s')+' failed. Check the row messages, correct and retry.</p>';
 if(c.uncertain)h+='<p class="bulk-warn">'+c.uncertain+' vehicle'+(c.uncertain===1?'':'s')+' may or may not have saved. Retry to reconcile before creating them again.</p>';
 return h+'<p class="muted bulk-note">Vehicles are saved individually, not as a single all-or-nothing transaction.</p></div>';
}
window.BulkBookingUI={shell:shell,renderRows:renderRows,summary:summary};
})();
