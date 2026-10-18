// Keep the spreadsheet library out of the portal's initial load.
window.BookingExcel = {
  async downloadTemplate(context) {
    const {downloadTemplate} = await import("./booking-excel.js");
    return downloadTemplate(context);
  },
  async readFile(file) {
    const {readFile} = await import("./booking-excel.js");
    return readFile(file);
  },
};
