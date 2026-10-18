// Load the PDF library only when an authorised user requests a download.
window.IncidentPDF = {
  async create(options) {
    const { createIncidentPdf } = await import("./incident-pdf.js");
    return createIncidentPdf(options);
  },
};
