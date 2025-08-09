// app.js
const DATA_FILE = 'certificates.json'; // ملف البيانات
let certificates = {};
const resultEl = document.getElementById('result');
const certInput = document.getElementById('certInput');
const searchBtn = document.getElementById('searchBtn');
const toggleScanBtn = document.getElementById('toggleScanBtn');
const stopScanBtn = document.getElementById('stopScanBtn');
const qrReaderEl = document.getElementById('qr-reader');
const yearEl = document.getElementById('year');

yearEl.textContent = new Date().getFullYear();

// جلب بيانات الشهادات من JSON
async function loadCertificates() {
  try {
    const res = await fetch(DATA_FILE + '?t=' + Date.now());
    if (!res.ok) throw new Error('فشل تحميل ملف البيانات');
    certificates = await res.json();
  } catch (err) {
    showError('حدث خطأ عند تحميل بيانات الشهادات: ' + err.message);
  }
}

// عرض خطأ
function showError(msg) {
  resultEl.style.display = 'block';
  resultEl.innerHTML = `<div class="bad"><div class="title">خطأ</div><div>${escapeHtml(msg)}</div></div>`;
}

// عرض نتيجة صالحة
function showValid(cert) {
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div class="good">
      <div class="title">✅ الشهادة صالحة</div>
      <div class="detail"><strong>رقم الشهادة:</strong> ${escapeHtml(cert.serial)}</div>
      <div class="detail"><strong>اسم المتدرب:</strong> ${escapeHtml(cert.name)}</div>
      <div class="detail"><strong>البرنامج:</strong> ${escapeHtml(cert.course)}</div>
      <div class="detail"><strong>تاريخ الإصدار:</strong> ${escapeHtml(cert.date)}</div>
      <div class="detail"><strong>الحالة:</strong> ${escapeHtml(cert.status)}</div>
    </div>
  `;
}

// عرض نتيجة غير موجودة
function showNotFound(serial) {
  resultEl.style.display = 'block';
  resultEl.innerHTML = `<div class="bad"><div class="title">❌ الشهادة غير موجودة</div><div>لم يتم العثور على الشهادة: <strong>${escapeHtml(serial)}</strong></div></div>`;
}

// حماية بسيطة لطباعة النص في HTML
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"'`=\/]/g, function (s) {
    return {
      '&': '&amp;', '<': '&lt;', '>': '&gt;',
      '"': '&quot;', "'": '&#39;', '/': '&#x2F;', '`':'&#96;', '=':'&#61;'
    }[s];
  });
}

// تحقق من رقم الشهادة
function verifySerial(serial) {
  if (!serial) return showError('يرجى إدخال رقم الشهادة');
  const key = serial.trim();
  if (certificates.hasOwnProperty(key)) {
    showValid({...certificates[key], serial: key});
  } else {
    showNotFound(key);
  }
}

// معالجة زر البحث
searchBtn.addEventListener('click', () => {
  const v = certInput.value;
  verifySerial(v);
});

// دعم استعلام URL ?cert=...
function checkQueryParam() {
  const params = new URLSearchParams(window.location.search);
  const cert = params.get('cert');
  if (cert) {
    certInput.value = cert;
    verifySerial(cert);
  }
}

// QR Scanner: html5-qrcode
let html5QrcodeScanner = null;
let isScanning = false;

function startScanner() {
  if (isScanning) return;
  qrReaderEl.style.display = 'block';
  toggleScanBtn.style.display = 'none';
  stopScanBtn.style.display = 'inline-block';

  const config = { fps: 10, qrbox: 250, rememberLastUsedCamera: true };

  html5QrcodeScanner = new Html5Qrcode(/* element id */ "qr-reader");
  Html5Qrcode.getCameras().then(cameras => {
    const cameraId = cameras && cameras.length ? cameras[0].id : null;
    html5QrcodeScanner.start(
      cameraId,
      config,
      qrCodeMessage => {
        // عند قراءة الكود، نتوقع أن يحتوي على رابط ينتهي بـ ?cert=SERIAL أو مجرد SERIAL
        // نحستخرج قيمة serial
        handleQrResult(qrCodeMessage);
        stopScanner(); // إيقاف المسح بعد قراءة ناجحة
      },
      errorMessage => {
        // أخطاء المسح يمكن تجاهلها
        // console.log("QR scan error", errorMessage);
      }
    ).catch(err => {
      showError('فشل بدء الكاميرا: ' + err);
      toggleScanBtn.style.display = 'inline-block';
      stopScanBtn.style.display = 'none';
    });
    isScanning = true;
  }).catch(err => {
    showError('لا يمكن الوصول إلى الكاميرا: ' + err);
  });
}

function stopScanner() {
  if (!isScanning || !html5QrcodeScanner) return;
  html5QrcodeScanner.stop().then(() => {
    html5QrcodeScanner.clear();
    qrReaderEl.style.display = 'none';
    toggleScanBtn.style.display = 'inline-block';
    stopScanBtn.style.display = 'none';
    isScanning = false;
  }).catch(err => {
    // ignore
    qrReaderEl.style.display = 'none';
    toggleScanBtn.style.display = 'inline-block';
    stopScanBtn.style.display = 'none';
    isScanning = false;
  });
}

function handleQrResult(text) {
  // حالات: رابط كامل يحتوي على ?cert=RA-2025-001
  try {
    const url = new URL(text);
    const p = url.searchParams.get('cert');
    if (p) {
      certInput.value = p;
      verifySerial(p);
      return;
    }
  } catch (e) {
    // ليس رابطًا، قد يكون السيريال مباشرة
  }
  // إذا كان النص هو السيريال نفسه
  certInput.value = text;
  verifySerial(text);
}

// أحداث التحكم
toggleScanBtn.addEventListener('click', () => startScanner());
stopScanBtn.addEventListener('click', () => stopScanner());

// تحميل البيانات ثم فحص باراميتر url
loadCertificates().then(() => {
  checkQueryParam();
});
