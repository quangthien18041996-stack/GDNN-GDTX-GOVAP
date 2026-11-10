# CỔNG TRA CỨU LƯƠNG CÁN BỘ, GIÁO VIÊN & NHÂN VIÊN

Hệ thống tra cứu thông tin lương trực tuyến theo số Căn cước công dân (CCCD), được thiết kế tối ưu hóa tốc độ tải đồng thời và bảo mật tuyệt đối thông tin cá nhân.

---

## 1. Cơ chế bảo mật và Chống lộ thông tin

1. **Xử lý cách ly hoàn toàn ở Backend**:
   - Trình duyệt **tuyệt đối không tải danh sách toàn bộ nhân sự** về máy. Không thể xem F12 / Inspect / Network để lấy thông tin của người khác.
   - Khi người dùng bấm tra cứu, hệ thống chỉ gửi số CCCD và chỉ trả về **duy nhất** thông tin của người đó.
2. **Chống dò quét tự động (Brute-force / Anti-Bot)**:
   - Tích hợp mã bảo mật CAPTCHA toán học ngẫu nhiên (chống robot quét liên tục dãy 12 số CCCD).
   - Cơ chế giới hạn tần suất truy cập (Rate Limiting): Khóa tạm thời 3 phút nếu 1 IP nhập sai liên tục 5 lần.
3. **Bảo mật hiển thị & Sử dụng máy tính công cộng**:
   - Tự động ẩn số giữa của Số tài khoản ngân hàng (`1048****4086`), có nút bật/tắt khi xem trực tiếp.
   - Tự động khóa màn hình và xóa sạch dữ liệu sau **120 giây** không thao tác (tránh người ngồi sau xem trộm ở phòng hội đồng / máy chung).
   - Nút "Xóa dữ liệu màn hình & Thoát" xóa sạch dữ liệu khỏi bộ nhớ trình duyệt ngay lập tức.
4. **Chuẩn in ấn văn bản hành chính**:
   - Hỗ trợ in trực tiếp hoặc xuất PDF (`Ctrl + P` hoặc nút bấm) chuẩn phiếu lương A4/A5 trang trọng, tự động ẩn toàn bộ giao diện web khi in.

---

## 2. Khả năng chịu tải đồng thời (High Concurrency)

- Xây dựng trên nền tảng **Node.js Asynchronous Non-blocking I/O**.
- Cơ sở dữ liệu được đánh chỉ mục trong bộ nhớ máy chủ (In-memory Hash Map Index), tốc độ tra cứu đạt độ phức tạp \(O(1)\), phản hồi trung bình chỉ **20 - 30 miligiây**.
- Hỗ trợ hàng trăm đến hàng ngàn giáo viên cùng lúc truy cập mà không lo nghẽn mạng hay khóa cơ sở dữ liệu.

---

## 3. Hướng dẫn khởi chạy & Sử dụng

### Khởi chạy máy chủ:
Mở terminal tại thư mục dự án và chạy lệnh:
```bash
node server.js
```
Hệ thống sẽ chạy tại:
- Truy cập từ máy tính này: `http://localhost:3000`
- Truy cập từ điện thoại / máy tính khác cùng mạng Wi-Fi/LAN trường học: `http://<IP_MÁY_BẠN>:3000`

### Đồng bộ lại dữ liệu khi Google Sheet có cập nhật mới:
Chạy script đồng bộ trực tiếp từ Google Sheet nguồn:
```bash
python sync_sheet.py
```
Sau đó khởi động lại `node server.js` để áp dụng dữ liệu mới nhất.
