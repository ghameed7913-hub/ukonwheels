const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
function part(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a);
  assert.ok(a >= 0 && b > a, start);
  return html.slice(a, b);
}
const code = [
  part("async function supabaseCreateLogin(", "async function requestAccountPasswordReset("),
  part("function userRoleList(", "function drawUsers("),
  part("function drawCreateUsers(", "function viewUserInformation("),
  part("let creatingStaffUser=", "function viewStaffUserActivity("),
].join("\n");
function setup() {
  const store = { staffUsers: [], notifications: [] };
  const fields = {
    cuFirstName: { value: "Test" }, cuMiddleName: { value: "" }, cuLastName: { value: "Person" },
    cuEmail: { value: "TEST@example.com " }, cuMobile: { value: "07000000000" },
    cuTempPassword: { value: "DummyPasswordOnly123" }, createUserSaveBtn: { isConnected: true },
    content: { innerHTML: "", isConnected: true },
  };
  const profiles = [], grants = [], authCalls = [], rpcCalls = [], notices = [], snapshots = [];
  let signupError = false, rpcError = false, renders = 0;
  const c = vm.createContext({
    SUPABASE_CONFIGURED: true, currentSession: { user: { id: "admin" } }, role: "admin", currentUser: { name: "Admin" },
    page: "createUsers", getStore: () => store, saveStore: async data => { snapshots.push(JSON.parse(JSON.stringify(data))); return true; },
    document: { getElementById: id => fields[id] },
    render: () => renders++, alert: text => notices.push(text),
    escapeHtml: value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])),
    sbAuthOnly: { auth: { signUp: async input => {
      authCalls.push(input);
      return signupError ? { error: { message: "Signup unavailable" } } : { data: { user: { id: "new-user-id", identities: [{}] } } };
    } } },
    sb: {
      rpc: async (name, input) => {
        rpcCalls.push({ name, input });
        if (rpcError) return { error: { message: "Permission denied" } };
        assert.equal(name, "admin_finalize_created_profile");
        let profile = profiles.find(p => p.id === input.p_user_id);
        if (!profile) { profile = { id: input.p_user_id, email: "test@example.com", phone: "07000000000" }; profiles.push(profile); }
        Object.assign(profile, { name: input.p_name, full_name: input.p_name, role: input.p_role, staff_role: input.p_staff_role, status: input.p_status });
        for (let i = grants.length - 1; i >= 0; i--) if (grants[i].profile_id === profile.id) grants.splice(i, 1);
        for (const key of input.p_permissions) grants.push({ profile_id: profile.id, permission_key: key });
        return {};
      },
      from: table => {
        let id;
        const q = { select: () => q, in: () => q, neq: () => q, order: () => q,
          eq: (key, value) => { id = value; return q; },
          then: resolve => resolve({ data: table === "profiles" ? profiles : id ? grants.filter(g => g.profile_id === id) : grants }),
        };
        return q;
      },
    },
  });
  vm.runInContext(code, c);
  return { c, store, fields, profiles, grants, authCalls, rpcCalls, notices, snapshots,
    failSignup: () => { signupError = true; }, failRpc: () => { rpcError = true; }, renders: () => renders };
}

test("Create User renders exactly the six requested fields without role/compliance inputs", () => {
  const { c, fields } = setup();
  c.drawCreateUsers(fields.content);
  const inputs = [...fields.content.innerHTML.matchAll(/<input\b[^>]*id="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(inputs, ["cuFirstName", "cuMiddleName", "cuLastName", "cuEmail", "cuMobile", "cuTempPassword"]);
  assert.match(fields.content.innerHTML, /type="submit">Save</);
  assert.doesNotMatch(fields.content.innerHTML, /cuAddress|cuDesignation|cuPassport|cuEmergency/);
});

test("Save creates an inactive unassigned login, retains names and phone, and opens Assign Roles", async () => {
  const { c, store, fields, authCalls, rpcCalls, snapshots } = setup();
  fields.cuMiddleName.value = "Middle";
  await c.createStaffUser();
  assert.equal(authCalls[0].email, "test@example.com");
  assert.equal(authCalls[0].options.data.phone, "07000000000");
  assert.equal(authCalls[0].options.data.middle_name, "Middle");
  assert.equal(rpcCalls[0].input.p_status, "Inactive");
  assert.equal(rpcCalls[0].input.p_staff_role, "Unassigned");
  assert.equal(store.staffUsers[0].name, "Test Middle Person");
  assert.equal(store.staffUsers[0].id, "new-user-id");
  assert.equal(store.staffUsers[0].role, "Unassigned");
  assert.deepEqual(Array.from(store.staffUsers[0].permissions), []);
  assert.equal(c.page, "assignRoles");
  assert.equal(fields.cuTempPassword.value, "");
  assert.equal(JSON.stringify(snapshots).includes("DummyPasswordOnly123"), false);
});

test("A saved user is loaded into Assign Roles even after the local directory is empty", async () => {
  const { c, store, fields } = setup();
  await c.createStaffUser();
  store.staffUsers = [];
  await c.drawAssignUserRoles(fields.content);
  assert.equal(store.staffUsers[0].id, "new-user-id");
  assert.equal(store.staffUsers[0].role, "Unassigned");
  assert.match(fields.content.innerHTML, /Test Person/);
  assert.match(fields.content.innerHTML, /Select role \*/);
  assert.match(fields.content.innerHTML, /Save Role & Access/);
});

test("A failed login creation cannot add a phantom directory user or report success", async () => {
  const { c, store, notices, failSignup } = setup();
  failSignup();
  await c.createStaffUser();
  assert.equal(store.staffUsers.length, 0);
  assert.ok(notices.some(n => n.includes("could not be created")));
  assert.equal(c.page, "createUsers");
});

test("Validation rejects invalid email and short passwords, but middle name is optional", async () => {
  const { c, fields, authCalls } = setup();
  fields.cuEmail.value = "invalid";
  await c.createStaffUser();
  assert.equal(authCalls.length, 0);
  fields.cuEmail.value = "test@example.com";
  fields.cuTempPassword.value = "short";
  await c.createStaffUser();
  assert.equal(authCalls.length, 0);
  fields.cuTempPassword.value = "DummyPasswordOnly123";
  await c.createStaffUser();
  assert.equal(authCalls.length, 1);
});

test("Driver role assignment persists server role and Active status before updating the directory", async () => {
  const { c, fields, profiles, store, rpcCalls } = setup();
  await c.createStaffUser();
  fields.role_0 = { value: "Driver" }; fields.status_0 = { value: "Active" };
  await c.saveUserPermissions(0);
  assert.equal(rpcCalls[1].input.p_user_id, "new-user-id");
  assert.equal(rpcCalls[1].input.p_role, "driver");
  assert.equal(profiles[0].role, "driver");
  assert.equal(profiles[0].status, "Active");
  assert.equal(store.staffUsers[0].role, "Driver");
});

test("Staff permissions and Inactive status survive role saving and a fresh login permission read", async () => {
  const { c, fields, profiles } = setup();
  await c.createStaffUser();
  fields.role_0 = { value: "Staff" }; fields.status_0 = { value: "Inactive" };
  fields.perm_0_booking = { checked: true }; fields.perm_0_desktop = { checked: true };
  await c.saveUserPermissions(0);
  assert.equal(profiles[0].status, "Inactive");
  const loginProfile = { id: "new-user-id", role: "staff", permissions: [] };
  await c.loadProfilePortalPermissions(loginProfile);
  assert.deepEqual(Array.from(loginProfile.permissions).sort(), ["booking", "desktop"]);
  assert.equal(loginProfile.permissions.includes("hr"), false);
});

test("Failed role writes leave the cached role unchanged and do not report saved access", async () => {
  const { c, fields, store, notices, failRpc } = setup();
  await c.createStaffUser();
  fields.role_0 = { value: "Driver" }; fields.status_0 = { value: "Active" };
  failRpc();
  await c.saveUserPermissions(0);
  assert.equal(store.staffUsers[0].role, "Unassigned");
  assert.match(notices.at(-1), /were not saved/);
});

test("Explicitly unchecked Staff permissions remain empty, with no default access granted", () => {
  const { c } = setup();
  assert.deepEqual(Array.from(c.portalPermissionKeys(c.serverPermissionKeys([]))), []);
});

test("Duplicate clicks cannot create two Auth accounts", async () => {
  const { c, authCalls } = setup();
  const pending = c.createStaffUser();
  await c.createStaffUser();
  await pending;
  assert.equal(authCalls.length, 1);
});

test("Navigating away during account creation does not interrupt saving or redirect the new page", async () => {
  const { c, store, fields, snapshots, notices } = setup();
  const saving = c.createStaffUser();
  c.page = "desktop";
  delete fields.cuTempPassword;
  await saving;
  assert.equal(store.staffUsers.length, 1);
  assert.equal(snapshots.length, 1);
  assert.equal(c.page, "desktop");
  assert.match(notices.at(-1), /^User saved/);
});

test("A role save completing after navigation does not replace the newly opened page", async () => {
  const { c, fields, store } = setup();
  await c.createStaffUser();
  fields.role_0 = { value: "Driver" }; fields.status_0 = { value: "Active" };
  const saving = c.saveUserPermissions(0);
  c.page = "desktop";
  fields.content.innerHTML = "Current dashboard";
  await saving;
  assert.equal(store.staffUsers[0].role, "Driver");
  assert.equal(c.page, "desktop");
  assert.equal(fields.content.innerHTML, "Current dashboard");
});
