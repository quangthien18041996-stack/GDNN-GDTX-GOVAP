/**
 * GOOGLE APPS SCRIPT - ĐỒNG BỘ DỮ LIỆU XÁC NHẬN LƯƠNG
 * Áp dụng cho bảng tính:
 * https://docs.google.com/spreadsheets/d/1o6rm3jQDDXxYWZ9c_Ff7TVMcz-ULHocDu6pzsANYjYE/edit
 * 
 * Cấu trúc cột của bảng tính này:
 * - Cột 1 (A): STT
 * - Cột 2 (B): MS (Mã số: B001, B002, ...)
 * - Cột 3 (C): Họ và tên (Hà Ngọc Minh Thi, Nguyễn Phạm Đại, ...)
 * - Cột 4 (D): Xác nhận về thông tin (Đúng thông tin / Chưa đúng thông tin)
 * - Cột 5 (E): Ghi chú (Ý kiến phản hồi)
 */

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    
    var ms = String(data.ms || "").trim().toUpperCase();
    var hoTen = String(data.ho_ten || "").trim().toLowerCase();
    var status = String(data.status || "").trim();
    var note = String(data.note || "").trim();

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Trang tính1") || ss.getActiveSheet();
    var lastRow = sheet.getLastRow();

    if (lastRow < 6) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Bảng tính chưa có dữ liệu từ dòng 6 trở đi."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Đọc Cột B (MS) và Cột C (Họ tên) từ dòng 6 đến hết
    var numRows = lastRow - 5;
    var rangeData = sheet.getRange(6, 2, numRows, 2).getValues();
    var targetRow = -1;

    for (var i = 0; i < rangeData.length; i++) {
      var rowMs = String(rangeData[i][0] || "").trim().toUpperCase();

      // KHỚP CHÍNH XÁC TUYỆT ĐỐI THEO MÃ SỐ (Cột B: B001, B002, ...)
      // Đảm bảo dù 2 giáo viên trùng họ tên 100% vẫn cập nhật đúng dòng của từng người
      if (ms && rowMs === ms) {
        targetRow = i + 6;
        break;
      }
    }

    if (targetRow !== -1) {
      // Cột 4 (D): Xác nhận về thông tin
      sheet.getRange(targetRow, 4).setValue(status);

      // Cột 5 (E): Ghi chú
      sheet.getRange(targetRow, 5).setValue(note);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Cập nhật thành công vào dòng " + targetRow,
        row: targetRow,
        ms: ms,
        status: status,
        note: note
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Không tìm thấy nhân sự có MS: " + ms + " hoặc Tên: " + data.ho_ten
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
    description: "Webhook đồng bộ xác nhận lương GDNN-GDTX Gò Vấp"
  })).setMimeType(ContentService.MimeType.JSON);
}
