// main-auth.js
async function handleAuthSubmit() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const country = isRegisterMode ? document.getElementById('country-code').value : "";
    const phone = isRegisterMode ? document.getElementById('register-phone').value.trim() : "";
    const name = isRegisterMode ? document.getElementById('register-fullname').value.trim() : "";

    const error = Validator.validate(user, pass, isRegisterMode, phone, name);
    if (error) return UIAuth.showMessage(error);

    UIAuth.showMessage("⏳ လုပ်ဆောင်နေပါသည်...", true);
    
    // ✅ Device ID ကို မှန်ကန်စွာ ရယူပါ
    let deviceId = localStorage.getItem('device_id');
    
    if (!deviceId) {
        deviceId = await APIService.getDeviceId();
        localStorage.setItem('device_id', deviceId);
    }
    
    console.log("Device ID:", deviceId); // Debug အတွက်

    const payload = { 
        action: isRegisterMode ? 'register' : 'login', 
        username: user, 
        password: pass, 
        deviceId: deviceId 
    };
    
    if (isRegisterMode) { 
        payload.phone = country + phone; 
        payload.fullname = name; 
    }

    try {
        const data = await APIService.submitAuth(payload);
        if (data.status === 'success') {
            if (isRegisterMode) {
                UIAuth.showMessage("✅ Register အောင်မြင်သည်။ Admin အတည်ပြုချက် စောင့်ပါ။", true);
                setTimeout(() => location.reload(), 3000);
            } else {
                await APIService.recordHistory(user, deviceId);
                localStorage.setItem(CONFIG.AUTH_EXPIRY_KEY, (new Date().getTime() + CONFIG.LOGIN_DURATION_MS).toString());
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify({ 
                    username: user, 
                    fullname: data.fullname, 
                    phone: data.phone 
                }));
                location.reload();
            }
        } else { 
            UIAuth.showMessage("❌ " + data.message); 
        }
    } catch (e) { 
        console.error(e);
        UIAuth.showMessage("❌ ချိတ်ဆက်မှု အဆင်မပြေပါ။"); 
    }
}

function setupProfileSystem() {
    const profileBtn = document.getElementById('profile-icon-btn');
    
    // Profile modal ထဲက elements တွေ မရှိသေးရင် ထပ်မလုပ်ပါနဲ့
    const profileImg = document.getElementById('profile-img');
    const uploadStatus = document.getElementById('upload-status');
    const fileInput = document.getElementById('profile-upload');
    
    // Profile picture နဲ့ upload input မရှိရင် ထွက်ပါ
    if (!profileImg || !fileInput || !uploadStatus) return;

    if (profileBtn) {
        profileBtn.onclick = function() {
            const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
            
            if(document.getElementById('p-fullname')) document.getElementById('p-fullname').innerText = userData.fullname || '-';
            if(document.getElementById('p-username')) document.getElementById('p-username').innerText = userData.username || '-';
            if(document.getElementById('p-phone')) document.getElementById('p-phone').innerText = userData.phone || '-';
            
            // Profile Picture ပြသရန်
            if (userData.profilePic) {
                profileImg.src = userData.profilePic;
            } else {
                profileImg.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'50\' fill=\'%231e3a5f\'/%3E%3Ctext x=\'50\' y=\'67\' text-anchor=\'middle\' fill=\'white\' font-size=\'40\'%3E👤%3C/text%3E%3C/svg%3E';
            }
            
            // Upload handler ကို ပြန်သတ်မှတ်ပါ
            fileInput.onchange = async (event) => {
                const file = event.target.files[0];
                if (!file) return;
                
                // Show local preview
                const reader = new FileReader();
                reader.onload = function(e) {
                    profileImg.src = e.target.result;
                };
                reader.readAsDataURL(file);
                
                uploadStatus.innerHTML = '<span style="color:blue;">⏳ ပုံတင်နေသည်...</span>';
                
                const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
                const result = await APIService.uploadProfilePicture(file, userData.username, userData.fullname);
                
                if (result.success) {
                    userData.profilePic = result.imageUrl;
                    localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(userData));
                    uploadStatus.innerHTML = '<span style="color:green;">✅ ပုံတင်ခြင်း အောင်မြင်ပါသည်။</span>';
                    setTimeout(() => uploadStatus.innerHTML = '', 3000);
                } else {
                    uploadStatus.innerHTML = '<span style="color:red;">❌ ပုံတင်ခြင်း မအောင်မြင်ပါ။</span>';
                }
            };
            
            const overlay = document.getElementById('profile-overlay');
            if (overlay) overlay.style.display = 'block';
        };
    }

    const closeBtn = document.getElementById('close-profile');
    if (closeBtn) {
        closeBtn.onclick = function() {
            const overlay = document.getElementById('profile-overlay');
            if (overlay) overlay.style.display = 'none';
        };
    }
}

// ========== ✅ CHAT SYSTEM အတွက် ထပ်ထည့်ရမယ့် အပိုင်း ==========

// Barber Network Button ကို Profile Modal ထဲထည့်ဖို့
function injectBarberButton() {
    // Button ရှိပြီးသားလား စစ်ပါ
    if (document.getElementById('barber-network-btn')) return;
    
    // Exam button ကိုရှာပါ (တစ်ခါတစ်ရံ မပေါ်သေးရင် စောင့်ပါ)
    const examBtn = document.querySelector('#profile-overlay button[onclick="openExam()"]');
    if (!examBtn) return;
    
    // Barber Network button ကိုဖန်တီးပါ
    const barberBtn = document.createElement('button');
    barberBtn.id = 'barber-network-btn';
    barberBtn.innerHTML = '💬 Barber Network';
    barberBtn.style.cssText = 'background: #2980b9; color: white; border: none; width: 100%; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer; margin-bottom: 12px;';
    barberBtn.onclick = function() {
        document.getElementById('profile-overlay').style.display = 'none';
        if (typeof openChatPage === 'function') {
            openChatPage();
        } else {
            console.error('openChatPage function not found');
        }
    };
    
    // Exam button ရဲ့ နောက်မှာ ထည့်ပါ
    examBtn.insertAdjacentElement('afterend', barberBtn);
}

// Profile modal ပွင့်တိုင်း Barber Button ထည့်ဖို့
function observeProfileModal() {
    // ရှိပြီးသား overlay ကို စောင့်ကြည့်မယ်
    const observer = new MutationObserver(function(mutations) {
        const overlay = document.getElementById('profile-overlay');
        if (overlay && overlay.style.display === 'block') {
            // button ထည့်ဖို့ နည်းနည်းနောက်ကျပြီးမှ လုပ်ပါ
            setTimeout(() => {
                injectBarberButton();
            }, 150);
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

// Badge ကို Profile Icon မှာ ထည့်ဖို့
function injectBadge() {
    if (document.getElementById('message-badge')) return;
    
    const profileIcon = document.getElementById('profile-icon-btn');
    if (!profileIcon) return;
    
    const parentDiv = profileIcon.parentElement;
    if (!parentDiv) return;
    
    // Badge container ကိုဖန်တီးပါ
    const badgeContainer = document.createElement('div');
    badgeContainer.style.position = 'relative';
    badgeContainer.style.display = 'inline-block';
    
    // Profile icon ကို container ထဲထည့်ပါ
    parentDiv.insertBefore(badgeContainer, profileIcon);
    badgeContainer.appendChild(profileIcon);
    
    // Badge ကိုထည့်ပါ
    const badge = document.createElement('span');
    badge.id = 'message-badge';
    badge.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #e74c3c; color: white; border-radius: 50%; min-width: 18px; height: 18px; font-size: 10px; display: none; align-items: center; justify-content: center; padding: 0 4px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.3);';
    badge.innerText = '0';
    badgeContainer.appendChild(badge);
}

// Chat message badge ကို အချိန်နဲ့တပြေးညီ update လုပ်ဖို့
let chatLoadInterval = null;

async function loadChatMessagesForBadge() {
    if (!CONFIG.CHAT_API_URL) return;
    
    try {
        const response = await fetch(CONFIG.CHAT_API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'load' })
        });
        const data = await response.json();
        
        if (data.messages) {
            const lastSeen = localStorage.getItem('last_seen_chat') || '0';
            const newMessages = data.messages.filter(msg => new Date(msg.timestamp).getTime() > parseInt(lastSeen)).length;
            const badge = document.getElementById('message-badge');
            
            if (badge) {
                if (newMessages > 0 && !document.getElementById('chat-page')) {
                    badge.style.display = 'flex';
                    badge.innerText = newMessages > 99 ? '99+' : newMessages;
                } else {
                    badge.style.display = 'none';
                }
            }
        }
    } catch (error) {
        console.error("Load messages for badge error:", error);
    }
}

// ========== မူရင်း Functions (အတိုင်းသား) ==========

// စာမေးပွဲ စတင်ရန် function
window.openExam = () => {
    window.location.href = 'exam/exam.html';
};

window.logout = () => { 
    localStorage.clear(); 
    location.reload(); 
};

// ========== ✅ Chat Functions ကို window မှာ ထည့်ပါ (chat.js ရှိရင် သုံးမယ်) ==========
window.openChatPage = window.openChatPage || function() {
    console.log("openChatPage will be loaded from chat.js");
};

// ========== ✅ INIT FUNCTION (မူရင်းအတိုင်း + ထပ်ထည့်တာ) ==========
(function init() {
    const expiry = localStorage.getItem(CONFIG.AUTH_EXPIRY_KEY);
    const isAuth = expiry && new Date().getTime() < parseInt(expiry);
    
    if (isAuth) {
        setupProfileSystem();
        
        // ✅ Chat system အတွက် ထပ်ထည့်တာများ
        setTimeout(() => {
            injectBadge();
            observeProfileModal();
            injectBarberButton();
            
            // Badge ကို 5 စက္ကန့်တစ်ခါ update လုပ်ပါ
            loadChatMessagesForBadge();
            if (chatLoadInterval) clearInterval(chatLoadInterval);
            chatLoadInterval = setInterval(loadChatMessagesForBadge, 5000);
        }, 500);
        
    } else {
        UIAuth.showModal(handleAuthSubmit);
    }
})();