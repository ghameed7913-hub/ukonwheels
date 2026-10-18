(function(){
"use strict";
var MAX=200;
function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function gbp(n){n=Number(n);if(!isFinite(n))n=0;return "£"+n.toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});}
var H="var r=this.closest('[data-bulk-key]');if(r&&window.ExpenseBulk)ExpenseBulk.update(r.dataset.bulkKey,this.dataset.bulkField,this.value)";
function opts(list,sel,placeholder){
  var o=placeholder?'<option value="">'+esc(placeholder)+'</option>':"",found=!sel;
  (list||[]).forEach(function(x){if(String(x)===String(sel))found=true;o+='<option value="'+esc(x)+'"'+(String(x)===String(sel)?" selected":"")+'>'+esc(x)+'</option>';});
  if(!found)o+='<option value="'+esc(sel)+'" selected>'+esc(sel)+'</option>';
  return o;
}
function field(id,label,ctrl,cls){return '<div class="ebField'+(cls?" "+cls:"")+'"><label for="'+id+'">'+label+'</label>'+ctrl+'</div>';}
function row(r,i,s,locked,canRemove){
  var dis=locked?" disabled":"",err=(s.errors||{})[r.key],p="eb"+i+"_",inv=err?' aria-invalid="true" aria-describedby="'+p+'err"':"";
  var ev=' oninput="'+H+'" onchange="'+H+'"'+dis+inv;
  return '<div class="ebRow'+(err?" hasError":"")+'" data-bulk-key="'+esc(r.key)+'" role="group" aria-label="Expense '+(i+1)+'">'+
  '<div class="ebRowHead"><span class="ebNum">Expense '+(i+1)+'</span>'+
  '<button type="button" class="btn danger ebRemove" onclick="var r=this.closest(\'[data-bulk-key]\');if(r)ExpenseBulk.removeRow(r.dataset.bulkKey)"'+(locked||!canRemove?" disabled":"")+' aria-label="Remove expense '+(i+1)+'">Remove</button></div>'+
  '<div class="ebGrid">'+
  field(p+"date","Date *",'<input id="'+p+'date" type="date" data-bulk-field="date" value="'+esc(r.date)+'"'+ev+'>')+
  field(p+"cat","Expense Type *",'<select id="'+p+'cat" data-bulk-field="category"'+ev+'>'+opts(s.categories,r.category,"Select type")+'</select>')+
  field(p+"amt","Amount (£) *",'<input id="'+p+'amt" type="number" step="0.01" min="0" inputmode="decimal" data-bulk-field="amount" value="'+esc(r.amount)+'"'+ev+'>')+
  field(p+"met","Method",'<select id="'+p+'met" data-bulk-field="method"'+ev+'>'+opts(s.methods,r.method,"")+'</select>')+
  field(p+"ref","Receipt / Reference",'<input id="'+p+'ref" data-bulk-field="reference" value="'+esc(r.reference)+'"'+ev+'>')+
  field(p+"pay","Supplier / Paid To",'<input id="'+p+'pay" data-bulk-field="payee" value="'+esc(r.payee)+'"'+ev+'>')+
  field(p+"notes","Notes",'<textarea id="'+p+'notes" rows="2" data-bulk-field="notes"'+ev+'>'+esc(r.notes)+'</textarea>',"ebWide")+
  '</div>'+(err?'<div class="ebErr" id="'+p+'err" role="alert">'+esc(err)+'</div>':"")+'</div>';
}
function render(s){
  s=s||{};var rows=s.rows||[];
  if(!s.canManage)return "";
  if(!s.open){
    return '<div class="expenseBulk ebClosed panel"><div><strong>Several receipts to enter?</strong><span class="muted"> Add multiple expenses and save them together.</span></div>'+
    (s.success?'<div class="ebOk" role="status">'+esc(s.success)+'</div>':"")+
    '<button type="button" class="btn secondary" onclick="ExpenseBulk.open()">Bulk Expense</button></div>';
  }
  var locked=!!(s.saving||s.uncertain),n=rows.length,atMax=n>=MAX;
  var h='<div class="expenseBulk panel" aria-busy="'+(s.saving?"true":"false")+'">'+
  '<div class="ebHead"><div><h3>Bulk Expense</h3><p class="muted">Enter up to '+MAX+' expenses. Fields marked * are required.</p></div>'+
  '<button type="button" class="btn secondary" onclick="ExpenseBulk.close()"'+(locked?" disabled":"")+'>Close</button></div>';
  if(s.uncertain)h+='<div class="ebWarn" role="alert"><strong>Save not confirmed.</strong> The previous save may not have completed. This batch is kept exactly as entered — retry to confirm before making changes.</div>';
  if(s.error)h+='<div class="ebBatchErr" role="alert">'+esc(s.error)+'</div>';
  if(s.success)h+='<div class="ebOk" role="status">'+esc(s.success)+'</div>';
  h+='<div class="ebRows">'+rows.map(function(r,i){return row(r,i,s,locked,n>1);}).join("")+'</div>';
  h+='<div class="ebFoot"><button type="button" class="btn secondary" onclick="ExpenseBulk.addRow()"'+(locked||atMax?" disabled":"")+'>Add row</button>'+
  (atMax?'<span class="muted ebLimit">Maximum of '+MAX+' rows reached.</span>':"")+
  '<div class="ebSum" aria-live="polite"><span>'+n+' expense'+(n===1?"":"s")+'</span><span>Total <strong data-bulk-total>'+gbp(s.total)+'</strong></span></div>'+
  (s.uncertain?'<button type="button" class="btn warn" onclick="ExpenseBulk.save()"'+(s.saving?" disabled":"")+'>'+(s.saving?"Retrying…":"Retry save")+'</button>':
  '<button type="button" class="btn primary" onclick="ExpenseBulk.save()"'+(s.saving||!n?" disabled":"")+'>'+(s.saving?"Saving…":"Save All")+'</button>')+
  '</div></div>';
  return h;
}
window.ExpenseBulkUI={render:render};
})();
