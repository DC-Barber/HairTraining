// guest-ui.js - Show info dialog when guest button is clicked

(function() {
    let currentLanguage = 'en'; // 'en' or 'my'
    
    // Check if guest mode is active (after login)
    function isGuestMode() {
        if (localStorage.getItem('guest_mode_active') === 'true') return true;
        
        try {
            const userData = localStorage.getItem('userData');
            if (userData) {
                const data = JSON.parse(userData);
                if (data.username && data.username.toLowerCase().startsWith('guest')) {
                    localStorage.setItem('guest_mode_active', 'true');
                    return true;
                }
            }
        } catch(e) {}
        
        try {
            if (typeof CONFIG !== 'undefined' && CONFIG.USER_DATA_KEY) {
                const userData = localStorage.getItem(CONFIG.USER_DATA_KEY);
                if (userData) {
                    const data = JSON.parse(userData);
                    if (data.username && data.username.toLowerCase().startsWith('guest')) {
                        localStorage.setItem('guest_mode_active', 'true');
                        return true;
                    }
                }
            }
        } catch(e) {}
        
        return false;
    }
    
    // Build dialog HTML based on language
    function getDialogContent() {
        const content = {
            en: {
                headerTitle: 'Guest Mode',
                headerSub: 'You are using a temporary account',
                important: '⚠️ Important: Guest accounts are temporary. No data will be saved.',
                tableTitle: '📋 Guest vs Registered',
                features: ['Feature', 'Guest', 'Registered'],
                row1: ['Read Training', '✅', '✅'],
                row2: ['View Ads', '✅', '✅'],
                row3: ['Take Exam', '❌', '✅'],
                row4: ['Save Progress', '❌', '✅'],
                row5: ['Profile Picture', '❌', '✅'],
                afterTitle: '📝 After Registration',
                afterText: 'Remember your username & password. Wait for Admin Approval to access exam.',
                helpTitle: '📞 Need Help?',
                helpText: 'Contact us on Telegram:',
                buttonText: 'Continue as Guest'
            },
            my: {
                headerTitle: 'ဧည့်သည်မုဒ်',
                headerSub: 'သင်သည် ယာယီအကောင့်ကို သုံးနေပါသည်',
                important: '⚠️ အရေးကြီး: ဧည့်သည်အကောင့်များသည် ယာယီဖြစ်သည်။ အချက်အလက်များ သိမ်းဆည်းမည်မဟုတ်ပါ။',
                tableTitle: '📋 ဧည့်သည် vs မှတ်ပုံတင်ထားသူ',
                features: ['အင်္ဂါရပ်', 'ဧည့်သည်', 'မှတ်ပုံတင်'],
                row1: ['အကြောင်းအရာဖတ်ရန်', '✅', '✅'],
                row2: ['ကြော်ငြာများကြည့်ရန်', '✅', '✅'],
                row3: ['စာမေးပွဲဖြေဆိုရန်', '❌', '✅'],
                row4: ['တိုးတက်မှုသိမ်းဆည်းရန်', '❌', '✅'],
                row5: ['ကိုယ်ရေးပုံတင်ရန်', '❌', '✅'],
                afterTitle: '📝 မှတ်ပုံတင်ပြီးနောက်',
                afterText: 'သင်၏ username နှင့် password ကို မှတ်ထားပါ။ စာမေးပွဲဖြေဆိုရန် အက်ဒမင်၏ အတည်ပြုချက်ကို စောင့်ဆိုင်းရပါမည်။',
                helpTitle: '📞 အကူအညီလိုပါက',
                helpText: 'တယ်လီဂရမ်တွင် ဆက်သွယ်နိုင်ပါသည်:',
                buttonText: 'ဧည့်သည်အဖြစ် ဆက်လုပ်ရန်'
            }
        };
        
        const lang = currentLanguage === 'en' ? content.en : content.my;
        
        return `
            <div style="background:#1e3a5f;padding:15px;text-align:center;border-radius:20px 20px 0 0;">
                <div style="font-size:40px;margin-bottom:5px;">🎭</div>
                <h3 style="color:white;margin:0;font-size:1.2rem;">${lang.headerTitle}</h3>
                <p style="color:rgba(255,255,255,0.8);margin:5px 0 0;font-size:0.7rem;">${lang.headerSub}</p>
            </div>
            
            <div style="padding:16px;">
                <!-- Language Toggle Button -->
                <div style="text-align:right;margin-bottom:12px;">
                    <button id="guest-lang-toggle" style="background:#f0f0f0;border:1px solid #ddd;padding:4px 10px;border-radius:20px;font-size:0.7rem;cursor:pointer;">
                        ${currentLanguage === 'en' ? '🇲🇲 မြန်မာ' : '🇬🇧 English'}
                    </button>
                </div>
                
                <!-- Notice Box -->
                <div style="background:#fff3e0;padding:10px;border-radius:12px;margin-bottom:15px;border-left:4px solid #ff9800;">
                    <p style="margin:0;font-size:0.7rem;color:#555;">${lang.important}</p>
                </div>
                
                <!-- Comparison Table -->
                <h4 style="color:#1e3a5f;margin:0 0 8px 0;font-size:0.85rem;">${lang.tableTitle}</h4>
                <div style="overflow-x:auto;margin-bottom:15px;">
                    <table style="width:100%;font-size:0.65rem;border-collapse:collapse;">
                        <tr style="background:#f0f0f0;">
                            <th style="padding:6px;text-align:left;border-radius:6px 0 0 0;">${lang.features[0]}</th>
                            <th style="padding:6px;text-align:center;">${lang.features[1]}</th>
                            <th style="padding:6px;text-align:center;">${lang.features[2]}</th>
                        </tr>
                        <tr style="background:#f9f9f9;">
                            <td style="padding:6px;border-bottom:1px solid #eee;">${lang.row1[0]}</td>
                            <td style="padding:6px;text-align:center;">${lang.row1[1]}</td>
                            <td style="padding:6px;text-align:center;">${lang.row1[2]}</td>
                        </tr>
                        <tr>
                            <td style="padding:6px;border-bottom:1px solid #eee;">${lang.row2[0]}</td>
                            <td style="padding:6px;text-align:center;">${lang.row2[1]}</td>
                            <td style="padding:6px;text-align:center;">${lang.row2[2]}</td>
                        </tr>
                        <tr style="background:#f9f9f9;">
                            <td style="padding:6px;border-bottom:1px solid #eee;">${lang.row3[0]}</td>
                            <td style="padding:6px;text-align:center;">${lang.row3[1]}</td>
                            <td style="padding:6px;text-align:center;">${lang.row3[2]}</td>
                        </tr>
                        <tr>
                            <td style="padding:6px;border-bottom:1px solid #eee;">${lang.row4[0]}</td>
                            <td style="padding:6px;text-align:center;">${lang.row4[1]}</td>
                            <td style="padding:6px;text-align:center;">${lang.row4[2]}</td>
                        </tr>
                        <tr style="background:#f9f9f9;">
                            <td style="padding:6px;border-bottom:1px solid #eee;">${lang.row5[0]}</td>
                            <td style="padding:6px;text-align:center;">${lang.row5[1]}</td>
                            <td style="padding:6px;text-align:center;">${lang.row5[2]}</td>
                        </tr>
                    </table>
                </div>
                
                
                
                <!-- After Registration -->
                <div style="background:#f0f0f0;padding:10px;border-radius:12px;margin-bottom:15px;">
                    <p style="margin:0 0 5px 0;font-size:0.75rem;font-weight:bold;color:#d9534f;">${lang.afterTitle}</p>
                    <p style="margin:0;font-size:0.65rem;color:#555;">${lang.afterText}</p>
                </div>
                
                <!-- Telegram Contact -->
                <div style="background:#e8f5e9;padding:10px;border-radius:12px;margin-bottom:15px;">
                    <p style="margin:0 0 5px 0;font-size:0.75rem;font-weight:bold;color:#2e7d32;">${lang.helpTitle}</p>
                    <p style="margin:0 0 8px 0;font-size:0.65rem;color:#555;">${lang.helpText}</p>
                    <a href="https://t.me/BroHtet_official" target="_blank" style="display:inline-block;background:#0088cc;color:white;padding:8px 14px;border-radius:30px;text-decoration:none;font-size:0.7rem;font-weight:bold;">
                        💬 Telegram
                    </a>
                </div>
                
                <button id="guest-info-proceed" style="width:100%;padding:12px;background:#1e3a5f;color:white;border:none;border-radius:12px;font-weight:bold;cursor:pointer;font-size:0.85rem;margin-top:5px;">
                    ${lang.buttonText}
                </button>
            </div>
        `;
    }
    
    // Refresh dialog content when language changes
    function refreshDialogContent(overlay, callback) {
        const dialog = overlay.querySelector('div:first-child');
        if (dialog) {
            const newContent = getDialogContent();
            dialog.innerHTML = newContent;
            
            // Re-attach button events
            const proceedBtn = document.getElementById('guest-info-proceed');
            if (proceedBtn) {
                proceedBtn.onclick = () => {
                    overlay.remove();
                    if (callback) callback();
                };
            }
            
            const langToggle = document.getElementById('guest-lang-toggle');
            if (langToggle) {
                langToggle.onclick = (e) => {
                    e.stopPropagation();
                    currentLanguage = currentLanguage === 'en' ? 'my' : 'en';
                    refreshDialogContent(overlay, callback);
                };
            }
        }
    }
    
    // Show information dialog for guest users
    function showGuestInfoDialog(callback) {
        const existing = document.getElementById('guest-info-overlay');
        if (existing) existing.remove();
        
        const overlay = document.createElement('div');
        overlay.id = 'guest-info-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:60000;display:flex;justify-content:center;align-items:center;padding:10px;backdrop-filter:blur(5px);';
        
        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:white;border-radius:20px;width:100%;max-width:380px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 40px rgba(0,0,0,0.3);';
        dialog.innerHTML = getDialogContent();
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Setup language toggle
        const langToggle = document.getElementById('guest-lang-toggle');
        if (langToggle) {
            langToggle.onclick = (e) => {
                e.stopPropagation();
                currentLanguage = currentLanguage === 'en' ? 'my' : 'en';
                refreshDialogContent(overlay, callback);
            };
        }
        
        // Setup proceed button
        const proceedBtn = document.getElementById('guest-info-proceed');
        if (proceedBtn) {
            proceedBtn.onclick = () => {
                overlay.remove();
                if (callback) callback();
            };
        }
        
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
                if (callback) callback();
            }
        };
    }
    
    // Hook into guest button creation
    function hookGuestButton() {
        const observer = new MutationObserver(() => {
            const guestBtn = document.getElementById('guest-mode-btn');
            if (guestBtn && !guestBtn.hasGuestHook) {
                guestBtn.hasGuestHook = true;
                
                const originalOnClick = guestBtn.onclick;
                
                guestBtn.onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🎭 Guest button clicked - showing dialog');
                    
                    showGuestInfoDialog(async () => {
                        console.log('🎭 Dialog closed - proceeding with original function');
                        if (originalOnClick) {
                            await originalOnClick(e);
                        }
                    });
                };
                
                console.log('✅ Guest button hooked successfully');
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Hide exam button for guest users
    function hideExamButtonForGuest() {
        const examBtn = document.querySelector('#profile-overlay button[onclick="openExam()"]');
        if (examBtn && isGuestMode()) {
            examBtn.removeAttribute('onclick');
            examBtn.onclick = (e) => {
                e.preventDefault();
                showGuestInfoDialog(() => {});
                return false;
            };
            examBtn.style.opacity = '0.6';
            console.log('🔒 Exam button restricted');
        }
    }
    
    // Observe profile modal
    function observeProfileModal() {
        const observer = new MutationObserver(() => {
            const overlay = document.getElementById('profile-overlay');
            if (overlay && overlay.style.display === 'block') {
                setTimeout(() => {
                    if (isGuestMode()) hideExamButtonForGuest();
                }, 150);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // Initialize
    function init() {
        console.log('🎭 Guest UI initializing... (Eng/My toggle available)');
        hookGuestButton();
        
        if (isGuestMode()) {
            observeProfileModal();
            setTimeout(hideExamButtonForGuest, 500);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();