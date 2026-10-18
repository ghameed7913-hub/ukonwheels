(function(){
"use strict";
function esc(v){return String(v==null?"":v).replace(/[&<>"'`=\/]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","`":"&#96;","=":"&#61;","/":"&#47;"}[c];});}
function js(v){return esc(JSON.stringify(String(v==null?"":v)).replace(/</g,"\\u003c").replace(/>/g,"\\u003e"));}
var LABEL={editing:"Ready",saving:"Saving",saved:"Saved",failed:"Failed",uncertain:"Result unknown"};
var CLS={editing:"",saving:"amber",saved:"green",failed:"red",uncertain:"amber"};
function shell(){
 return '<div class="bulk-wrap">'+
 '<div class="bulk-intro"><b>Bulk booking</b><p class="muted">Every vehicle has all single-booking fields. Use the shared customer and journey above, or tick “Set separate details for this vehicle” to choose its own customer, addresses, service, dates, receiver, drop-off time and instructions. Miles and charge are per vehicle. Each vehicle saves as a separate booking, so some may save while others fail.</p></div>'+
 '<fieldset id="bulkBookingEditor" class="bulk-editor"><legend class="bulk-sr">Vehicles to book</legend>'+
 '<div id="bulkVehicleRows" class="bulk-rows"></div>'+
 '<div class="bulk-add"><button type="button" class="btn secondary" onclick="BulkBooking.addRow()">Add vehicle</button></div>'+
 '</fieldset>'+
 '<p id="bulkBookingStatus" class="bulk-status muted" role="status" aria-live="polite"></p>'+
 '<div id="bulkBookingResults" class="bulk-results"></div></div>';
}
function renderRows(rows,busy,shared,businesses,linkedOnly){
 rows=rows||[];
 shared=shared||{};businesses=businesses||[];
 if(!rows.length)return '<div class="bulk-empty muted">No vehicles added yet. Use Add vehicle to start.</div>';
 return rows.map(function(r,i){
  var st=LABEL[r.status]?r.status:"editing",n=i+1,lock=!!busy||st==="saving"||st==="saved"||st==="uncertain";
  var id=js(r.id),dis=lock?" disabled":"",pid="bulk-"+esc(r.id)+"-";
  function inp(f,label,val,type,ph,req){
   return '<label class="bulk-field bulk-f-'+f+'"><span>'+label+(req?' <i aria-hidden="true">*</i>':'')+'</span><input id="'+pid+f+'" type="'+type+'"'+(type==="number"?' min="0" step="any" inputmode="decimal"':'')+' value="'+esc(val)+'" placeholder="'+esc(ph)+'" aria-label="Vehicle '+n+' '+label+'"'+(req?' required aria-required="true"':'')+dis+' oninput="BulkBooking.updateRow('+id+',\''+f+'\',this.value)" onchange="BulkBooking.updateRow('+id+',\''+f+'\',this.value)"></label>';
  }
  var own=!!r.details,v=r.details||shared,detailDis=lock||!own?" disabled":"";
  function detail(f,label,type,req,options){
   var attrs=' id="'+pid+f+'" aria-label="Vehicle '+n+' '+label+'"'+detailDis+(req?' required aria-required="true"':'');
   var handler=' onchange="BulkBooking.updateDetail('+id+',\''+f+'\',this.value)"';
   var value=v[f]||"",field;
   if(options)field='<select'+attrs+handler+'>'+options.map(function(o){return '<option value="'+esc(o.value)+'"'+(String(o.value)===String(value)?' selected':'')+(o.disabled?' disabled':'')+'>'+esc(o.label)+'</option>';}).join("")+'</select>';
   else if(type==="textarea")field='<textarea'+attrs+' oninput="BulkBooking.updateDetail('+id+',\''+f+'\',this.value)"'+handler+'>'+esc(value)+'</textarea>';
   else field='<input'+attrs+' type="'+type+'" value="'+esc(value)+'" oninput="BulkBooking.updateDetail('+id+',\''+f+'\',this.value)"'+handler+'>';
   return '<label class="bulk-field'+(f==="notes"?' bulk-wide':'')+'"><span>'+label+(req?' <i aria-hidden="true">*</i>':'')+'</span>'+field+'</label>';
  }
  var choices=[{value:"",label:"Select Business"}].concat(businesses.filter(function(b){return String(b.accountType||"business").toLowerCase()==="business";}).map(function(b){
   var inactive=String(b.status||"Active").toLowerCase()!=="active",unlinked=linkedOnly&&!b.id;
   return {value:b.id||b.name,label:b.name+(inactive?" — inactive":unlinked?" — needs a linked business account":""),disabled:inactive||unlinked};
  }));
  if(v.biz&&!choices.some(function(b){return b.value===v.biz;}))choices.push({value:v.biz,label:"Selected business is unavailable",disabled:true});
  var details='<div class="bulk-details"><label class="bulk-separate"><input type="checkbox" aria-label="Vehicle '+n+' Set separate details for this vehicle"'+(own?' checked':'')+dis+' onchange="BulkBooking.setOwnDetails('+id+',this.checked)"><span>Set separate details for this vehicle</span></label>'+
   '<p class="muted bulk-detail-hint">'+(own?'These details belong to this vehicle only. Blank optional fields stay blank; blank miles and charge mean zero.':'Using the shared customer and journey above. Tick the box to edit all details separately. Blank miles and charge use the shared defaults.')+'</p>'+
   '<div class="bulk-detail-grid">'+
   detail("customerType","Customer type","select",true,[{value:"Business",label:"Business Customer"},{value:"Private",label:"Private Customer — Admin Only"}])+
   ((v.customerType||"Business")==="Private"?
    detail("privateCustomerName","Private customer name","text",true)+detail("privateCustomerMobile","Private customer mobile number","tel",false)+detail("privateCustomerEmail","Private Client portal email","email",true):
    detail("biz","Business","select",true,choices))+
   detail("pickup","Collection address","text",true)+detail("dest","Delivery address","text",true)+
   detail("service","Service type","select",false,[{value:"Vehicle Delivery",label:"Vehicle Delivery"},{value:"Vehicle Collection & Delivery",label:"Vehicle Collection & Delivery"},{value:"Recovery / AA",label:"Recovery / AA"}])+
   detail("bdate","Booking date","date",false)+detail("ddate","Requested delivery date","date",false)+
   detail("receiver","Person receiving vehicle","text",true)+detail("mobile","Receiver mobile number","tel",true)+
   detail("dropoff","Latest drop-off time","time",false)+detail("notes","Special instructions","textarea",false)+
   '</div></div>';
  var msg=r.message?esc(r.message):(st==="uncertain"?"Server result unknown. Retry to reconcile before editing.":"");
  return '<div class="bulk-row bulk-'+st+'" role="group" aria-label="Vehicle '+n+'">'+
   '<div class="bulk-num" aria-hidden="true">'+n+'</div>'+
   inp("vehicle","Make and model",r.vehicle,"text","e.g. Ford Transit",true)+
   inp("reg","Registration",r.reg,"text","e.g. AB12 CDE",true)+
   inp("miles","Estimated miles",r.miles,"number",own?"0":shared.miles||"0",false)+
   inp("amount","Customer charge (£)",r.amount,"number",own?"0":shared.amount||"0",false)+
   '<div class="bulk-state"><span class="badge '+CLS[st]+'">'+LABEL[st]+'</span>'+
   (st==="saved"&&r.reference?'<span class="bulk-ref">Ref '+esc(r.reference)+'</span>':'')+
   (msg?'<span class="bulk-msg">'+msg+'</span>':'')+'</div>'+
   '<button type="button" class="btn danger bulk-remove" aria-label="Remove vehicle '+n+'"'+dis+' onclick="BulkBooking.removeRow('+id+')">Remove</button>'+details+
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
