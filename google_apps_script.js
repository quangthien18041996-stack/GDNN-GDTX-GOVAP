/**
 * GOOGLE APPS SCRIPT - ĐỒNG BỘ XÁC NHẬN LƯƠNG TRỰC TIẾP VÀO GOOGLE SHEETS
 * 
 * Hướng dẫn cài đặt (Chỉ làm 1 lần trong 1 phút):
 * 1. Mở file Google Sheets xác nhận của bạn:
 *    https://docs.google.com/spreadsheets/d/1z0ImZCT3GG6pYHN3NCzTq5kD4LyEXpZY/edit
 * 2. Trên thanh menu, chọn: Tiện ích mở rộng (Extensions) > Apps Script
 * 3. Xóa hết code cũ, copy và dán toàn bộ đoạn code này vào.
 * 4. Bấm nút "Lưu" (biểu tượng đĩa mềm 💾 hoặc Ctrl + S).
 * 5. Bấm nút "Triển khai" (Deploy) màu xanh ở góc trên bên phải > chọn "Tùy chọn triển khai mới" (New deployment).
 *    - Loại: Chọn "Ứng dụng web" (Web app)
 *    - Mô tả: Đồng bộ xác nhận lương
 *    - Thực thi dưới dạng (Execute as): "Tôi" (Me)
 *    - Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone)
 * 6. Bấm "Triển khai" (Deploy) > Cấp quyền (Authorize access nếu có hỏi) > Copy đường link "URL ứng dụng web".
 * 7. Dán link URL ứng dụng web vào file config.json của web.
 */

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var data = JSON.parse(raw);
    
    var cccd = String(data.cccd || "").trim();
    var status = String(data.status || "").trim();
    var note = String(data.note || "").trim();

    if (cccd.length < 12 && cccd.length > 0) {
      cccd = ("000000000000" + cccd).slice(-12);
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var lastRow = sheet.getLastRow();

    if (lastRow < 6) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Bảng tính chưa có dữ liệu từ dòng 6 trở đi."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Đọc cột C (CCCD) từ dòng 6 đến hết
    var cccdValues = sheet.getRange(6, 3, lastRow - 5, 1).getValues();
    var targetRow = -1;

    for (var i = 0; i < cccdValues.length; i++) {
      var cellVal = String(cccdValues[i][0] || "").trim();
      if (cellVal.length < 12 && cellVal.length > 0) {
        cellVal = ("000000000000" + cellVal).slice(-12);
      }
      if (cellVal === cccd) {
        targetRow = i + 6; // Dòng thực tế trong Google Sheets
        break;
      }
    }

    if (targetRow !== -1) {
      // Cột 5 (E): Xác nhận về thông tin
      sheet.getRange(targetRow, 5).setValue(status);
      
      // Cột 6 (F): Ghi chú
      sheet.getRange(targetRow, 6).setValue(note);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Đã cập nhật dòng " + targetRow + " thành công!",
        row: targetRow,
        status: status,
        note: note
      })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        message: "Không tìm thấy giáo viên có số CCCD: " + cccd
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
    service: "GDNN-GDTX Gò Vấp - Bộ đồng bộ xác nhận lương Google Sheets"
  })).setMimeType(ContentService.MimeType.JSON);
}
