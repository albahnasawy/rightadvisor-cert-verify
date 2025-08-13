document.addEventListener('DOMContentLoaded', () => {
    const verificationCodeInput = document.getElementById('verificationCode');
    const verifyButton = document.getElementById('verifyButton');
    const scanQrButton = document.getElementById('scanQrButton');
    const certificateDetails = document.getElementById('certificateDetails');
    const qrReader = document.getElementById('qr-reader');
    const githubPagesBaseUrl = "https://albahnasawy.github.io/rightadvisor-cert-verify/"; // Your GitHub Pages URL

    let certificates = [];

    // Function to load certificates data
    async function loadCertificates() {
        try {
            const response = await fetch('certificates.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            certificates = await response.json();
            console.log('Certificates loaded:', certificates);
        } catch (error) {
            console.error('Error loading certificates:', error);
            certificateDetails.innerHTML = '<p class="error-message">حدث خطأ أثناء تحميل بيانات الشهادات. يرجى المحاولة لاحقًا.</p>';
        }
    }

    // Function to display certificate details
    function displayCertificate(certificate) {
        if (certificate) {
            certificateDetails.innerHTML = `
                <p><strong>رمز التحقق:</strong> ${certificate['Verification Code']}</p>
                <p><strong>اسم المتدرب:</strong> ${certificate['Trainee Name']}</p>
                <p><strong>اسم الدورة:</strong> ${certificate['Course Name']}</p>
                <p><strong>موضوع الدورة:</strong> ${certificate['Course Topic']}</p>
                <p><strong>تاريخ الإصدار:</strong> ${certificate['Issue Date']}</p>
                <p><strong>رمز الشركة:</strong> ${certificate['Company Code']}</p>
                <p><strong>رمز الدورة:</strong> ${certificate['Course Code']}</p>
                <p><strong>الشهر/السنة:</strong> ${certificate['Month/Year']}</p>
                <p><strong>الموجة:</strong> ${certificate['Wave']}</p>
                <p><strong>هوية المتدرب:</strong> ${certificate['Trainee ID']}</p>
            `;
        } else {
            certificateDetails.innerHTML = '<p class="error-message">لم يتم العثور على شهادة بهذا الرمز.</p>';
        }
    }

    // Manual verification by code
    verifyButton.addEventListener('click', () => {
        const code = verificationCodeInput.value.trim();
        if (code) {
            const foundCertificate = certificates.find(cert => cert['Verification Code'] === code);
            displayCertificate(foundCertificate);
        } else {
            certificateDetails.innerHTML = '<p class="error-message">الرجاء إدخال رمز التحقق.</p>';
        }
    });

    // QR Code Scanning
    let html5QrCode;

    scanQrButton.addEventListener('click', () => {
        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader");
        }

        if (html5QrCode.is=>Scanning) {
            html5QrCode.stop().then(ignore => {
                scanQrButton.textContent = 'مسح QR Code بالكاميرا';
                certificateDetails.innerHTML = '<p>أدخل رمز التحقق أو امسح QR Code لعرض تفاصيل الشهادة.</p>';
            }).catch(err => {
                console.error("Failed to stop QR scanner:", err);
            });
            return;
        }

        // Start scanning
        html5QrCode.start(
            { facingMode: "environment" }, // Prefer rear camera
            {
                fps: 10,    // frames per second
                qrbox: { width: 250, height: 250 }  // Area of scanning
            },
            (decodedText, decodedResult) => {
                // Handle success
                console.log(`QR Code detected: ${decodedText}`);
                let codeFromQr = decodedText;

                // If QR code is a URL, extract the 'code' parameter
                if (decodedText.startsWith(githubPagesBaseUrl)) {
                    try {
                        const url = new URL(decodedText);
                        codeFromQr = url.searchParams.get('code');
                    } catch (e) {
                        console.error("Invalid QR code URL:", e);
                    }
                }

                if (codeFromQr) {
                    const foundCertificate = certificates.find(cert => cert['Verification Code'] === codeFromQr);
                    displayCertificate(foundCertificate);
                    html5QrCode.stop(); // Stop scanning after finding
                    scanQrButton.textContent = 'مسح QR Code بالكاميرا';
                } else {
                    certificateDetails.innerHTML = '<p class="error-message">رمز QR غير صالح أو مفقود.</p>';
                }
            },
            (errorMessage) => {
                // Handle error (e.g., no QR code found in video stream)
                // console.warn(`QR Code no longer in view, error: ${errorMessage}`);
            }
        ).then(() => {
            scanQrButton.textContent = 'إيقاف المسح';
        }).catch((err) => {
            console.error(`Unable to start scanning: ${err}`);
            certificateDetails.innerHTML = `<p class="error-message">تعذر بدء الكاميرا: ${err.message}. يرجى التأكد من السماح بالوصول إلى الكاميرا.</p>`;
        });
    });

    // Load certificates when the page loads
    loadCertificates();

    // Handle direct URL access with a verification code (e.g., from QR code link)
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('code');
    if (codeFromUrl) {
        // Wait for certificates to load before searching
        loadCertificates().then(() => {
            const foundCertificate = certificates.find(cert => cert['Verification Code'] === codeFromUrl);
            displayCertificate(foundCertificate);
            verificationCodeInput.value = codeFromUrl; // Pre-fill the input
        });
    }
});
