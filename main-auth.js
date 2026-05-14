// main-auth.js - Full Optimized Version with Cross-Device Sync

async function handleAuthSubmit() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const country = isRegisterMode ? document.getElementById('country-code').value : "";
    const phone = isRegisterMode ? document.getElementById('register-phone').value.trim() : "";
    const name = isRegisterMode ? document.getElementById('register-fullname').value.trim() : "";

    const error = Validator.validate(user, pass, isRegisterMode, phone, name);
    if (error) return UIAuth.showMessage(error);

    UIAuth.showMessage("⏳ လုပ်ဆောင်နေပါသည်...", true);
    
    let deviceId = localStorage.getItem('device_id');
    
    if (!deviceId) {
        deviceId = await APIService.getDeviceId();
        localStorage.setItem('device_id', deviceId);
    }
    
    console.log("Device ID:", deviceId);

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
                
                // ✅ IMPORTANT: Force fetch from server (no cache, cross-device sync)
                const profileResult = await APIService.forceRefreshProfilePicture(user);
                
                const userData = { 
                    username: user, 
                    fullname: data.fullname, 
                    phone: data.phone,
                    profilePic: profileResult.success ? profileResult.imageUrl : null
                };
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(userData));
                
                // Also store in permanent key for chat system compatibility
                if (profileResult.success && profileResult.imageUrl) {
                    localStorage.setItem(`user_profile_${user}`, profileResult.imageUrl);
                }
                
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

async function setupProfileSystem() {
    const profileBtn = document.getElementById('profile-icon-btn');
    const profileImg = document.getElementById('profile-img');
    const uploadStatus = document.getElementById('upload-status');
    const fileInput = document.getElementById('profile-upload');
    
    if (!profileImg || !fileInput || !uploadStatus) return;

    if (profileBtn) {
        profileBtn.onclick = async function() {
            // ✅ Show modal immediately
            const overlay = document.getElementById('profile-overlay');
            if (overlay) overlay.style.display = 'block';
            
            // ✅ Get user data from localStorage instantly
            let userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
            
            // ✅ Update basic info instantly
            if(document.getElementById('p-fullname')) document.getElementById('p-fullname').innerText = userData.fullname || '-';
            if(document.getElementById('p-username')) document.getElementById('p-username').innerText = userData.username || '-';
            if(document.getElementById('p-phone')) document.getElementById('p-phone').innerText = userData.phone || '-';
            
            // ✅ Show cached profile picture instantly
            if (userData.profilePic && userData.profilePic !== 'null') {
                profileImg.src = userData.profilePic;
            } else {
                profileImg.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%231e3a5f"/%3E%3Ctext x="50" y="67" text-anchor="middle" fill="white" font-size="40"%3E👤%3C/text%3E%3C/svg%3E';
            }
            
            // ✅ Background refresh from server (force refresh to get cross-device updates)
            if (userData.username) {
                APIService.forceRefreshProfilePicture(userData.username).then(freshProfile => {
                    if (freshProfile.success && freshProfile.imageUrl) {
                        if (freshProfile.imageUrl !== userData.profilePic) {
                            userData.profilePic = freshProfile.imageUrl;
                            localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(userData));
                            profileImg.src = freshProfile.imageUrl;
                            console.log('✅ Profile picture updated from server (cross-device sync)');
                        }
                    }
                }).catch(err => console.error('Background refresh failed:', err));
            }
            
            // ✅ Setup file upload handler (only once)
            if (fileInput && !fileInput.hasListener) {
                fileInput.hasListener = true;
                fileInput.onchange = async (event) => {
                    const file = event.target.files[0];
                    if (!file) return;
                    
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        profileImg.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                    
                    uploadStatus.innerHTML = '<span style="color:blue;">⏳ ပုံတင်နေသည်...</span>';
                    
                    const currentUserData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
                    const result = await APIService.uploadProfilePicture(file, currentUserData.username, currentUserData.fullname);
                    
                    if (result.success) {
                        currentUserData.profilePic = result.imageUrl;
                        localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(currentUserData));
                        localStorage.setItem(`user_profile_${currentUserData.username}`, result.imageUrl);
                        uploadStatus.innerHTML = '<span style="color:green;">✅ ပုံတင်ခြင်း အောင်မြင်ပါသည်။</span>';
                        
                        // Clear cache to ensure fresh fetch next time
                        APIService.clearProfileCache(currentUserData.username);
                        
                        setTimeout(() => uploadStatus.innerHTML = '', 3000);
                    } else {
                        uploadStatus.innerHTML = '<span style="color:red;">❌ ပုံတင်ခြင်း မအောင်မြင်ပါ။</span>';
                    }
                };
            }
        };
    }

    const closeBtn = document.getElementById('close-profile');
    if (closeBtn) {
        closeBtn.onclick = function() {
            const overlay = document.getElementById('profile-overlay');
            if (overlay) overlay.style.display = 'none';
            
            const statusDiv = document.getElementById('upload-status');
            if (statusDiv) statusDiv.innerHTML = '';
        };
    }
}

// ========== CHAT SYSTEM COMPATIBILITY ==========
// Inject Barber Button into Profile Modal
function injectBarberButton() {
    if (document.getElementById('barber-network-btn')) return;
    
    const examBtn = document.querySelector('#profile-overlay button[onclick="openExam()"]');
    if (!examBtn) return;
    
    const barberBtn = document.createElement('button');
    barberBtn.id = 'barber-network-btn';
    barberBtn.innerHTML = 'DC BARBER';
    barberBtn.style.cssText = 'background: #2980b9; color: white; border: none; width: 100%; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer; margin-bottom: 12px;';
    barberBtn.onclick = function() {
        document.getElementById('profile-overlay').style.display = 'none';
        if (typeof openChatPage === 'function') {
            openChatPage();
        } else {
            console.error('openChatPage function not found');
            window.location.href = 'https://dc-barber.github.io/MENUBOOK/';
        }
    };
    
    examBtn.insertAdjacentElement('afterend', barberBtn);
}

// Observe profile modal to inject button
function observeProfileModal() {
    const observer = new MutationObserver(function(mutations) {
        const overlay = document.getElementById('profile-overlay');
        if (overlay && overlay.style.display === 'block') {
            setTimeout(() => {
                injectBarberButton();
            }, 150);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

// Inject badge on profile icon
function injectBadge() {
    const wrapper = document.getElementById('profile-icon-wrapper');
    if (!wrapper) return;
    
    let badge = document.getElementById('message-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.id = 'message-badge';
        badge.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #e74c3c; color: white; border-radius: 50%; min-width: 18px; height: 18px; font-size: 10px; display: none; align-items: center; justify-content: center; padding: 0 4px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 100;';
        badge.innerText = '0';
        wrapper.appendChild(badge);
    }
}

// Global functions
window.openExam = () => {
    window.location.href = 'exam/exam.html';
};

window.logout = () => { 
    localStorage.clear(); 
    location.reload(); 
};

window.syncProfilePicture = async function() {
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    if (userData.username) {
        const result = await APIService.forceRefreshProfilePicture(userData.username);
        if (result.success && result.imageUrl) {
            userData.profilePic = result.imageUrl;
            localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(userData));
            const profileImg = document.getElementById('profile-img');
            if (profileImg) profileImg.src = result.imageUrl;
            console.log('✅ Manual sync completed');
            return true;
        }
    }
    return false;
};

// Load chat messages for badge (if chat system exists)
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

// Initialize
(function init() {
    const expiry = localStorage.getItem(CONFIG.AUTH_EXPIRY_KEY);
    const isAuth = expiry && new Date().getTime() < parseInt(expiry);
    
    if (isAuth) {
        setupProfileSystem();
        
        // Chat system integration
        setTimeout(() => {
            injectBadge();
            observeProfileModal();
            injectBarberButton();
            
            // Update badge periodically
            loadChatMessagesForBadge();
            setInterval(loadChatMessagesForBadge, 5000);
        }, 500);
        
    } else {
        UIAuth.showModal(handleAuthSubmit);
    }
})();
