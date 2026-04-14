/**
 * noss.js - Prevent Copy-Paste, Right-Click and Basic Screenshot Protection
 */

(function() {
    // ၁။ Right-click ပိတ်ခြင်း
    document.addEventListener('contextmenu', e => e.preventDefault());

    // ၂။ စာသား Copy ကူးခြင်း၊ ဖြတ်ခြင်း၊ Selection မှတ်ခြင်းများကို ပိတ်ခြင်း
    document.addEventListener('selectstart', e => e.preventDefault());
    document.addEventListener('copy', e => e.preventDefault());
    document.addEventListener('cut', e => e.preventDefault());

    // ၃။ Keyboard Shortcuts များ (F12, Ctrl+Shift+I, Ctrl+U, Ctrl+P, PrintScreen) ကို ပိတ်ခြင်း
    document.addEventListener('keydown', function(e) {
        // F12 (Developer Tools)
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }

        // Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+U (View Source)
        if (e.ctrlKey && (e.shiftKey && (e.key === 'I' || e.key === 'J') || e.key === 'u' || e.key === 'U')) {
            e.preventDefault();
            return false;
        }

        // Ctrl+P (Print - Print screen ရိုက်ရင် ဒါကနေ ရိုက်လေ့ရှိလို့ ပိတ်ထားသင့်ပါတယ်)
        if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
            alert('Printing is disabled.');
            e.preventDefault();
            return false;
        }
        
        // Ctrl+S (Save page)
        if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
            return false;
        }
    });

    // ၄။ Screenshot ရိုက်ရန် ကြိုးစားပါက (Print Screen) Content ကို ဝှက်ခြင်း
    // ဒါက Windows မှာ PrintScreen နှိပ်လိုက်ရင် Clipboard ထဲ Content မရောက်အောင် ကူညီပေးနိုင်ပါတယ်
    document.addEventListener('keyup', function(e) {
        if (e.key === 'PrintScreen') {
            navigator.clipboard.writeText(""); // Clipboard ကို ဖျက်ထုတ်ပစ်ခြင်း
            alert('Screenshots are restricted on this website.');
        }
    });

    // ၅။ Print ထုတ်တဲ့အခါ Black Screen သို့မဟုတ် ပုံတစ်ပုံပဲ ပေါ်စေခြင်း (CSS Injection)
    const style = document.createElement('style');
    style.innerHTML = `
        @media print {
            body { display: none !important; }
            html::after {
                content: "";
                position: fixed;
                top: 0; left: 0; width: 100%; height: 100%;
                background-color: black;
                background-image: url('img/noss.png'); /* ဤနေရာတွင် သင့်ပုံလမ်းကြောင်း ပြောင်းနိုင်သည် */
                background-repeat: no-repeat;
                background-position: center;
                background-size: contain;
                z-index: 99999;
            }
        }
        /* စာသားတွေကို selection မှတ်လို့မရအောင် CSS နဲ့ပါ ထပ်ပိတ်ခြင်း */
        body {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
        }
    `;
    document.head.appendChild(style);

    // ၆။ Console ဖွင့်မရအောင် လှည့်စားခြင်း
    setInterval(() => {
        const start = Date.now();
        debugger;
        const end = Date.now();
        if (end - start > 100) {
            document.body.innerHTML = "<h1>Security Alert: Developer Tools Detected!</h1>";
        }
    }, 1000);

})();
