(function(){
"use strict";
function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function num(n){n=Number(n);return isFinite(n)?n:0;}
function gbp(n){return "£"+Math.abs(num(n)).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});}
function isBlank(v){return v==null||String(v).trim()==="";}
function profitHtml(p,sold){
  if(!sold||p==null||!isFinite(Number(p)))return '<span class="vtProfit vtNone">Not sold</span>';
  p=Math.round(Number(p)*100)/100;
  if(p>0)return '<span class="vtProfit vtGain">+'+gbp(p)+'</span>';
  if(p<0)return '<span class="vtProfit vtLoss">-'+gbp(p)+'</span>';
  return '<span class="vtProfit vtEven">Break even</span>';
}
var H="if(window.VehicleTrading)VehicleTrading.update(this.dataset.tradeField,this.value)";
var IDH="var r=this.closest('[data-trade-id]');if(r&&window.VehicleTrading)VehicleTrading.";
function opts(list,sel){var o="",found=false;list.forEach(function(x){var s=String(x[0])===String(sel==null?"":sel);if(s)found=true;o+='<option value="'+esc(x[0])+'"'+(s?" selected":"")+'>'+esc(x[1])+'</option>';});if(!found&&!isBlank(sel))o+='<option value="'+esc(sel)+'" selected>'+esc(sel)+'</option>';return o;}
function fld(s,key,label,ctrl,cls,hint){
  var err=(s.errors||{})[key],id="vt_"+key;
  return '<div class="vtField'+(cls?" "+cls:"")+(err?" vtHasErr":"")+'"><label for="'+id+'"'+(key==="sellerName"?" data-trade-seller-label":"")+'>'+label+'</label>'+ctrl+(hint?'<small class="vtHint">'+esc(hint)+'</small>':"")+(err?'<div class="vtFieldErr" id="'+id+'_err" role="alert">'+esc(err)+'</div>':"")+'</div>';
}
function attrs(s,key,locked){var err=(s.errors||{})[key];return ' id="vt_'+key+'" data-trade-field="'+key+'" oninput="'+H+'" onchange="'+H+'"'+(locked?" disabled":"")+(err?' aria-invalid="true" aria-describedby="vt_'+key+'_err"':"");}
function inp(s,d,key,locked,type,extra){return '<input type="'+(type||"text")+'" value="'+esc(d[key])+'"'+(extra||"")+attrs(s,key,locked)+'>';}
function money(s,d,key,locked){return '<div class="vtMoney"><span aria-hidden="true">£</span>'+inp(s,d,key,locked,"number",' step="0.01" min="0" inputmode="decimal"')+'</div>';}
function sellerLabel(src){return src==="auction"?"Auction name *":"Private seller name *";}
function srcLabel(src){return src==="auction"?"Auction":"Private";}
function fmtDate(d){if(!d)return "";var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));return m?m[3]+"/"+m[2]+"/"+m[1]:String(d);}

function summary(d,s){
  var t=s.totals||{};
  return '<div class="vtSummary"><div><span class="vtLbl">Vehicle</span><strong class="vtReg">'+esc(d.registration)+'</strong> '+esc(d.make)+' '+esc(d.model)+'</div>'+
  '<div><span class="vtLbl">Bought</span>'+esc(fmtDate(d.purchaseDate))+' ('+esc(s.day||"")+') from '+esc(srcLabel(d.purchaseSource))+': '+esc(d.sellerName)+'</div>'+
  '<div><span class="vtLbl">Mileage</span>'+esc(d.mileage)+'</div>'+
  '<div><span class="vtLbl">Service / Log book</span>'+esc(d.serviceHistory)+' / '+esc(d.logBook)+'</div>'+
  '<div class="vtCostLine"><span>Purchase '+gbp(d.purchaseAmount)+'</span><span>Fuel '+gbp(d.fuel)+'</span><span>MOT '+gbp(d.motCharges)+'</span><span>Road tax '+gbp(d.roadTax)+'</span><span>Auction '+gbp(d.auctionCharges)+'</span></div>'+
  '<div><span class="vtLbl">Total cost</span><strong data-trade-total>'+gbp(t.totalCost)+'</strong></div></div>';
}

function form(s){
  var d=s.draft,locked=!!(s.saving||s.uncertain||s.conflict),sale=!!s.editingSale,t=s.totals||{};
  var title=sale?"Record sale":(d.version>0?"Edit purchase":"New purchase");
  var h='<section class="vtForm panel" aria-busy="'+(s.saving?"true":"false")+'" aria-labelledby="vtFormTitle"><div class="vtHead"><div><h3 id="vtFormTitle">'+title+'</h3><p class="muted">'+(sale?"Enter the sale amount. Enter 0 if it sold for nothing.":"Fields marked * are required. Optional costs default to £0.00.")+'</p></div></div>';
  if(sale){
    h+=summary(d,s)+'<div class="vtGrid">'+fld(s,"soldFor","Sold for (£) *",money(s,d,"soldFor",locked))+'</div>';
  } else {
    h+='<fieldset class="vtSet"><legend>Purchase</legend><div class="vtGrid">'+
    fld(s,"purchaseDate","Purchase date *",inp(s,d,"purchaseDate",locked,"date"))+
    '<div class="vtField"><span class="vtLblTop">Day</span><div class="vtRead" data-trade-day aria-live="polite">'+esc(s.day||"-")+'</div></div>'+
    fld(s,"purchaseSource","Purchase source *",'<select'+attrs(s,"purchaseSource",locked)+'>'+opts([["private","Private"],["auction","Auction"]],d.purchaseSource)+'</select>')+
    fld(s,"sellerName",sellerLabel(d.purchaseSource),inp(s,d,"sellerName",locked))+
    '</div></fieldset><fieldset class="vtSet"><legend>Vehicle</legend><div class="vtGrid">'+
    fld(s,"registration","Registration *",inp(s,d,"registration",locked,"text",' autocapitalize="characters" class="vtRegIn"'))+
    fld(s,"make","Make *",inp(s,d,"make",locked))+
    fld(s,"model","Model *",inp(s,d,"model",locked))+
    fld(s,"mileage","Mileage *",inp(s,d,"mileage",locked,"number",' step="1" min="0" inputmode="numeric"'))+
    fld(s,"serviceHistory","Service history *",'<select'+attrs(s,"serviceHistory",locked)+'>'+opts([["","Select"],["Full","Full"],["Partial","Partial"],["None","None"],["Unknown","Unknown"]],d.serviceHistory)+'</select>')+
    fld(s,"logBook","Log book *",'<select'+attrs(s,"logBook",locked)+'>'+opts([["","Select"],["Yes","Yes"],["No","No"],["Awaiting","Awaiting"]],d.logBook)+'</select>')+
    '</div></fieldset><fieldset class="vtSet"><legend>Costs</legend><div class="vtGrid">'+
    fld(s,"purchaseAmount","Purchase amount (£) *",money(s,d,"purchaseAmount",locked))+
    fld(s,"fuel","Fuel (£)",money(s,d,"fuel",locked))+
    fld(s,"motCharges","MOT charges (£)",money(s,d,"motCharges",locked))+
    fld(s,"roadTax","Road tax (£)",money(s,d,"roadTax",locked))+
    fld(s,"auctionCharges","Auction charges (£)",money(s,d,"auctionCharges",locked),"","Optional for either source; usually 0 for private.")+
    fld(s,"soldFor","Sold for (£)",money(s,d,"soldFor",locked),"","Leave blank if unsold. Enter 0 if sold at zero.")+
    '</div></fieldset>';
  }
  var sold=!isBlank(d.soldFor);
  h+='<div class="vtTotals" aria-live="polite"><div><span class="vtLbl">Total cost</span><strong data-trade-total>'+gbp(t.totalCost)+'</strong></div><div><span class="vtLbl">Profit</span><strong data-trade-profit>'+profitHtml(t.profit,sold&&t.profit!=null)+'</strong></div></div>';
  if(s.conflict)h+='<div class="vtWarn" role="alert"><strong>This record changed elsewhere.</strong> Your edits are kept but cannot be saved over the newer version. Reload the latest copy to continue.<div class="vtActs"><button type="button" class="btn warn" onclick="VehicleTrading.recover()"'+(s.saving?" disabled":"")+'>Recover / reload latest</button></div></div>';
  if(s.uncertain)h+='<div class="vtWarn" role="alert"><strong>Save not confirmed.</strong> The previous save may not have completed. Your entry is kept exactly as sent; retry to confirm.</div>';
  h+='<div class="vtFoot"><button type="button" class="btn secondary" onclick="VehicleTrading.cancelEdit()"'+(s.saving||s.uncertain?" disabled":"")+'>Cancel</button>';
  if(s.uncertain)h+='<button type="button" class="btn warn" onclick="VehicleTrading.save()"'+(s.saving?" disabled":"")+'>'+(s.saving?"Retrying...":"Retry save")+'</button>';
  else h+='<button type="button" class="btn primary" onclick="VehicleTrading.save()"'+(locked?" disabled":"")+'>'+(s.saving?"Saving...":(sale?"Save sale":"Save purchase"))+'</button>';
  return h+'</div></section>';
}

function rowHtml(r,s,locked){
  var sold=!isBlank(r.soldFor),id=esc(r.id);
  var acts="";
  if(s.canManage){
    acts='<div class="vtRowActs">'+(s.page==="buying"||!sold?'':'')+
    '<button type="button" class="btn secondary vtSm" onclick="'+IDH+'edit(r.dataset.tradeId)"'+(locked?" disabled":"")+' aria-label="Edit '+esc(r.registration)+'">Edit</button>'+
    '<button type="button" class="btn primary vtSm" onclick="'+IDH+'recordSale(r.dataset.tradeId)"'+(locked?" disabled":"")+' aria-label="'+(sold?"Edit sale":"Record sale")+' for '+esc(r.registration)+'">'+(sold?"Edit sale":"Record sale")+'</button></div>';
  }
  return '<tr data-trade-id="'+id+'">'+
  '<td><div>'+esc(fmtDate(r.purchaseDate))+'</div><small class="muted">'+esc(r.day)+'</small></td>'+
  '<td><div>'+esc(srcLabel(r.purchaseSource))+'</div><small class="muted">'+esc(r.sellerName)+'</small></td>'+
  '<td><strong class="vtReg">'+esc(r.registration)+'</strong><div>'+esc(r.make)+' '+esc(r.model)+'</div></td>'+
  '<td class="vtNum">'+esc(num(r.mileage).toLocaleString("en-GB"))+'</td>'+
  '<td><div>Service: '+esc(r.serviceHistory)+'</div><small class="muted">Log book: '+esc(r.logBook)+'</small></td>'+
  '<td class="vtCosts"><div>Buy '+gbp(r.purchaseAmount)+'</div><small class="muted">Fuel '+gbp(r.fuel)+' / MOT '+gbp(r.motCharges)+' / Tax '+gbp(r.roadTax)+' / Auction '+gbp(r.auctionCharges)+'</small></td>'+
  '<td class="vtNum"><strong>'+gbp(r.totalCost)+'</strong></td>'+
  '<td class="vtNum">'+(sold?gbp(r.soldFor):'<span class="muted">-</span>')+'</td>'+
  '<td class="vtNum">'+profitHtml(r.profit,sold)+'</td>'+
  (s.canManage?'<td>'+acts+'</td>':'')+'</tr>';
}

function list(s,locked){
  var rows=s.rows||[],h='<section class="vtList panel"><div class="vtListHead"><h3>'+(s.page==="selling"?"Stock and sold ledger":"Purchase register")+'</h3>'+
  '<label class="vtSearch" for="vt_query"><span class="sr-only">Search vehicles</span><input id="vt_query" type="search" placeholder="Search reg, make, model, seller" value="'+esc(s.query)+'" oninput="if(window.VehicleTrading)VehicleTrading.setQuery(this.value)"></label></div>';
  if(s.loading&&!rows.length){
    h+='<div class="vtSkel" aria-busy="true" aria-label="Loading vehicles"><span></span><span></span><span></span></div>';
  } else if(s.error&&!rows.length){
    h+='<div class="vtEmpty" role="alert"><strong>Could not load vehicles.</strong><p>'+esc(s.error)+'</p><button type="button" class="btn secondary" onclick="VehicleTrading.reload()"'+(locked?" disabled":"")+'>Retry</button></div>';
  } else if(!rows.length){
    h+='<div class="vtEmpty"><strong>'+(isBlank(s.query)?"No vehicles recorded yet.":"No vehicles match this search.")+'</strong><p class="muted">'+(isBlank(s.query)?(s.canManage?"Record a purchase to start the register.":"Vehicles will appear here once recorded."):"Try a different registration, make, model or seller.")+'</p></div>';
  } else {
    var sold=0,stock=0,pr=0;rows.forEach(function(r){if(isBlank(r.soldFor))stock++;else{sold++;pr+=num(r.profit);}});
    h+='<div class="vtStats"><span>'+rows.length+' vehicle'+(rows.length===1?"":"s")+'</span><span>'+stock+' in stock</span><span>'+sold+' sold</span><span>Realised '+profitHtml(pr,sold>0)+'</span></div>';
    h+='<div class="vtScroll" tabindex="0" role="region" aria-label="Vehicle records"><table class="vtTable"><thead><tr><th>Date</th><th>Source</th><th>Vehicle</th><th>Mileage</th><th>History</th><th>Costs</th><th>Total</th><th>Sold for</th><th>Profit</th>'+(s.canManage?'<th><span class="sr-only">Actions</span></th>':'')+'</tr></thead><tbody>'+rows.map(function(r){return rowHtml(r,s,locked);}).join("")+'</tbody></table></div>';
  }
  return h+'</section>';
}

function render(s){
  s=s||{};
  var locked=!!(s.saving||s.uncertain),editable=s.canManage&&s.draft;
  var h='<div class="vehicleTrading"><div class="vtTop"><div><h2>'+(s.page==="selling"?"Vehicle Selling":"Vehicle Buying")+'</h2><p class="muted">'+(s.page==="selling"?"Stock on hand, sales and realised profit.":"Record purchases and running costs.")+'</p></div><div class="vtActs">'+
  '<button type="button" class="btn secondary" onclick="VehicleTrading.reload()"'+(locked||s.loading?" disabled":"")+'>'+(s.loading?"Loading...":"Reload")+'</button>'+
  (s.canManage?'<button type="button" class="btn primary" onclick="VehicleTrading.newPurchase()"'+(locked?" disabled":"")+'>New purchase</button>':'')+'</div></div>';
  if(s.success)h+='<div class="vtOk" role="status">'+esc(s.success)+'</div>';
  if(s.error&&(editable||(s.rows||[]).length))h+='<div class="vtErr" role="alert">'+esc(s.error)+'</div>';
  if(!s.canManage)h+='<p class="muted vtView">View only. Ask an Admin or Accounts manager to make changes.</p>';
  if(editable)h+=form(s);
  return h+list(s,locked)+'</div>';
}
window.VehicleTradingUI={render:render};
})();
