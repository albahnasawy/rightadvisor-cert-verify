// JavaScript لمعالجة منطق الصفحة
document.addEventListener('DOMContentLoaded', () => {
    const serialNumberInput = document.getElementById('serialNumberInput');
    const verifyButton = document.getElementById('verifyButton');
    const toggleQrScanButton = document.getElementById('toggleQrScanButton');
    const readerDiv = document.getElementById('reader');
    const qrResultDiv = document.getElementById('qr-result');
    const certificateDetailsDiv = document.getElementById('certificateDetails');

    let certificatesData = [];
    let html5QrCode = null;

    // دالة لعرض الرسائل في صندوق مخصص
    function displayMessage(message, type) {
        certificateDetailsDiv.innerHTML = `<div class="message-box ${type}-message">${message}</div>`;
    }

    // جلب بيانات الشهادات من ملف certificates.json
    fetch('/certificates.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            certificatesData = data;
            console.log('Certificates loaded successfully.');
        })
        .catch(error => {
            console.error('Error fetching certificates:', error);
            displayMessage('حدث خطأ أثناء تحميل بيانات الشهادات. يرجى التأكد من وجود الملف.', 'error');
        });

    // دالة لعرض تفاصيل الشهادة
    function displayCertificate(certificate) {
        certificateDetailsDiv.innerHTML = `
            <div class="certificate-info">
                <p><strong>اسم المتدرب:</strong> ${certificate.traineeName}</p>
                <p><strong>الموضوع:</strong> ${certificate.topic}</p>
                <p><strong>تاريخ الإصدار:</strong> ${certificate.issueDate}</p>
                <p><strong>الجهة المانحة:</strong> Right Advisor</p>
                <p><strong>رقم الشهادة:</strong> ${certificate.serialNumber}</p>
            </div>
        `;
    }

    // دالة البحث عن الشهادة برقمها
    function searchCertificate(serialNumber) {
        const foundCertificate = certificatesData.find(cert => cert.serialNumber === serialNumber);
        if (foundCertificate) {
            displayCertificate(foundCertificate);
            return true;
        } else {
            displayMessage('عذرًا، لم يتم العثور على شهادة بهذا الرقم. يرجى التأكد من الرقم والمحاولة مرة أخرى.', 'error');
            return false;
        }
    }

    // معالج حدث للبحث اليدوي
    verifyButton.addEventListener('click', () => {
        const serialNumber = serialNumberInput.value.trim();
        if (serialNumber) {
            searchCertificate(serialNumber);
        } else {
            displayMessage('الرجاء إدخال رقم الشهادة للبحث.', 'info');
        }
    });

    // معالج حدث لمسح الـ QR Code
    toggleQrScanButton.addEventListener('click', () => {
        if (html5QrCode && html5QrCode.isScanning) {
            // إيقاف الماسح إذا كان يعمل
            html5QrCode.stop().then(() => {
                console.log("QR Code scanning stopped.");
                readerDiv.style.display = 'none';
                qrResultDiv.style.display = 'none';
                toggleQrScanButton.textContent = 'بدء مسح QR Code';
                displayMessage('تم إيقاف الماسح الضوئي.', 'info');
            }).catch(err => {
                console.error("Error stopping QR Code scanner:", err);
            });
        } else {
            // بدء الماسح
            readerDiv.style.display = 'block';
            qrResultDiv.style.display = 'block';
            toggleQrScanButton.textContent = 'إيقاف المسح';
            qrResultDiv.textContent = 'جارٍ تشغيل الكاميرا...';
            
            if (!html5QrCode) {
                html5QrCode = new Html5Qrcode("reader");
            }

            const config = { fps: 10, qrbox: { width: 250, height: 250 } };
            
            html5QrCode.start({ facingMode: "environment" }, config,
                (decodedText, decodedResult) => {
                    // عند المسح بنجاح
                    qrResultDiv.textContent = `تم مسح: ${decodedText}`;
                    searchCertificate(decodedText);
                    // إيقاف الماسح بعد نجاح العملية
                    if (html5QrCode.isScanning) {
                        html5QrCode.stop().then(() => {
                            readerDiv.style.display = 'none';
                            toggleQrScanButton.textContent = 'بدء مسح QR Code';
                        }).catch(err => console.error("Error stopping scanner after scan:", err));
                    }
                },
                (errorMessage) => {
                    // noop - this is called continuously when no QR is found
                }
            ).catch((err) => {
                console.error(`Unable to start scanning: ${err}`);
                displayMessage('لا يمكن تشغيل الكاميرا. تأكد من إعطاء إذن الوصول للكاميرا أو أنها ليست قيد الاستخدام.', 'error');
                readerDiv.style.display = 'none';
                toggleQrScanButton.textContent = 'بدء مسح QR Code';
                qrResultDiv.style.display = 'none';
            });
        }
    });
});
