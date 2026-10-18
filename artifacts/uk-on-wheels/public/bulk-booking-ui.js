(function(){
"use strict";
function esc(v){return String(v==null?"":v).replace(/[&<>"'`=\/]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;","`":"&#96;","=":"&#61;","/":"&#47;"}[c];});}
function js(v){return esc(JSON.stringify(String(v==null?"":v)).replace(/</g,"\\u003c").replace(/>/g,"\\u003e"));}
var LABEL={editing:"Ready",saving:"Saving",saved:"Saved",failed:"Failed",uncertain:"Result unknown"};
var CLS={editing:"",saving:"amber",saved:"green",failed:"red",uncertain:"amber"};
function shell(){
 return '<div class="bulk-wrap">'+
 '<div class="bulk-intro"><b>Bulk booking</b><p class="muted">Customer, collection and delivery addresses, service, dates, receiver and notes above are shared by every vehicle below. Enter each vehicle and registration. Miles and charge are optional per vehicle; leave blank to use the shared Miles and Charge fields. Each vehicle is saved as its own booking, so some may save while others fail.</p></div>'+
 '<fieldset id="bulkBookingEditor" class="bulk-editor"><legend class="bulk-sr">Vehicles to book</legend>'+
 '<div id="bulkVehicleRows" class="bulk-rows"></div>'+
 '<div class="bulk-add"><button type="button" class="btn secondary" onclick="BulkBooking.addRow()">Add vehicle</button></div>'+
 '</fieldset>'+
 '<p id="bulkBookingStatus" class="bulk-status muted" role="status" aria-live="polite"></p>'+
 '<div id="bulkBookingResults" class="bulk-results"></div></div>';
}
function renderRows(rows,busy){
 rows=rows||[];
 if(!rows.length)return '<div class="bulk-empty muted">No vehicles added yet. Use Add vehicle to start.</div>';
 return rows.map(function(r,i){
  var st=LABEL[r.status]?r.status:"editing",n=i+1,lock=!!busy||st==="saving"||st==="saved"||st==="uncertain";
  var id=js(r.id),dis=lock?" disabled":"",pid="bulk-"+esc(r.id)+"-";
  function inp(f,label,val,type,ph,req){
   return '<label class="bulk-field bulk-f-'+f+'"><span>'+label+(req?' <i aria-hidden="true">*</i>':'')+'</span><input id="'+pid+f+'" type="'+type+'"'+(type==="number"?' min="0" step="any" inputmode="decimal"':'')+' value="'+esc(val)+'" placeholder="'+esc(ph)+'" aria-label="Vehicle '+n+' '+label+'"'+(req?' required aria-required="true"':'')+dis+' oninput="BulkBooking.updateRow('+id+',\''+f+'\',this.value)" onchange="BulkBooking.updateRow('+id+',\''+f+'\',this.value)"></label>';
  }
  var msg=r.message?esc(r.message):(st==="uncertain"?"Server result unknown. Retry to reconcile before editing.":"");
  return '<div class="bulk-row bulk-'+st+'" role="group" aria-label="Vehicle '+n+'">'+
   '<div class="bulk-num" aria-hidden="true">'+n+'</div>'+
   inp("vehicle","Make and model",r.vehicle,"text","e.g. Ford Transit",true)+
   inp("reg","Registration",r.reg,"text","e.g. AB12 CDE",true)+
   inp("miles","Miles",r.miles,"number","Shared",false)+
   inp("amount","Charge (£)",r.amount,"number","Shared",false)+
   '<div class="bulk-state"><span class="badge '+CLS[st]+'">'+LABEL[st]+'</span>'+
   (st==="saved"&&r.reference?'<span class="bulk-ref">Ref '+esc(r.reference)+'</span>':'')+
   (msg?'<span class="bulk-msg">'+msg+'</span>':'')+'</div>'+
   '<button type="button" class="btn danger bulk-remove" aria-label="Remove vehicle '+n+'"'+dis+' onclick="BulkBooking.removeRow('+id+')">Remove</button>'+
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
