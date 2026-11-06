/* Admin-only image retention. No private records or credentials in browser storage. */
window.ImageRetention = (() => {
  const esc = value => escapeHtml(String(value ?? ''));
  async function rpc(action, data = {}) {
    const actor = currentSession?.user?.id;
    if (!actor) throw Error('Sign in as Admin.');
    const result = await sb.rpc('manage_image_retention', { p_action: action, p_data: data });
    if (actor !== currentSession?.user?.id) throw Error('Your sign-in changed. Reload Settings.');
    if (result.error) throw Error(['PGRST202', '42883'].includes(result.error.code) ?
      'Image retention needs the Supabase setup: supabase/image-retention.sql. Cleanup has not been enabled.' :
      result.error.message);
    return result.data;
  }
  async function mount(parent) {
    if (role !== 'admin' || !parent.isConnected) return;
    const panel = document.createElement('section');
    panel.className = 'panel'; panel.style.marginTop = '12px';
    parent.append(panel);
    let generation = 0;
    async function load(action = 'status', data = {}) {
      const g = ++generation;
      panel.innerHTML = '<h3>Automatic image cleanup</h3><p role="status">Loading retention settings…</p>';
      try {
        const state = await rpc(action, data);
        if (!panel.isConnected || g !== generation || role !== 'admin') return;
        panel.innerHTML = `<h3>Automatic image cleanup</h3>
          <p><b>${state.enabled ? 'Enabled' : 'Disabled'}</b> · ${esc(state.eligible)} images eligible · ${esc(state.held)} on hold · ${esc(state.deleted_images)} deleted</p>
          <p>Only registered JPG, PNG and WebP images are removed: delivery photos 90 days after delivery; eligible HR images and linked Driver portrait/ID images five years after the employee leaves. Booking details, financial records, PDFs, signatures and GPS are not deleted by this feature. HR categories Employment and Other are kept for manual review.</p>
          <p class="muted">Last worker check: ${esc(state.last_run_at ? new Date(state.last_run_at).toLocaleString('en-GB') : 'Not yet confirmed')}.
          ${state.last_error ? 'The last deletion failed. Check the worker configuration.' : ''}
          The daily worker must be configured separately; enabling this switch alone does not install it.</p>
          <div class="form">
            <button type="button" class="btn secondary" data-action="preview">Preview eligible images</button>
            <button type="button" class="btn ${state.enabled ? 'secondary' : 'danger'}" data-action="${state.enabled ? 'pause' : 'enable'}">${state.enabled ? 'Pause cleanup' : 'Enable permanent image deletion'}</button>
          </div>
          <h4>Record an employee’s leaving date</h4>
          <p>Leave the date blank for someone still employed. Names come from HR Employee Registration; an account without an HR record must first be registered there.</p>
          <div class="form">
            <label>Employee<select data-employee><option value="">Choose employee</option>${state.employees.map(e =>
              `<option value="${esc(e.id)}">${esc(e.name)} · ${esc(e.reference)}</option>`).join('')}</select></label>
            <label>Leaving date<input type="date" data-left></label>
            <label><input type="checkbox" data-employee-held> Keep employee images on hold for a claim or legal requirement</label>
            <button type="button" class="btn secondary" data-action="employee">Save employee retention</button>
          </div>
          <h4>Protect delivery photos</h4><div class="form">
            <label>Exact booking reference<input data-reference placeholder="UKOW00051"></label>
            <label><input type="checkbox" data-booking-held checked> Hold delivery images</label>
            <button type="button" class="btn secondary" data-action="booking">Save delivery hold</button>
          </div>
          <h4>Due images — first 100 groups</h4>
          <div style="overflow:auto"><table><thead><tr><th>Type</th><th>Reference</th><th>Due</th><th>Images</th><th>Hold</th></tr></thead><tbody>
          ${state.preview.map(r => `<tr><td>${esc(r.kind)}</td><td>${esc(r.label)}</td><td>${esc(new Date(r.due_at).toLocaleDateString('en-GB'))}</td><td>${esc(r.images)}</td><td>${r.held ? 'Yes' : 'No'}</td></tr>`).join('') || '<tr><td colspan="5">No due images found.</td></tr>'}
          </tbody></table></div><p role="alert" data-error></p>`;
        panel.querySelector('[data-employee]').onchange = event => {
          const employee = state.employees.find(e => e.id === event.target.value);
          panel.querySelector('[data-left]').value = employee?.left_on || '';
          panel.querySelector('[data-employee-held]').checked = !!employee?.held;
        };
        panel.querySelectorAll('[data-action]').forEach(button => {
          button.onclick = async () => {
            let action = button.dataset.action, args = {};
            const error = panel.querySelector('[data-error]');
            try {
              if (action === 'employee') {
                args = { kind: 'employee', owner_id: panel.querySelector('[data-employee]').value,
                  left_on: panel.querySelector('[data-left]').value, held: panel.querySelector('[data-employee-held]').checked };
                if (!args.owner_id) throw Error('Choose an employee.');
                action = 'rule';
              } else if (action === 'booking') {
                args = { kind: 'delivery', reference: panel.querySelector('[data-reference]').value.trim(),
                  held: panel.querySelector('[data-booking-held]').checked };
                if (!args.reference) throw Error('Enter a booking reference.');
                action = 'rule';
              } else if (action === 'enable') {
                if (!await crmConfirm(`Permanently delete eligible images on each daily run, including existing overdue images? ${state.eligible} are eligible now. Financial and non-image records will remain. Preview first; deletion cannot be undone.`, 'Enable image cleanup', 'Enable cleanup', true)) return;
                args = { confirmation: 'DELETE ELIGIBLE IMAGES' };
              }
              button.disabled = true;
              await load(action, args);
            } catch (e) { if (error.isConnected) error.textContent = e.message; button.disabled = false; }
          };
        });
      } catch (e) {
        if (panel.isConnected && g === generation) panel.innerHTML =
          `<h3>Automatic image cleanup</h3><p role="alert">${esc(e.message)}</p>`;
      }
    }
    await load();
  }
  return { mount };
})();
