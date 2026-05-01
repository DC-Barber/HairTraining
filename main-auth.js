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

// စာမေးပွဲ စတင်ရန် function
window.openExam = () => {
    window.location.href = 'exam/exam.html';
};

window.logout = () => { 
    localStorage.clear(); 
    location.reload(); 
};

(function init() {
    const expiry = localStorage.getItem(CONFIG.AUTH_EXPIRY_KEY);
    const isAuth = expiry && new Date().getTime() < parseInt(expiry);
    if (isAuth) {
        setupProfileSystem();
    } else {
        UIAuth.showModal(handleAuthSubmit);
    }
})();