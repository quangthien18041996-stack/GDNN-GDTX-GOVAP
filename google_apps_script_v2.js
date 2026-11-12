/**
 * GOOGLE APPS SCRIPT V2 - ĐỒNG BỘ DỮ LIỆU XÁC NHẬN PHIẾU LƯƠNG
 * Áp dụng cho bảng tính:
 * https://docs.google.com/spreadsheets/d/1C8xTw3-gpgxFi_aeXw21n7CA0avU2Ibz/edit
 * Sheet: Sheet2
 * 
 * Khớp trực tiếp theo 12 số CCCD tại Cột A (từ dòng 4 trở đi)
 * Ghi kết quả vào:
 * - Cột 16 (P): Xác nhận về thông tin (Đúng thông tin / Chưa đúng thông tin)
 * - Cột 17 (Q): Ghi chú / Ý kiến phản hồi
 * - Cột 18 (R): Thời gian xác nhận
 */

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    
    var cccd = String(data.cccd || "").trim();
    if (cccd.length < 12) {
      while (cccd.length < 12) { cccd = "0" + cccd; }
    }
    
    var hoTen = String(data.ho_ten || "").trim().toLowerCase();
    var status = String(data.status || "").trim();
    var note = String(data.note || "").trim();
    var now = new Date();
    var timeStr = Utilities.formatDate(now, "Asia/Ho_Chi_Minh", "HH:mm - dd/MM/yyyy");

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Sheet2") || ss.getActiveSheet();
    var lastRow = sheet.getLastRow();

    if (lastRow < 4) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Bảng tính chưa có dữ liệu từ dòng 4 trở đi."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Đảm bảo tiêu đề cột tại dòng 3 nếu chưa có
    if (!sheet.getRange(3, 16).getValue()) {
      sheet.getRange(3, 16).setValue("Xác nhận về thông tin");
      sheet.getRange(3, 17).setValue("Ghi chú");
      sheet.getRange(3, 18).setValue("Thời gian xác nhận");
    }

    // Đọc cột A (CCCD) và cột B (Họ tên) từ dòng 4 đến hết
    var numRows = lastRow - 3;
    var rangeData = sheet.getRange(4, 1, numRows, 2).getValues();
    var targetRow = -1;

    for (var i = 0; i < rangeData.length; i++) {
      var rowCccd = String(rangeData[i][0] || "").trim();
      if (rowCccd.indexOf(".") > -1) {
        rowCccd = rowCccd.split(".")[0];
      }
      while (rowCccd.length < 12 && rowCccd.length > 0) {
        rowCccd = "0" + rowCccd;
      }
      var rowName = String(rangeData[i][1] || "").trim().toLowerCase();

      // Khớp chính xác tuyệt đối theo CCCD
      if (cccd && rowCccd === cccd) {
        targetRow = i + 4;
        break;
      }
      // Dự phòng nếu CCCD chưa khớp nhưng Họ tên khớp chính xác
      if (!cccd && hoTen && rowName === hoTen) {
        targetRow = i + 4;
        break;
      }
    }

    if (targetRow !== -1) {
      // Cột 16 (P): Xác nhận
      sheet.getRange(targetRow, 16).setValue(status);
      // Cột 17 (Q): Ghi chú
      sheet.getRange(targetRow, 17).setValue(note);
      // Cột 18 (R): Thời gian xác nhận
      sheet.getRange(targetRow, 18).setValue(timeStr);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Cập nhật thành công vào dòng " + targetRow,
        row: targetRow,
        cccd: cccd,
        status: status,
        note: note
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Không tìm thấy CCCD: " + cccd + " hoặc Tên: " + data.ho_ten
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
    sheet: "Sheet2",
    description: "Webhook đồng bộ xác nhận phiếu lương GDNN-GDTX Gò Vấp V2"
  })).setMimeType(ContentService.MimeType.JSON);
}
