/**
 * GOOGLE APPS SCRIPT - ĐỒNG BỘ XÁC NHẬN PHIẾU LƯƠNG
 * Áp dụng cho bảng tính:
 * https://docs.google.com/spreadsheets/d/1keYqupanW1_ThMGSHhQFrFzwQSEePGIUIfITD5rdjH0/edit
 * Sheet: 'Trang tính1'
 * 
 * Cấu trúc cột:
 * - Cột A (1): STT
 * - Cột B (2): CCCD (12 chữ số)
 * - Cột C (3): Họ và tên
 * - Cột D (4): Xác nhận về thông tin (Đúng thông tin / Chưa đúng thông tin)
 * - Cột E (5): Ghi chú
 * - Cột F (6): Thời gian xác nhận
 */

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    
    var cccd = String(data.cccd || "").trim();
    if (cccd.indexOf(".") > -1) { cccd = cccd.split(".")[0]; }
    while (cccd.length < 12 && cccd.length > 0) { cccd = "0" + cccd; }
    
    var hoTen = String(data.ho_ten || "").trim().toLowerCase();
    var status = String(data.status || "").trim();
    var note = String(data.note || "").trim();
    var now = new Date();
    var timeStr = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm - dd/MM/yyyy");

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Trang tính1") || ss.getActiveSheet();
    var lastRow = sheet.getLastRow();

    if (lastRow < 3) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Bảng tính chưa có dữ liệu từ dòng 3 trở đi."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Đặt tiêu đề cột F nếu chưa có
    if (!sheet.getRange(2, 6).getValue()) {
      sheet.getRange(2, 6).setValue("Thời gian xác nhận");
    }

    // Đọc cột B (CCCD) và Cột C (Họ tên) từ dòng 3 đến dòng cuối
    var numRows = lastRow - 2;
    var rangeData = sheet.getRange(3, 2, numRows, 2).getValues();
    var targetRow = -1;

    for (var i = 0; i < rangeData.length; i++) {
      var rowCccd = String(rangeData[i][0] || "").trim();
      if (rowCccd.indexOf(".") > -1) { rowCccd = rowCccd.split(".")[0]; }
      while (rowCccd.length < 12 && rowCccd.length > 0) { rowCccd = "0" + rowCccd; }
      
      var rowName = String(rangeData[i][1] || "").trim().toLowerCase();

      // Khớp chính xác tuyệt đối theo 12 số CCCD
      if (cccd && rowCccd === cccd) {
        targetRow = i + 3;
        break;
      }
      // Dự phòng nếu CCCD chưa khớp nhưng Họ tên khớp
      if (!cccd && hoTen && rowName === hoTen) {
        targetRow = i + 3;
        break;
      }
    }

    if (targetRow !== -1) {
      // Cột D (4): Xác nhận về thông tin
      sheet.getRange(targetRow, 4).setValue(status);

      // Cột E (5): Ghi chú
      sheet.getRange(targetRow, 5).setValue(note);

      // Cột F (6): Thời gian xác nhận
      sheet.getRange(targetRow, 6).setValue(timeStr);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Cập nhật thành công vào dòng " + targetRow,
        row: targetRow,
        cccd: cccd,
        status: status,
        note: note,
        time: timeStr
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Không tìm thấy CCCD: " + cccd
      })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    sheet: "Trang tính1",
    description: "Webhook đồng bộ xác nhận phiếu lương GDNN-GDTX Gò Vấp"
  })).setMimeType(ContentService.MimeType.JSON);
}
