document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const lookupForm = document.getElementById('lookupForm');
  const cccdInput = document.getElementById('cccdInput');
  const btnClearCccd = document.getElementById('btnClearCccd');
  const captchaQuestion = document.getElementById('captchaQuestion');
  const captchaInput = document.getElementById('captchaInput');
  const btnRefreshCaptcha = document.getElementById('btnRefreshCaptcha');
  const alertMessage = document.getElementById('alertMessage');
  const btnSubmit = document.getElementById('btnSubmit');

  const searchSection = document.getElementById('searchSection');
  const resultSection = document.getElementById('resultSection');

  // Values display elements
  const valHoTen = document.getElementById('valHoTen');
  const valMs = document.getElementById('valMs');
  const valCccd = document.getElementById('valCccd');
  const valChucVu = document.getElementById('valChucVu');
  const valMaNgach = document.getElementById('valMaNgach');
  const valSoTk = document.getElementById('valSoTk');
  const btnToggleBank = document.getElementById('btnToggleBank');
  const eyeIcon = document.getElementById('eyeIcon');

  const valHsl = document.getElementById('valHsl');
  const valPccv = document.getElementById('valPccv');
  const valTnvk = document.getElementById('valTnvk');
  const valUdgv = document.getElementById('valUdgv');
  const valTnng = document.getElementById('valTnng');

  const countdownText = document.getElementById('countdownText');
  const btnPrint = document.getElementById('btnPrint');
  const btnPrint2 = document.getElementById('btnPrint2');
  const btnCloseResult = document.getElementById('btnCloseResult');
  const btnCloseResult2 = document.getElementById('btnCloseResult2');

  // Confirmation Elements
  const confirmSection = document.querySelector('.confirmation-section');
  const confirmedAlert = document.getElementById('confirmedAlert');
  const confirmedStatusTitle = document.getElementById('confirmedStatusTitle');
  const confirmedStatusDesc = document.getElementById('confirmedStatusDesc');
  const confirmedTime = document.getElementById('confirmedTime');
  const confirmedNoteWrap = document.getElementById('confirmedNoteWrap');
  const confirmedNoteText = document.getElementById('confirmedNoteText');
  const btnReconfirm = document.getElementById('btnReconfirm');
  const confirmForm = document.getElementById('confirmForm');
  const confirmNote = document.getElementById('confirmNote');
  const btnConfirmSubmit = document.getElementById('btnConfirmSubmit');
  const confirmAlertMsg = document.getElementById('confirmAlertMsg');
  const statusIconWrap = document.getElementById('statusIconWrap');

  // State
  let currentCaptchaToken = '';
  let countdownTimer = null;
  let remainingSeconds = 120;
  let currentRecord = null;
  let isBankMasked = true;

  // 1. Tải CAPTCHA từ server
  async function fetchCaptcha() {
    try {
      captchaQuestion.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      const res = await fetch('/api/captcha');
      const data = await res.json();
      currentCaptchaToken = data.token;
      captchaQuestion.textContent = data.question;
      captchaInput.value = '';
    } catch (err) {
      captchaQuestion.textContent = 'Lỗi kết nối';
      console.error('Không thể tải mã bảo vệ:', err);
    }
  }

  fetchCaptcha();

  btnRefreshCaptcha.addEventListener('click', () => {
    fetchCaptcha();
  });

  // Chỉ cho phép nhập số vào ô CCCD
  cccdInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    if (e.target.value.length > 0) {
      btnClearCccd.style.display = 'block';
    } else {
      btnClearCccd.style.display = 'none';
    }
  });

  btnClearCccd.addEventListener('click', () => {
    cccdInput.value = '';
    btnClearCccd.style.display = 'none';
    cccdInput.focus();
  });

  // Hiển thị thông báo lỗi/thành công
  function showAlert(msg, type = 'danger') {
    alertMessage.className = `alert-box alert-${type}`;
    alertMessage.innerHTML = `<i class="fa-solid ${type === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i> <span>${msg}</span>`;
    alertMessage.classList.remove('d-none');
  }

  function hideAlert() {
    alertMessage.classList.add('d-none');
    alertMessage.innerHTML = '';
  }

  // Định dạng tiền tệ VND
  function formatMoney(amount) {
    if (!amount || isNaN(amount)) return '0 đ';
    return Number(amount).toLocaleString('vi-VN') + ' đ';
  }

  // Định dạng phần trăm
  function formatPercent(val) {
    if (!val || val === 0) return '0%';
    const pct = Math.round(val * 100);
    return `${pct}%`;
  }

  // 2. Xử lý gửi Form Tra cứu
  lookupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const cccd = cccdInput.value.trim();
    const captchaAnswer = captchaInput.value.trim();

    if (!cccd || cccd.length < 9) {
      showAlert('Vui lòng nhập đầy đủ số Căn cước công dân hợp lệ.');
      cccdInput.focus();
      return;
    }

    if (!captchaAnswer) {
      showAlert('Vui lòng nhập kết quả phép tính bảo mật.');
      captchaInput.focus();
      return;
    }

    // Trạng thái loading
    btnSubmit.disabled = true;
    btnSubmit.querySelector('.btn-text').classList.add('d-none');
    btnSubmit.querySelector('.btn-loading').classList.remove('d-none');

    try {
      const response = await fetch('/api/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cccd: cccd,
          captchaToken: currentCaptchaToken,
          captchaAnswer: captchaAnswer
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        showAlert(result.message || 'Tra cứu không thành công. Vui lòng thử lại.');
        fetchCaptcha();
        return;
      }

      // Tra cứu thành công: Hiển thị kết quả
      currentRecord = result.data;
      displayResult(result.data);

    } catch (err) {
      console.error(err);
      showAlert('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại đường truyền mạng.');
      fetchCaptcha();
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.querySelector('.btn-text').classList.remove('d-none');
      btnSubmit.querySelector('.btn-loading').classList.add('d-none');
    }
  });

  // 3. Hiển thị thông tin lên giao diện
  function displayResult(data) {
    isBankMasked = true;
    updateBankDisplay();

    valHoTen.textContent = data.ho_ten || '---';
    valMs.textContent = data.ms || '---';
    valCccd.textContent = data.cccd_full || '---';
    valChucVu.textContent = data.chuc_vu || '---';
    valMaNgach.textContent = data.ma_ngach || '---';

    valHsl.textContent = Number(data.hsl).toFixed(2);
    valPccv.textContent = Number(data.pccv).toFixed(2);
    valTnvk.textContent = formatPercent(data.tnvk);
    valUdgv.textContent = formatPercent(data.udgv);
    valTnng.textContent = formatPercent(data.tnng);

    // Xử lý hiển thị khối xác nhận
    renderConfirmationUI(data.confirmation);

    searchSection.classList.add('d-none');
    resultSection.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    startAutoTimeout();
  }

  // Hiển thị trạng thái xác nhận
  function renderConfirmationUI(conf) {
    if (confirmAlertMsg) {
      confirmAlertMsg.classList.add('d-none');
      confirmAlertMsg.textContent = '';
    }

    if (conf && conf.status) {
      // Đã có xác nhận
      confirmedAlert.classList.remove('d-none');
      confirmForm.classList.add('d-none');

      const isCorrect = (conf.status === 'Đúng thông tin');
      confirmedAlert.className = `confirmed-status-box ${isCorrect ? '' : 'status-incorrect'}`;

      statusIconWrap.innerHTML = isCorrect 
        ? '<i class="fa-solid fa-circle-check"></i>' 
        : '<i class="fa-solid fa-triangle-exclamation"></i>';

      confirmedStatusTitle.textContent = isCorrect 
        ? 'Bạn đã gửi xác nhận: Đúng thông tin' 
        : 'Bạn đã gửi phản hồi: Chưa đúng thông tin';

      confirmedStatusDesc.innerHTML = `Trạng thái: <strong>${conf.status}</strong>`;
      confirmedTime.textContent = `Thời gian ghi nhận: ${conf.confirmedAtStr || 'Đã ghi nhận'}`;

      if (conf.note && conf.note.trim()) {
        confirmedNoteWrap.classList.remove('d-none');
        confirmedNoteText.textContent = conf.note;
      } else {
        confirmedNoteWrap.classList.add('d-none');
      }

      // Pre-fill form
      const radio = confirmForm.querySelector(`input[name="confirmStatus"][value="${conf.status}"]`);
      if (radio) radio.checked = true;
      confirmNote.value = conf.note || '';

    } else {
      // Chưa xác nhận
      confirmedAlert.classList.add('d-none');
      confirmForm.classList.remove('d-none');
      const defaultRadio = confirmForm.querySelector('input[name="confirmStatus"][value="Đúng thông tin"]');
      if (defaultRadio) defaultRadio.checked = true;
      confirmNote.value = '';
    }
  }

  // Cho phép bấm nút "Cập nhật / Điều chỉnh phản hồi"
  btnReconfirm.addEventListener('click', () => {
    confirmedAlert.classList.add('d-none');
    confirmForm.classList.remove('d-none');
    confirmForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Gửi xác nhận thông tin lên server
  confirmForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentRecord) return;

    const checkedRadio = confirmForm.querySelector('input[name="confirmStatus"]:checked');
    const statusVal = checkedRadio ? checkedRadio.value : 'Đúng thông tin';
    const noteVal = confirmNote.value.trim();

    if (statusVal === 'Chưa đúng thông tin' && !noteVal) {
      confirmAlertMsg.className = 'alert-box alert-danger';
      confirmAlertMsg.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Vui lòng nhập nội dung sai sót vào ô Ghi chú để nhà trường kiểm tra hỗ trợ.';
      confirmAlertMsg.classList.remove('d-none');
      confirmNote.focus();
      return;
    }

    btnConfirmSubmit.disabled = true;
    btnConfirmSubmit.querySelector('.btn-confirm-text').classList.add('d-none');
    btnConfirmSubmit.querySelector('.btn-confirm-loading').classList.remove('d-none');

    try {
      const res = await fetch('/api/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cccd: currentRecord.cccd_full,
          status: statusVal,
          note: noteVal
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        confirmAlertMsg.className = 'alert-box alert-danger';
        confirmAlertMsg.textContent = data.message || 'Lỗi khi gửi xác nhận.';
        confirmAlertMsg.classList.remove('d-none');
        return;
      }

      // Cập nhật lại state
      currentRecord.confirmation = data.confirmation;
      renderConfirmationUI(data.confirmation);

    } catch (err) {
      console.error(err);
      confirmAlertMsg.className = 'alert-box alert-danger';
      confirmAlertMsg.textContent = 'Lỗi kết nối khi gửi xác nhận. Vui lòng thử lại.';
      confirmAlertMsg.classList.remove('d-none');
    } finally {
      btnConfirmSubmit.disabled = false;
      btnConfirmSubmit.querySelector('.btn-confirm-text').classList.remove('d-none');
      btnConfirmSubmit.querySelector('.btn-confirm-loading').classList.add('d-none');
    }
  });

  // Ẩn / Hiện số tài khoản ngân hàng
  function updateBankDisplay() {
    if (!currentRecord) return;
    if (isBankMasked) {
      valSoTk.textContent = currentRecord.so_tk_masked || '---';
      eyeIcon.className = 'fa-regular fa-eye-slash';
      btnToggleBank.title = 'Bấm để xem đầy đủ số tài khoản';
    } else {
      valSoTk.textContent = currentRecord.so_tk || '---';
      eyeIcon.className = 'fa-regular fa-eye';
      btnToggleBank.title = 'Bấm để ẩn số tài khoản';
    }
  }

  btnToggleBank.addEventListener('click', () => {
    isBankMasked = !isBankMasked;
    updateBankDisplay();
  });

  // 4. Cơ chế tự động khóa màn hình sau 120s không tương tác
  function startAutoTimeout() {
    if (countdownTimer) clearInterval(countdownTimer);
    remainingSeconds = 120;
    countdownText.textContent = remainingSeconds;

    countdownTimer = setInterval(() => {
      remainingSeconds--;
      countdownText.textContent = remainingSeconds;
      if (remainingSeconds <= 0) {
        clearInterval(countdownTimer);
        closeResultAndReset('Đã hết thời gian bảo mật (120 giây). Màn hình đã tự động xóa để bảo vệ thông tin.');
      }
    }, 1000);
  }

  // Xóa kết quả và quay lại tra cứu
  function closeResultAndReset(customMsg = null) {
    if (countdownTimer) clearInterval(countdownTimer);
    currentRecord = null;

    // Xóa sạch dữ liệu trong DOM
    valHoTen.textContent = '---';
    valMs.textContent = '---';
    valCccd.textContent = '---';
    valChucVu.textContent = '---';
    valMaNgach.textContent = '---';
    valSoTk.textContent = '---';

    confirmedAlert.classList.add('d-none');
    confirmForm.classList.remove('d-none');
    confirmNote.value = '';
    if (confirmAlertMsg) {
      confirmAlertMsg.classList.add('d-none');
      confirmAlertMsg.textContent = '';
    }

    resultSection.classList.add('d-none');
    searchSection.classList.remove('d-none');

    fetchCaptcha();
    cccdInput.value = '';
    btnClearCccd.style.display = 'none';

    if (customMsg) {
      showAlert(customMsg, 'danger');
    } else {
      hideAlert();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    cccdInput.focus();
  }

  btnCloseResult.addEventListener('click', () => closeResultAndReset());
  btnCloseResult2.addEventListener('click', () => closeResultAndReset());

  // 5. In phiếu lương
  const triggerPrint = () => {
    // Trước khi in, hiển thị số TK rõ ràng nếu có
    const prevMask = isBankMasked;
    isBankMasked = false;
    updateBankDisplay();

    window.print();

    // Phục hồi lại trạng thái
    setTimeout(() => {
      isBankMasked = prevMask;
      updateBankDisplay();
    }, 500);
  };

  btnPrint.addEventListener('click', triggerPrint);
  btnPrint2.addEventListener('click', triggerPrint);
});
