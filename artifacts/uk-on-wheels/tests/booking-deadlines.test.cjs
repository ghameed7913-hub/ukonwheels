const {test}=require("node:test");
const assert=require("node:assert/strict");
const vm=require("node:vm"),fs=require("node:fs"),path=require("node:path");
const ctx=vm.createContext({Intl,Date,Set});
vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/booking-deadlines.js"),"utf8"),ctx);
const api=ctx.BookingDeadlines;
const booking={status:"Picked Up",deliveryDate:"2026-11-01"};
test("red Delayed alert starts a calendar day before delivery",()=>{
 assert.equal(api.state(booking,"2026-10-30"),null);
 assert.equal(api.state(booking,"2026-10-31").label,"Delayed");
 assert.equal(api.state(booking,"2026-10-31").detail,"delivery due tomorrow");
 assert.equal(booking.status,"Picked Up","actual journey status must not be overwritten");
});
test("today and overdue stay red until delivered or cancelled",()=>{
 assert.equal(api.state(booking,"2026-11-01").detail,"delivery due today");
 assert.equal(api.state(booking,"2026-11-02").detail,"delivery overdue");
 for(const status of ["Delivered","Cancelled","Deleted"]){
  assert.equal(api.state({...booking,status},"2026-11-02"),null);
 }
 assert.equal(api.state({...booking,_deliveredAt:"2026-11-01"},"2026-11-02"),null);
});
test("uncollected vehicles are never marked as delayed deliveries",()=>{
 for(const status of ["New Booked Vehicle","Driver Assigned"]){
  assert.equal(api.state({...booking,status},"2026-11-02"),null);
 }
 assert.equal(api.state({...booking,status:"Driver Assigned",_pickedUpAt:"2026-10-31"},"2026-10-31").label,"Delayed");
 assert.equal(api.state({...booking,status:"Driver Assigned",_journeyStartedAt:"2026-10-31"},"2026-10-31").label,"Delayed");
});
test("all in-progress journey statuses retain their real status",()=>{
 for(const status of ["On Route","Delayed","Accident","Claims","Fault On Route","Assigned AA on Route"]){
  const b={...booking,status};
  assert.equal(api.state(b,"2026-10-31").label,"Delayed");
  assert.equal(b.status,status);
 }
});
test("moving a delivery date removes the action alert; missing and invalid dates do not mark vehicles",()=>{
 assert.equal(api.state({...booking,deliveryDate:"2026-11-08"},"2026-10-31"),null);
 for(const deliveryDate of ["","bad","2026-02-30","01/11/2026"]){
  assert.equal(api.state({...booking,deliveryDate},"2026-10-31"),null);
 }
});
test("calendar uses UK dates through summer time and DST boundaries",()=>{
 assert.equal(api.londonDay(new Date("2026-06-01T23:30:00Z")),"2026-06-02");
 assert.equal(api.londonDay(new Date("2026-10-24T23:30:00Z")),"2026-10-25");
 assert.equal(api.londonDay(new Date("2026-10-25T23:30:00Z")),"2026-10-25");
 assert.equal(api.londonDay(new Date("2026-12-31T23:30:00Z")),"2026-12-31");
});
function portalFixture(){
 class Element{
  constructor(tag,text=""){this.tagName=tag.toUpperCase();this.value=text;this.children=[];this.dataset={};this.className=""}
  get textContent(){return this.value+this.children.map(x=>x.textContent).join("")}
  set textContent(s){this.value=s;this.children=[]}
  get childNodes(){return this.children}
  get cells(){return this.tagName==="TR"?this.children:undefined}
  get classList(){const self=this;return {contains:c=>self.className.split(" ").includes(c),
   remove:c=>{self.className=self.className.split(" ").filter(x=>x!==c).join(" ")},
   toggle:(c,on)=>{const set=new Set(self.className.split(" ").filter(Boolean));if(on)set.add(c);else set.delete(c);self.className=[...set].join(" ")}}}
  append(e){e.parentElement=this;this.children.push(e)}
  prepend(e){e.parentElement=this;this.children.unshift(e)}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(e=>e!==this)}
  all(){return this.children.flatMap(e=>[e,...e.all()])}
  querySelectorAll(s){
   if(s.startsWith("[data-"))return [];
   return this.all().filter(e=>s.split(",").some(v=>v[0]==="."?e.classList.contains(v.slice(1)):e.tagName===v.toUpperCase()));
  }
  querySelector(s){return this.querySelectorAll(s)[0]||null}
  addEventListener(){}
 }
 const body=new Element("body"),host=new Element("main");host.id="content";body.append(host);
 const row=new Element("tr"),cell=new Element("td");cell.append(new Element("#text","UKOW12345"));row.append(cell);host.append(row);
 const card=new Element("button");card.className="driverJobSelect";card.dataset.bookingRef="UKOW12345";
 const top=new Element("span"),pill=new Element("span","UKOW12345");pill.className="driverPill";top.append(pill);card.append(top);host.append(card);
 let ready,interval,calls=0,resolve;
 const b={ref:"UKOW12345",status:"Picked Up",deliveryDate:"2026-11-01"};
 const doc={body,readyState:"loading",createElement:t=>new Element(t),
  getElementById:id=>body.all().find(e=>e.id===id),
  querySelectorAll:s=>body.querySelectorAll(s),
  addEventListener:(name,fn)=>{if(name==="DOMContentLoaded")ready=fn}};
 class Clock extends Date{constructor(...args){super(...(args.length?args:["2026-10-31T12:00:00Z"]))}static now(){return Date.parse("2026-10-31T12:00:00Z")}}
 const context=vm.createContext({Date:Clock,Intl,Set,Map,document:doc,role:"admin",
  currentSession:{user:{id:"admin"},access_token:"session-a"},getStore:()=>({bookings:[b]}),
  setInterval:fn=>{interval=fn},setTimeout:()=>{},MutationObserver:class{observe(){}},
  sb:{rpc:async()=>{calls++;return new Promise(r=>{resolve=r})}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,"../public/booking-deadlines.js"),"utf8"),context);
 return {context,row,card,host,b,start:()=>ready(),tick:()=>interval(),calls:()=>calls,
  respond:()=>resolve({data:{today:"2026-10-31",notifications:[{title:"Delivery due tomorrow",reference:b.ref,message:"Action required"}],
   urgent:[{reference:b.ref,requested_delivery_date:b.deliveryDate,vehicle_registration:"AB12 CDE"}]}})};
}
test("Admin table and native Driver cards stay red across redraws, clear on delivery and clear on sign-out",async()=>{
 const f=portalFixture();f.start();f.respond();await new Promise(setImmediate);
 assert.equal(f.calls(),1);
 assert.match(f.host.querySelector("section").innerHTML,/Delivery due tomorrow/);
 for(let n=0;n<3;n++){
  f.tick();
  assert.equal(f.row.classList.contains("booking-delivery-urgent"),true);
  assert.equal(f.row.querySelectorAll(".booking-delayed-label").length,1,"unbolded reference cells must not cause a decoration loop");
  assert.equal(f.card.classList.contains("booking-delivery-urgent"),true);
 }
 f.b.status="Delivered";f.tick();
 assert.equal(f.row.classList.contains("booking-delivery-urgent"),false);
 assert.equal(f.card.querySelectorAll(".booking-delayed-label").length,0);
 f.context.currentSession=null;f.tick();
 assert.equal(f.host.querySelector("section"),null,"private notices must be removed at sign-out");
});
test("late reminder responses cannot leak into another signed-in account",async()=>{
 const f=portalFixture();f.start();
 f.context.currentSession=null;f.tick();f.respond();await new Promise(setImmediate);
 assert.equal(f.host.querySelector("section"),null);
 assert.equal(f.row.classList.contains("booking-delivery-urgent"),false);
 assert.equal(f.card.classList.contains("booking-delivery-urgent"),false);
});
