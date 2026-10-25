const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
const helpers=html.slice(html.indexOf("function escapeHtml("),html.indexOf("function normalizedBookingToPortal("));
function setup(store){
 const c=vm.createContext({getStore:()=>store,currency:n=>"£"+Number(n).toFixed(2)});
 vm.runInContext(helpers,c);
 return c;
}
test("confirmed approvals show actual approver and UK date/time; pending and rejected are excluded",()=>{
 const b={ref:"B-1"},c=setup({updateRequests:[
  {bookingRef:"B-1",status:"Approved",approvedBy:"System Admin",approvedAt:"2026-10-25T10:45:32Z",changes:{status:"On Route",amount:150}},
  {bookingRef:"B-1",status:"Pending Approval",requestedBy:"Pending person"},
  {bookingRef:"B-1",status:"Rejected",approvedBy:"Reject person",approvedAt:"yesterday"},
  {bookingRef:"OTHER",status:"Approved",approvedBy:"Unrelated person"}
 ]});
 const rendered=c.bookingApprovalDetails(b);
 assert.match(rendered,/System Admin/);
 assert.match(rendered,/25 Oct 2026, 10:45:32 \(UK time\)/);
 assert.match(rendered,/Status: On Route/);
 assert.match(rendered,/£150\.00/);
 assert.doesNotMatch(rendered,/Pending person|Reject person|Unrelated person/);
});
test("Super Admin approval is retained, escaped and deduplicated across stored history and requests",()=>{
 const approval={approvedBy:"A <Admin>",approvedRole:"Super Admin",approvedAt:"2026-06-01T09:00:00Z",summary:"<script>unsafe</script>"};
 const b={ref:"B-1",lastApprovedBy:approval.approvedBy,lastApprovedAt:approval.approvedAt,
  approvalHistory:[{action:"Update Approved",...approval}]};
 const store={bookings:[b],updateRequests:[{bookingRef:b.ref,status:"Approved",...approval}]};
 for(const c of [setup(store),setup(JSON.parse(JSON.stringify(store)))]){
  const rendered=c.bookingApprovalDetails(b);
  assert.match(rendered,/Approval history \(1\)/);
  assert.match(rendered,/A &lt;Admin&gt; \(Super Admin\)/);
  assert.match(rendered,/10:00:00 \(UK time\)/);
  assert.doesNotMatch(rendered,/<script>|A <Admin>/);
 }
});
test("latest approval and older approvals remain visible without inventing missing names or dates",()=>{
 const b={ref:"B-1",lastApprovedBy:"Latest Admin",lastApprovedAt:"25/10/2026, 11:15:00",
  approvalHistory:[{action:"Update Approved",approvedBy:"First Admin",approvedAt:"2026-10-24T12:00:00Z"}]};
 const c=setup({updateRequests:[]}),rendered=c.bookingApprovalDetails(b);
 assert.match(rendered,/Latest approval[\s\S]*Latest Admin/);
 assert.match(rendered,/First Admin/);
 assert.match(rendered,/25\/10\/2026, 11:15:00/);
 assert.match(c.bookingApprovalDetails({ref:"no-approval"}),/No recorded approval/);
 assert.equal(c.bookingApprovalTime(null),"Time not recorded");
});
test("Admin, Client and booking-update detail views include approval details",()=>{
 for(const [start,end] of [
  ["function viewStatusBooking(","function findBookingByRef("],
  ["function clientViewBooking(","function drawClientTracking("],
  ["function findSingleBookingUpdate(","function submitSingleBookingUpdate("]
 ])assert.match(html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start))),/bookingApprovalDetails\(b\)/);
});
