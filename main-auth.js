// main-auth.js - Full Optimized Version with Cross-Device Sync
// MODIFIED: Guest can read content without login, login only needed for profile/exam

// Global variable to track auth state
let isUserLoggedIn = false;

// Check if user is logged in
function checkLoginStatus() {
    const expiry = localStorage.getItem(CONFIG.AUTH_EXPIRY_KEY);
    const isAuth = expiry && new Date().getTime() < parseInt(expiry);
    isUserLoggedIn = isAuth;
    return isAuth;
}

// ========== PROFILE TEXT & ICON UPDATE ==========
function updateProfileTextAndIcon() {
    const profileTextEl = document.getElementById('profile-text');
    const profileIconEl = document.getElementById('profile-icon-btn');
    
    if (!profileTextEl) return;
    
    if (checkLoginStatus()) {
        const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
        const username = userData.username || '';
        const fullname = userData.fullname || '';
        const profilePic = userData.profilePic || null;
        
        const displayName = fullname && fullname !== '-' ? fullname : username;
        
        if (displayName && displayName !== '') {
            const shortName = displayName.length > 12 ? displayName.substring(0, 10) + '..' : displayName;
            profileTextEl.innerHTML = `👤 ${shortName}`;
            profileTextEl.style.background = '#1e3a5f';
            profileTextEl.style.color = 'white';
        } else {
            profileTextEl.innerHTML = 'Profile';
            profileTextEl.style.background = '#1e3a5f';
            profileTextEl.style.color = 'white';
        }
        
        if (profileIconEl && profilePic && profilePic !== 'null') {
            profileIconEl.style.background = 'transparent';
            profileIconEl.style.padding = '0';
            profileIconEl.style.overflow = 'hidden';
            profileIconEl.innerHTML = `<img src="${profilePic}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
        } else if (profileIconEl) {
            profileIconEl.style.background = '#1e3a5f';
            profileIconEl.style.padding = '';
            profileIconEl.innerHTML = '👤';
        }
    } else {
        profileTextEl.innerHTML = '🪪Login/Register';
        profileTextEl.style.background = 'rgba(255, 255, 255, 0.8)';
        profileTextEl.style.color = '#1e3a5f';
        
        if (profileIconEl) {
            profileIconEl.style.background = '#1e3a5f';
            profileIconEl.style.padding = '';
            profileIconEl.innerHTML = '👤';
        }
    }
}

// Show login modal (for profile/exam access)
function showLoginModal(callback) {
    UIAuth.showModal(async () => {
        const success = await handleAuthSubmit();
        if (success && callback) callback();
        
        if (success === true) {
            const modal = document.getElementById('auth-modal-overlay');
            if (modal) modal.remove();
        }
    });
}

async function handleAuthSubmit() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value.trim();
    const country = isRegisterMode ? document.getElementById('country-code').value : "";
    const phone = isRegisterMode ? document.getElementById('register-phone').value.trim() : "";
    const name = isRegisterMode ? document.getElementById('register-fullname').value.trim() : "";

    const error = Validator.validate(user, pass, isRegisterMode, phone, name);
    if (error) {
        UIAuth.showMessage(error);
        return false;
    }

    UIAuth.showSpinner("လုပ်ဆောင်နေပါသည်...");
    
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
        
        UIAuth.hideSpinner();
        
        if (data.status === 'success') {
            if (isRegisterMode) {
                UIAuth.showMessage("✅ Register အောင်မြင်သည်။ Admin အတည်ပြုချက် စောင့်ပါ။", true);
                setTimeout(() => location.reload(), 3000);
                return false;
            } else {
                await APIService.recordHistory(user, deviceId);
                localStorage.setItem(CONFIG.AUTH_EXPIRY_KEY, (new Date().getTime() + CONFIG.LOGIN_DURATION_MS).toString());
                
                const profileResult = await APIService.forceRefreshProfilePicture(user);
                
                const userData = { 
                    username: user, 
                    fullname: data.fullname, 
                    phone: data.phone,
                    profilePic: profileResult.success ? profileResult.imageUrl : null
                };
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(userData));
                
                if (profileResult.success && profileResult.imageUrl) {
                    localStorage.setItem(`user_profile_${user}`, profileResult.imageUrl);
                }
                
                updateProfileTextAndIcon();
                location.reload();
                return true;
            }
        } else { 
            UIAuth.showMessage("❌ " + data.message);
            return false;
        }
    } catch (e) { 
        console.error(e);
        UIAuth.hideSpinner();
        UIAuth.showMessage("❌ ချိတ်ဆက်မှု အဆင်မပြေပါ။");
        return false;
    }
}

async function setupProfileSystem() {
    const profileBtn = document.getElementById('profile-icon-btn');
    const profileImg = document.getElementById('profile-img');
    const uploadStatus = document.getElementById('upload-status');
    const fileInput = document.getElementById('profile-upload');
    
    if (!profileImg || !fileInput || !uploadStatus) return;

    if (profileBtn) {
        const newProfileBtn = profileBtn.cloneNode(true);
        profileBtn.parentNode.replaceChild(newProfileBtn, profileBtn);
        
        newProfileBtn.onclick = async function() {
            if (!checkLoginStatus()) {
                showLoginModal(() => {
                    if (checkLoginStatus()) {
                        openProfileModal();
                    }
                });
                return;
            }
            openProfileModal();
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

async function openProfileModal() {
    const overlay = document.getElementById('profile-overlay');
    const profileImg = document.getElementById('profile-img');
    const fileInput = document.getElementById('profile-upload');
    const uploadStatus = document.getElementById('upload-status');
    
    if (!overlay) return;
    
    overlay.style.display = 'block';
    
    let userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    
    if(document.getElementById('p-fullname')) document.getElementById('p-fullname').innerText = userData.fullname || '-';
    if(document.getElementById('p-username')) document.getElementById('p-username').innerText = userData.username || '-';
    if(document.getElementById('p-phone')) document.getElementById('p-phone').innerText = userData.phone || '-';
    
    if (userData.profilePic && userData.profilePic !== 'null') {
        profileImg.src = userData.profilePic;
    } else {
        profileImg.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="50" fill="%231e3a5f"/%3E%3Ctext x="50" y="67" text-anchor="middle" fill="white" font-size="40"%3E👤%3C/text%3E%3C/svg%3E';
    }
    
    if (userData.username) {
        APIService.forceRefreshProfilePicture(userData.username).then(freshProfile => {
            if (freshProfile.success && freshProfile.imageUrl) {
                if (freshProfile.imageUrl !== userData.profilePic) {
                    userData.profilePic = freshProfile.imageUrl;
                    localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(userData));
                    if (profileImg) profileImg.src = freshProfile.imageUrl;
                    console.log('✅ Profile picture updated from server');
                }
            }
        }).catch(err => console.error('Background refresh failed:', err));
    }
    
    if (fileInput && !fileInput.hasListener) {
        fileInput.hasListener = true;
        fileInput.onchange = async (event) => {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                if (profileImg) profileImg.src = e.target.result;
            };
            reader.readAsDataURL(file);
            
            if (uploadStatus) uploadStatus.innerHTML = '<span style="color:blue;">⏳ ပုံတင်နေသည်...</span>';
            
            const currentUserData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
            const result = await APIService.uploadProfilePicture(file, currentUserData.username, currentUserData.fullname);
            
            if (result.success) {
                currentUserData.profilePic = result.imageUrl;
                localStorage.setItem(CONFIG.USER_DATA_KEY, JSON.stringify(currentUserData));
                localStorage.setItem(`user_profile_${currentUserData.username}`, result.imageUrl);
                if (uploadStatus) uploadStatus.innerHTML = '<span style="color:green;">✅ ပုံတင်ခြင်း အောင်မြင်ပါသည်။</span>';
                updateProfileTextAndIcon();
                APIService.clearProfileCache(currentUserData.username);
                setTimeout(() => {
                    if (uploadStatus) uploadStatus.innerHTML = '';
                }, 3000);
            } else {
                if (uploadStatus) uploadStatus.innerHTML = '<span style="color:red;">❌ ပုံတင်ခြင်း မအောင်မြင်ပါ။</span>';
            }
        };
    }
}

// ========== OBSERVE PROFILE MODAL (NO BUTTON INJECTION) ==========
function observeProfileModal() {
    const observer = new MutationObserver(function(mutations) {
        const overlay = document.getElementById('profile-overlay');
        if (overlay && overlay.style.display === 'block') {
            // Only log, no button injection
            console.log('Profile modal opened');
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function injectBadge() {
    const profileContainer = document.getElementById('profile-container');
    if (!profileContainer) return;
    
    let wrapper = document.getElementById('profile-icon-wrapper');
    let profileBtn = document.getElementById('profile-icon-btn');
    
    if (!wrapper && profileBtn) {
        wrapper = document.createElement('div');
        wrapper.id = 'profile-icon-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-flex';
        profileBtn.parentNode.insertBefore(wrapper, profileBtn);
        wrapper.appendChild(profileBtn);
    }
    
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
    if (!checkLoginStatus()) {
        showLoginModal(() => {
            if (checkLoginStatus()) {
                window.location.href = 'exam/exam.html';
            }
        });
        return;
    }
    window.location.href = 'exam/exam.html';
};

window.logout = () => { 
    localStorage.clear(); 
    updateProfileTextAndIcon();
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
            updateProfileTextAndIcon();
            console.log('✅ Manual sync completed');
            return true;
        }
    }
    return false;
};

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
    const isAuth = checkLoginStatus();
    
    updateProfileTextAndIcon();
    
    if (isAuth) {
        setupProfileSystem();
        setTimeout(() => {
            observeProfileModal();
            // loadChatMessagesForBadge(); // Uncomment if needed
        }, 500);
        
        if (localStorage.getItem('guest_mode_active') === 'true') {
            console.log('👤 Guest mode active - limited features');
        }
    } else {
        setupProfileSystem();
        injectBadge();
        console.log('🔓 Guest mode: content available without login');
        
        setTimeout(() => {
            const examBtn = document.querySelector('#profile-overlay button[onclick="openExam()"]');
            if (examBtn) {
                examBtn.removeAttribute('onclick');
                examBtn.onclick = (e) => {
                    e.preventDefault();
                    showLoginModal(() => {});
                    return false;
                };
                examBtn.style.opacity = '0.6';
            }
        }, 500);
    }
})();