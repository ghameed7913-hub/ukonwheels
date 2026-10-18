/* Uses the existing authenticated Supabase client. No PII or file bytes in app_store. */
window.IncidentAPI = (() => {
  const bucket = "incident-evidence";
  function session() {
    if (!SUPABASE_CONFIGURED || !currentSession?.user?.id)
      throw new Error("Sign in to save or view incident reports.");
    return currentSession.user.id;
  }
  function check(result) {
    if (!result.error) return result.data;
    const e = result.error;
    if (["42P01", "42883", "PGRST202", "PGRST205"].includes(e.code) ||
        /bucket not found|schema cache|does not exist/i.test(e.message || ""))
      throw new Error("Incident reports need Supabase setup. Ask Admin to run supabase/incident_reports_patch.sql. Your unsaved form has been kept.");
    throw new Error(e.message || "The incident report could not be saved. Please retry.");
  }
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  async function allRows(table, reportId, ascending) {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      let query = sb.from(table).select("*");
      if (reportId) query = query.eq("report_id", reportId);
      const batch = check(await query.order("created_at", { ascending })
        .order("id", { ascending }).range(offset, offset + 499)) || [];
      rows.push(...batch);
      if (batch.length < 500) return rows;
    }
  }
  return {
    async list() {
      session();
      return allRows("incident_reports", null, false);
    },
    async get(id) {
      session();
      return check(await sb.from("incident_reports").select("*").eq("id", id).single());
    },
    async saveDraft({ id, details, booking_id = null }) {
      session();
      if (!id) throw new Error("A stable draft reference is required before saving.");
      return check(await sb.rpc("save_incident_report", { p_id: id, p_details: details, p_booking_id: booking_id || null }));
    },
    async upload(reportId, file, category) {
      session();
      if (!allowed.has(file.type) || file.size < 1 || file.size > 10485760)
        throw new Error("Choose a JPG, PNG or WebP image up to 10 MB. Convert HEIC images to JPG first.");
      if (!["incident", "licence", "insurance"].includes(category))
        throw new Error("Choose a valid image category.");
      const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${reportId}/${crypto.randomUUID()}.${extension}`;
      check(await sb.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false }));
      const result = await sb.rpc("register_incident_photo", {
        p_report_id: reportId, p_storage_path: path, p_category: category,
        p_file_name: file.name.slice(0, 255), p_mime_type: file.type, p_bytes: file.size
      });
      if (result.error) {
        // Never remove an object on an ambiguous response: metadata might already
        // have committed. RLS allows cleanup only for genuinely unregistered files.
        try { await sb.storage.from(bucket).remove([path]); } catch (_) {}
      }
      return check(result);
    },
    async photos(reportId) {
      session();
      const rows = await allRows("incident_report_photos", reportId, true);
      return Promise.all(rows.map(async row => {
        try {
          const signed = check(await sb.storage.from(bucket).createSignedUrl(row.storage_path, 3600));
          return { ...row, url: signed.signedUrl };
        } catch (e) {
          return { ...row, url: null, error: e.message };
        }
      }));
    },
    async submit(id) {
      session();
      return check(await sb.rpc("submit_incident_report", { p_id: id }));
    }
  };
})();
