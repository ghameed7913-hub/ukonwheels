import { jsPDF } from "jspdf";

const CATEGORY = {
  incident: "Incident scene",
  licence: "Other party licence",
  insurance: "Other party insurance",
};

/** Fetch only renewed, access-controlled links; keep image bytes in memory. */
export async function loadPhoto(photo) {
  if (!photo.url || photo.error) {
    throw new Error(`Photo "${photo.file_name || photo.id}" is unavailable. Refresh its viewing link and retry.`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  let blob;
  try {
    const response = await fetch(photo.url, {
      signal: controller.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Photo download failed (${response.status}).`);
    blob = await response.blob();
    if (!/^image\/(jpeg|png|webp)$/i.test(blob.type)) {
      throw new Error("The photo link did not return a supported image.");
    }
  } finally {
    clearTimeout(timer);
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("The photo could not be decoded.");
    const ratio = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot prepare PDF photos.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { data: canvas.toDataURL("image/jpeg", 0.88), width: canvas.width, height: canvas.height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Real, searchable, multipage PDF. All images must succeed before saving. */
export async function createIncidentPdf({
  report, photos = [], reference, fields, labels,
  imageLoader = loadPhoto, assertSession = () => {}, progress = () => {},
}) {
  if (!report?.id || !reference) throw new Error("A saved report and reference are required.");
  assertSession();
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.setProperties({
    title: `UK On Wheels incident report ${reference}`,
    subject: `${report.status === "submitted" ? "Submitted" : "Draft"} incident report`,
    author: "UK On Wheels",
    keywords: `incident, ${reference}, ${report.details?.registration || ""}`,
  });
  const left = 16, width = 178, bottom = 276;
  let y;
  const draft = report.status !== "submitted";
  function header() {
    doc.setFillColor(7, 26, 49);
    doc.rect(0, 0, 210, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("UK ON WHEELS", left, 12);
    doc.setFontSize(10);
    doc.text(draft ? "INCIDENT REPORT - DRAFT / NOT SUBMITTED" : "INCIDENT REPORT - SUBMITTED", left, 20);
    doc.setTextColor(20, 32, 48);
    doc.setFontSize(9);
    doc.text(reference, left, 33);
    y = 41;
  }
  function page() { doc.addPage(); header(); }
  function line(value, bold = false) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(String(value ?? "Not provided"), width);
    for (const text of lines) {
      if (y + 5 > bottom) page();
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(10);
      doc.text(text, left, y);
      y += 5;
    }
  }
  function field(label, value) {
    if (y + 12 > bottom) page();
    line(label, true);
    line(value === null || value === undefined || value === "" ? "Not provided" : value);
    y += 3;
  }
  header();
  field("Report reference", reference);
  field("Report ID", report.id);
  field("Driver account", report.driver_id);
  field("Related booking ID", report.booking_id || "None");
  field("Created", report.created_at);
  field("Submitted", report.submitted_at || "Not submitted");
  line("Fault records the Driver's account, not a legal determination.");
  y += 4;
  for (const key of fields) {
    const value = report.details?.[key];
    field(labels[key] || key, key === "fault" ? ({
      driver: "Driver", other: "Other party", shared: "Shared", unknown: "Unknown",
    }[value] || value) : value);
  }
  field("Attached photos", String(photos.length));
  if (!photos.length) line("No photos stored with this report.");
  for (let index = 0; index < photos.length; index++) {
    assertSession();
    progress(index + 1, photos.length);
    const photo = photos[index];
    let image;
    try {
      if (!photo.url || photo.error) throw new Error("Viewing link unavailable.");
      image = await imageLoader(photo);
    } catch (error) {
      throw new Error(`Cannot include photo ${index + 1} (${photo.file_name || photo.id}): ${error.message}. No incomplete PDF was downloaded.`);
    }
    assertSession();
    page();
    field(`Photo ${index + 1} of ${photos.length}`, CATEGORY[photo.category] || "Photo");
    field("Filename", photo.file_name);
    field("Uploaded", photo.created_at);
    // Limit caption space so even a 255-character filename has room.
    if (y > 110) page();
    const scale = Math.min(width / image.width, (bottom - y - 4) / image.height);
    doc.addImage(image.data, "JPEG", left, y, image.width * scale, image.height * scale);
  }
  const pages = doc.getNumberOfPages();
  for (let number = 1; number <= pages; number++) {
    doc.setPage(number);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 100, 115);
    doc.text(`Private - ${draft ? "DRAFT - " : ""}keep this report and its photos secure.`, left, 286);
    doc.text(`Page ${number} of ${pages}`, 194, 286, { align: "right" });
  }
  assertSession();
  return doc;
}

