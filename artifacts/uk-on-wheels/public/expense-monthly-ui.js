(function(){
"use strict";
var esc=function(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});};
var gbp=function(n){return "£"+(Number(n)||0).toLocaleString("en-GB",{minimumFractionDigits:2,maximumFractionDigits:2});};
var DATE=/^\d{4}-\d{2}-\d{2}$/,MONTH=/^\d{4}-\d{2}$/;
var WD=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
function render(s){
  s=s||{};var lock=!!s.locked,dis=lock?" disabled":"",days=s.days||[],sel=DATE.test(s.day||"")?s.day:"";
  var month=MONTH.test(s.month||"")?s.month:"";
  var opts=(s.availableMonths||[]).filter(function(m){return MONTH.test(m.value);}).map(function(m){
    return '<option value="'+m.value+'"'+(m.value===month?" selected":"")+'>'+esc(m.label)+'</option>';}).join("");
  var cells="",fd=Math.max(0,Math.min(6,Number(s.firstDay)||0));
  for(var i=0;i<fd;i++)cells+='<span class="emPad" aria-hidden="true"></span>';
  days.forEach(function(d){
    if(!DATE.test(d.date))return;
    var isT=d.date===s.today,isS=d.date===sel,c=Number(d.count)||0;
    var cls="emDay"+(isT?" isToday":"")+(isS?" isSel":"")+(c?" hasItems":"");
    var lbl=esc(d.date)+(isT?", today":"")+": "+c+" expense"+(c===1?"":"s")+(c?", "+gbp(d.total):"");
    cells+='<button type="button" class="'+cls+'" aria-pressed="'+isS+'"'+(isT?' aria-current="date"':'')+' aria-label="'+lbl+'" onclick="ExpenseMonth.selectDay(\''+d.date+'\')"'+dis+'>'+
      '<span class="emNum">'+(Number(d.number)||"")+'</span>'+
      (c?'<span class="emCount">'+c+'</span><span class="emAmt">'+esc(gbp(d.total))+'</span>':'')+'</button>';
  });
  var filter=sel?'<div class="emFilter"><span>Showing <strong>'+esc(sel)+'</strong> · '+(Number(s.visibleCount)||0)+' entr'+(s.visibleCount===1?"y":"ies")+' · '+esc(gbp(s.visibleTotal))+'</span><button type="button" class="btn emAll" onclick="ExpenseMonth.allDays()"'+dis+'>All days</button></div>':'';
  var empty=!(Number(s.monthCount)>0)?'<p class="emEmpty">No expenses recorded for '+esc(s.title)+' yet.'+(s.canManage?' Pick a date and add receipts below.':'')+'</p>':'';
  return '<section class="panel expenseMonth'+(lock?' emLocked':'')+'" aria-label="Monthly expenses"'+(lock?' aria-busy="true"':'')+'>'+
   '<div class="emHead"><div class="emTitle"><h2>'+esc(s.title)+'</h2><p class="emSum"><strong>'+(Number(s.monthCount)||0)+'</strong> entries · <strong>'+esc(gbp(s.monthTotal))+'</strong></p></div>'+
   '<div class="emNav"><button type="button" class="btn emArrow" aria-label="Previous month" onclick="ExpenseMonth.shiftMonth(-1)"'+dis+'>&lsaquo;</button>'+
   '<label class="emField"><span>Month</span><input type="month" value="'+month+'" onchange="ExpenseMonth.selectMonth(this.value)"'+dis+'></label>'+
   '<button type="button" class="btn emArrow" aria-label="Next month" onclick="ExpenseMonth.shiftMonth(1)"'+dis+'>&rsaquo;</button>'+
   '<button type="button" class="btn emToday" onclick="ExpenseMonth.thisMonth()"'+dis+'>This month</button>'+
   (opts?'<label class="emField"><span>Saved months</span><select onchange="ExpenseMonth.selectMonth(this.value)"'+dis+'>'+opts+'</select></label>':'')+'</div></div>'+
   (s.rolloverNotice?'<p class="emNotice" role="status">'+esc(s.rolloverNotice)+'</p>':'')+
   (lock?'<p class="emNotice" role="status">A save is awaiting confirmation. Month and date are locked until the result is confirmed.</p>':'')+
   '<details class="emCal" open><summary>Calendar'+(s.entryDate?' · entry date '+esc(s.entryDate):'')+'</summary>'+
   '<div class="emGrid" role="group" aria-label="Days in '+esc(s.title)+'">'+WD.map(function(w){return '<span class="emWd" aria-hidden="true">'+w+'</span>';}).join("")+cells+'</div></details>'+
   filter+empty+'</section>';
}
window.ExpenseMonthUI={render:render};
})();
