/**
 * noss.js - Advanced Content Protection (Copy/Paste, Right-Click, Print, Blur on Screenshot/Gestures)
 */

(function() {
    // ၁။ CSS Injection - စာသားရွေးမရအောင်နှင့် Blur effect အတွက် style များထည့်ခြင်း
    const style = document.createElement('style');
    style.innerHTML = `
        /* စာသား selection ပိတ်ခြင်း */
        * {
            -webkit-touch-callout: none !important;
            -webkit-user-select: none !important;
            -khtml-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
        }
        
        /* Blur effect class */
        .content-blur {
            filter: blur(20px) !important;
            transition: filter 0.2s ease;
        }

        /* Print ထုတ်ရင် အမည်းရောင်ပဲပေါ်စေရန် */
        @media print {
            body { display: none !important; }
            html::after {
                content: "Unauthorized Access";
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: black; color: white;
                display: flex; align-items: center; justify-content: center;
                font-size: 30px; z-index: 99999;
            }
        }
    `;
    document.head.appendChild(style);

    // ၂။ လက်သုံးချောင်း Gestures စစ်ဆေးခြင်း (Mobile Screenshot Detection Trick)
    // လက်သုံးချောင်း screen ပေါ်ထိလိုက်တာနဲ့ content ကို blur လုပ်ပစ်ပါမယ်
    document.addEventListener('touchstart', function(e) {
        if (e.touches.length >= 3) {
            document.body.classList.add('content-blur');
            // ၃ စက္ကန့်ကြာရင် blur ပြန်ဖြုတ်မယ် (သို့မဟုတ် user က လက်ပြန်လွှတ်ရင်)
            setTimeout(() => {
                document.body.classList.remove('content-blur');
            }, 3000);
        }
    }, {passive: false});

    document.addEventListener('touchend', function() {
        document.body.classList.remove('content-blur');
    });

    // ၃။ App switching လုပ်ရင် (သို့မဟုတ်) Screenshot ခလုတ်နှိပ်ရင် Blur လုပ်ခြင်း
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            document.body.classList.add('content-blur');
        } else {
            document.body.classList.remove('content-blur');
        }
    });

    // ၄။ Right-click, Copy, Cut, Paste ပိတ်ခြင်း
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('copy', e => e.preventDefault());
    document.addEventListener('cut', e => e.preventDefault());
    document.addEventListener('paste', e => e.preventDefault());

    // ၅။ Keyboard Shortcut များ ပိတ်ခြင်း (PC အတွက်)
    document.addEventListener('keydown', function(e) {
        // F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S, Ctrl+P
        if (
            e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
            (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S'))
        ) {
            e.preventDefault();
            return false;
        }
    });

    // ၆။ Print Screen ခလုတ်နှိပ်ပါက Clipboard ရှင်းလင်းခြင်း
    document.addEventListener('keyup', function(e) {
        if (e.key === 'PrintScreen') {
            navigator.clipboard.writeText("");
            document.body.classList.add('content-blur');
            alert('Screenshot restricted!');
            setTimeout(() => document.body.classList.remove('content-blur'), 2000);
        }
    });

    // ၇။ Developer Tools (Inspect Element) ဖွင့်ထားခြင်း ရှိမရှိ စစ်ဆေးခြင်း
    setInterval(() => {
        const threshold = 160;
        if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
            document.body.innerHTML = "<div style='display:flex; justify-content:center; align-items:center; height:100vh; background:black; color:red; font-size:24px; text-align:center; padding:20px;'>Security Alert: Inspector Detected! Please close DevTools.</div>";
        }
    }, 1000);

})();
