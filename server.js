const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const SALARY_DATA_PATH = path.join(__dirname, 'data', 'salary_teachers.json');
const DATA_PATH = fs.existsSync(SALARY_DATA_PATH) ? SALARY_DATA_PATH : path.join(__dirname, 'data', 'teachers.json');
const CONFIRM_PATH = path.join(__dirname, 'data', 'confirmations_salary.json');
const BASE_SALARY = 2340000; // Mức lương cơ sở hiện hành theo NĐ 73/2024/NĐ-CP

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Headers chống cache thông tin nhạy cảm
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (req.path.startsWith('/api/lookup') || req.path.startsWith('/api/confirm')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

// Phục vụ giao diện tĩnh
app.use(express.static(path.join(__dirname, 'public')));

// 1. In-memory data store for maximum concurrency and ultra-fast lookup O(1)
let teachersMap = new Map();
let confirmationsMap = new Map();

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const raw = fs.readFileSync(DATA_PATH, 'utf-8');
      const list = JSON.parse(raw);
      teachersMap.clear();
      list.forEach(item => {
        if (item.cccd) {
          teachersMap.set(String(item.cccd).trim(), item);
        }
      });
      console.log(`[DATA] Đã nạp thành công ${teachersMap.size} hồ sơ nhân sự vào bộ nhớ.`);
    } else {
      console.warn(`[DATA] Chưa tìm thấy file ${DATA_PATH}`);
    }

    if (fs.existsSync(CONFIRM_PATH)) {
      const confRaw = fs.readFileSync(CONFIRM_PATH, 'utf-8');
      const confObj = JSON.parse(confRaw);
      confirmationsMap.clear();
      for (const [cccd, val] of Object.entries(confObj)) {
        confirmationsMap.set(cccd, val);
      }
      console.log(`[DATA] Đã nạp ${confirmationsMap.size} xác nhận đã có.`);
    }
  } catch (err) {
    console.error('[DATA] Lỗi khi nạp dữ liệu:', err);
  }
}

function saveConfirmationsToFile() {
  try {
    const obj = {};
    for (const [k, v] of confirmationsMap.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(CONFIRM_PATH, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DATA] Lỗi khi ghi confirmations:', err);
  }
}

loadData();

// 2. Bảo mật chống dò quét (Rate Limiter & Brute-force protection)
const ipRateMap = new Map();
const captchaStore = new Map();

// Dọn dẹp captcha hết hạn định kỳ
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of captchaStore.entries()) {
    if (now - data.createdAt > 5 * 60 * 1000) {
      captchaStore.delete(token);
    }
  }
  for (const [ip, data] of ipRateMap.entries()) {
    if (now - data.lastAttempt > 10 * 60 * 1000) {
      ipRateMap.delete(ip);
    }
  }
}, 60 * 1000);

// API tạo mã xác nhận CAPTCHA đơn giản (chống robot quét tự động)
app.get('/api/captcha', (req, res) => {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  const token = crypto.randomBytes(16).toString('hex');

  captchaStore.set(token, {
    answer: num1 + num2,
    createdAt: Date.now()
  });

  res.json({
    token,
    question: `${num1} + ${num2} = ?`
  });
});

// Hàm tính chi tiết tiền lương theo quy chuẩn
function calculateSalaryBreakdown(item) {
  const hsl = Number(item.hsl) || 0;
  const pccv = Number(item.pccv) || 0;
  const tnvkRate = Number(item.tnvk) || 0;
  const udgvRate = Number(item.udgv) || 0;
  const tnngRate = Number(item.tnng) || 0;

  // Lương theo ngạch bậc = HSL * Mức lương cơ sở
  const luongTheoHsl = Math.round(hsl * BASE_SALARY);

  // Phụ cấp chức vụ = PCCV * Mức lương cơ sở
  const tienPccv = Math.round(pccv * BASE_SALARY);

  // Phụ cấp thâm niên vượt khung (TNVK): tính trên (Lương theo HSL + PCCV)
  const tienTnvk = Math.round((luongTheoHsl + tienPccv) * tnvkRate);

  // Các phụ cấp tính trên (Lương HSL + PCCV + TNVK)
  const luongCoBanCongPhuCap = luongTheoHsl + tienPccv + tienTnvk;
  const tienUdgv = Math.round(luongCoBanCongPhuCap * udgvRate);
  const tienTnng = Math.round(luongCoBanCongPhuCap * tnngRate);

  // Tổng thu nhập lương & phụ cấp
  const tongThuNhap = luongTheoHsl + tienPccv + tienTnvk + tienUdgv + tienTnng;

  return {
    baseSalary: BASE_SALARY,
    luongTheoHsl,
    tienPccv,
    tienTnvk,
    tienUdgv,
    tienTnng,
    tongThuNhap
  };
}

// Hàm làm mờ thông tin nhạy cảm
function maskString(str, startVisible = 3, endVisible = 3) {
  if (!str) return '';
  const s = String(str).trim();
  if (s.length <= startVisible + endVisible) return s;
  const start = s.substring(0, startVisible);
  const end = s.substring(s.length - endVisible);
  const stars = '*'.repeat(Math.max(s.length - startVisible - endVisible, 3));
  return `${start}${stars}${end}`;
}

// 3. API Tra cứu thông tin cá nhân
app.post('/api/lookup', (req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  // Kiểm tra khóa tạm thời IP vi phạm tra cứu sai liên tiếp
  const ipData = ipRateMap.get(clientIp) || { attempts: 0, failCount: 0, blockedUntil: 0, lastAttempt: now };
  if (ipData.blockedUntil > now) {
    const remainSec = Math.ceil((ipData.blockedUntil - now) / 1000);
    return res.status(429).json({
      success: false,
      message: `Bạn đã thử sai quá nhiều lần. Vui lòng thử lại sau ${remainSec} giây để đảm bảo an toàn thông tin.`
    });
  }

  const { cccd, captchaToken, captchaAnswer } = req.body;

  // Kiểm tra đầu vào
  if (!cccd || typeof cccd !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Vui lòng nhập số Căn cước công dân (12 chữ số).'
    });
  }

  // Xác thực CAPTCHA
  const captcha = captchaStore.get(captchaToken);
  if (!captcha) {
    return res.status(400).json({
      success: false,
      needNewCaptcha: true,
      message: 'Mã xác nhận bảo mật đã hết hạn. Vui lòng thử lại với mã mới.'
    });
  }

  if (parseInt(captchaAnswer, 10) !== captcha.answer) {
    captchaStore.delete(captchaToken);
    return res.status(400).json({
      success: false,
      needNewCaptcha: true,
      message: 'Kết quả phép tính xác nhận bảo mật không đúng.'
    });
  }

  // Hủy token captcha sau khi dùng 1 lần (One-Time Token)
  captchaStore.delete(captchaToken);

  // Chuẩn hóa CCCD (loại bỏ khoảng trắng, kiểm tra định dạng)
  let cleanCCCD = cccd.replace(/\s+/g, '');
  if (!/^\d{9,12}$/.test(cleanCCCD)) {
    return res.status(400).json({
      success: false,
      message: 'Số CCCD không đúng định dạng (phải gồm 12 chữ số).'
    });
  }
  if (cleanCCCD.length < 12) {
    cleanCCCD = cleanCCCD.padStart(12, '0');
  }

  // Tra cứu trong cơ sở dữ liệu
  const record = teachersMap.get(cleanCCCD);

  if (!record) {
    ipData.failCount = (ipData.failCount || 0) + 1;
    ipData.lastAttempt = now;
    if (ipData.failCount >= 5) {
      ipData.blockedUntil = now + 3 * 60 * 1000; // Khóa 3 phút
    }
    ipRateMap.set(clientIp, ipData);

    return res.status(404).json({
      success: false,
      needNewCaptcha: true,
      message: 'Không tìm thấy thông tin hoặc số CCCD chưa đúng. Vui lòng kiểm tra lại chính xác.'
    });
  }

  // Tra cứu thành công - Reset số lần fail
  ipData.failCount = 0;
  ipData.lastAttempt = now;
  ipRateMap.set(clientIp, ipData);

  const confirmation = confirmationsMap.get(cleanCCCD) || null;

  // Trả về DUY NHẤT dữ liệu phiếu lương của nhân sự này
  return res.json({
    success: true,
    data: {
      stt: record.stt,
      ho_ten: record.ho_ten,
      cccd_masked: maskString(record.cccd, 4, 3),
      cccd_full: record.cccd,
      luong_chinh: record.luong_chinh !== undefined ? record.luong_chinh : 0,
      pc_uudai: record.pc_uudai !== undefined ? record.pc_uudai : 0,
      tham_nien: record.tham_nien !== undefined ? record.tham_nien : 0,
      pc_trach_nhiem: record.pc_trach_nhiem !== undefined ? record.pc_trach_nhiem : 0,
      hs_nq27: record.hs_nq27 !== undefined ? record.hs_nq27 : 1.5,
      nq27_q3: record.nq27_q3 !== undefined ? record.nq27_q3 : 0,
      tong_thu_nhap: record.tong_thu_nhap !== undefined ? record.tong_thu_nhap : 0,
      tam_ung: record.tam_ung !== undefined ? record.tam_ung : 0,
      bao_hiem: record.bao_hiem !== undefined ? record.bao_hiem : 0,
      truy_thu: record.truy_thu !== undefined ? record.truy_thu : 0,
      phu_thuoc: record.phu_thuoc || '',
      thue_tncn: record.thue_tncn !== undefined ? record.thue_tncn : 0,
      tong_khau_tru: record.tong_khau_tru !== undefined ? record.tong_khau_tru : 0,
      thuc_linh: record.thuc_linh !== undefined ? record.thuc_linh : 0,
      period: 'THÁNG 10, 11, Q3 NĂM 2026',
      confirmation: confirmation
    }
  });
});

// 4. API Xác nhận thông tin lương
app.post('/api/confirm', async (req, res) => {
  const { cccd, status, note } = req.body;

  if (!cccd || typeof cccd !== 'string') {
    return res.status(400).json({ success: false, message: 'Số CCCD không hợp lệ.' });
  }

  let cleanCCCD = cccd.replace(/\s+/g, '');
  if (cleanCCCD.length < 12) {
    cleanCCCD = cleanCCCD.padStart(12, '0');
  }

  const teacher = teachersMap.get(cleanCCCD);
  if (!teacher) {
    return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin nhân sự để xác nhận.' });
  }

  const validStatuses = ['Đúng thông tin', 'Chưa đúng thông tin'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Trạng thái xác nhận không hợp lệ.' });
  }

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} - ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const confirmRecord = {
    status: status,
    note: (note || '').trim(),
    confirmedAt: now.toISOString(),
    confirmedAtStr: timeStr
  };

  confirmationsMap.set(cleanCCCD, confirmRecord);
  saveConfirmationsToFile();

  console.log(`[CONFIRM] ${teacher.ho_ten} (${cleanCCCD}) đã xác nhận: "${status}" lúc ${timeStr}`);

  // Tự động đồng bộ thẳng vào Google Sheet gốc qua Webhook (nếu được cấu hình)
  let webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbzVF4UmUM_c8o6FmOndH2exnI61ndFcRYIUkt7yeq1b275jeo7aTXTAbbqX8ANZ02yk/exec';
  try {
    const configPath = path.join(__dirname, 'config.json');
    if (fs.existsSync(configPath)) {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (cfg.google_sheet_webhook_url) {
        webhookUrl = cfg.google_sheet_webhook_url;
      }
    }
  } catch (err) {
    // ignore
  }

  let sheetSyncSuccess = false;
  if (webhookUrl && webhookUrl.startsWith('http')) {
    try {
      const sheetResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        redirect: 'follow',
        body: JSON.stringify({
          cccd: cleanCCCD,
          status: status,
          note: (note || '').trim(),
          ho_ten: teacher.ho_ten,
          ms: teacher.ms || cleanCCCD,
          stt: teacher.stt
        })
      });
      const result = await sheetResponse.json().catch(() => null);
      sheetSyncSuccess = !!(result && result.success);
      console.log(`[GOOGLE SHEETS SYNC] Kết quả đồng bộ cho ${teacher.ho_ten}:`, result);
    } catch (err) {
      console.error(`[GOOGLE SHEETS SYNC] Lỗi khi gửi sang Google Sheets:`, err.message);
    }
  }

  return res.json({
    success: true,
    message: 'Xác nhận thông tin thành công!',
    confirmation: confirmRecord,
    sheetSync: sheetSyncSuccess
  });
});

// 5. Đã tắt chức năng xuất dữ liệu trên web để bảo vệ thông tin
app.get('/api/confirmations/export', (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Chức năng xuất kết quả trên web đã bị vô hiệu hóa vì lý do an toàn thông tin.'
  });
});

// Khởi chạy server nếu chạy trực tiếp
if (require.main === module || !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`[CỔNG TRA CỨU LƯƠNG GIÁO VIÊN] Đang chạy tại:`);
    console.log(`  - Local:    http://localhost:${PORT}`);
    console.log(`  - Mạng LAN: http://0.0.0.0:${PORT}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
