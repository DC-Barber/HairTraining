// chat.js - Group Chat System (HTML မပြင်ရဘူး၊ JS နဲ့ပဲ အလုပ်လုပ်မယ်)

let chatMessages = [];
let chatInterval = null;

// ========== BADGE AUTO INJECT ==========
// ဒါက HTML ကို မပြင်ဘဲ Badge ကို အလိုအလျောက်ထည့်ပေးမယ်
function injectBadge() {
    // Badge ရှိပြီးသားလား စစ်ပါ
    if (document.getElementById('message-badge')) return;
    
    const profileIcon = document.getElementById('profile-icon-btn');
    if (!profileIcon) return;
    
    // Parent div ကိုရှာပါ
    const parentDiv = profileIcon.parentElement;
    if (!parentDiv) return;
    
    // Badge container ကို ဖန်တီးပါ
    const badgeContainer = document.createElement('div');
    badgeContainer.style.position = 'relative';
    badgeContainer.style.display = 'inline-block';
    
    // Profile icon ကို အသစ် container ထဲထည့်ပါ
    parentDiv.insertBefore(badgeContainer, profileIcon);
    badgeContainer.appendChild(profileIcon);
    
    // Badge ကိုထည့်ပါ
    const badge = document.createElement('span');
    badge.id = 'message-badge';
    badge.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #e74c3c; color: white; border-radius: 50%; min-width: 18px; height: 18px; font-size: 10px; display: none; align-items: center; justify-content: center; padding: 0 4px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.3);';
    badge.innerText = '0';
    badgeContainer.appendChild(badge);
}

// ========== BARBER NETWORK BUTTON INJECT ==========
function injectBarberButton() {
    // Button ရှိပြီးသားလား စစ်ပါ
    if (document.getElementById('barber-network-btn')) return;
    
    // Exam button ကိုရှာပါ
    const examBtn = document.querySelector('#profile-overlay button[onclick="openExam()"]');
    if (!examBtn) return;
    
    // Barber Network button ကိုဖန်တီးပါ
    const barberBtn = document.createElement('button');
    barberBtn.id = 'barber-network-btn';
    barberBtn.innerHTML = '💬 Barber Network';
    barberBtn.style.cssText = 'background: #2980b9; color: white; border: none; width: 100%; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer; margin-bottom: 12px;';
    barberBtn.onclick = function() {
        document.getElementById('profile-overlay').style.display = 'none';
        openChatPage();
    };
    
    // Exam button ရဲ့ နောက်မှာ ထည့်ပါ
    examBtn.insertAdjacentElement('afterend', barberBtn);
}

// ========== CHAT FUNCTIONS ==========
async function loadChatMessages() {
    try {
        const response = await fetch(CONFIG.CHAT_API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'load' })
        });
        const data = await response.json();
        
        if (data.messages && JSON.stringify(chatMessages) !== JSON.stringify(data.messages)) {
            chatMessages = data.messages;
            renderChatMessages();
            updateChatBadge();
        }
    } catch (error) {
        console.error("Load messages error:", error);
    }
}

function renderChatMessages() {
    const container = document.getElementById('chat-messages-container');
    if (!container) return;
    
    const currentUser = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    container.innerHTML = '';
    
    if (chatMessages.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">No messages yet. Say hi! 👋</div>';
        return;
    }
    
    chatMessages.forEach(msg => {
        const isOwnMessage = msg.username === currentUser.username;
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isOwnMessage ? 'own-message' : 'other-message'}`;
        
        const profilePic = msg.profilePic || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'50\' fill=\'%231e3a5f\'/%3E%3Ctext x=\'50\' y=\'67\' text-anchor=\'middle\' fill=\'white\' font-size=\'40\'%3E👤%3C/text%3E%3C/svg%3E';
        
        let contentHtml = '';
        if (msg.type === 'text') {
            contentHtml = `<div class="message-bubble">${escapeHtml(msg.content)}</div>`;
        } else if (msg.type === 'link') {
            contentHtml = `<div class="message-bubble"><a href="${escapeHtml(msg.content)}" target="_blank" rel="noopener noreferrer" class="chat-link" style="color: #2980b9; text-decoration: underline;">${escapeHtml(msg.content)}</a></div>`;
        } else if (msg.type === 'image') {
            contentHtml = `<div class="message-bubble"><img src="${escapeHtml(msg.content)}" class="chat-image-thumb" onclick="showFullScreenImage('${escapeHtml(msg.content)}')" loading="lazy" style="max-width: 200px; max-height: 150px; border-radius: 12px; cursor: pointer;"></div>`;
        }
        
        messageDiv.innerHTML = `
            <div class="message-avatar" onclick="viewProfile('${escapeHtml(msg.username)}', '${escapeHtml(msg.fullname)}', '${profilePic}')" style="cursor: pointer;">
                <img src="${profilePic}" alt="${escapeHtml(msg.fullname)}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">
            </div>
            <div class="message-details" style="max-width: 70%;">
                <div class="message-sender" style="font-size: 12px; font-weight: bold; color: #666; margin-bottom: 4px;">${escapeHtml(msg.fullname)}</div>
                ${contentHtml}
                <div class="message-time" style="font-size: 10px; color: #999; margin-top: 4px;">${new Date(msg.timestamp).toLocaleTimeString()}</div>
            </div>
        `;
        container.appendChild(messageDiv);
    });
    
    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    if (!content) return;
    
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    let type = 'text';
    
    if (content.match(/^(http|https):\/\/[^ "]+$/)) {
        type = 'link';
    }
    
    const payload = {
        action: 'send',
        username: userData.username,
        fullname: userData.fullname,
        profilePic: userData.profilePic || '',
        type: type,
        content: content,
        userId: userData.username
    };
    
    try {
        const response = await fetch(CONFIG.CHAT_API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.success) {
            input.value = '';
            await loadChatMessages();
        }
    } catch (error) {
        console.error("Send message error:", error);
        alert("မက်ဆေ့ခ်ျ ပို့ရာတွင် အဆင်မပြေပါ။");
    }
}

async function uploadChatImage() {
    const input = document.getElementById('chat-image-input');
    const file = input.files[0];
    if (!file) return;
    
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    const deviceId = localStorage.getItem('device_id') || await APIService.getDeviceId();
    
    const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
    });
    
    try {
        const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
        const response = await fetch(CORS_PROXY + CONFIG.IMGBB_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageBase64: base64,
                username: userData.username,
                fullname: userData.fullname,
                deviceId: deviceId
            })
        });
        const result = await response.json();
        
        if (result.success && result.imageUrl) {
            const payload = {
                action: 'send',
                username: userData.username,
                fullname: userData.fullname,
                profilePic: userData.profilePic || '',
                type: 'image',
                content: result.imageUrl,
                userId: userData.username
            };
            
            const sendResponse = await fetch(CONFIG.CHAT_API_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const sendResult = await sendResponse.json();
            if (sendResult.success) {
                await loadChatMessages();
            }
        }
        input.value = '';
    } catch (error) {
        console.error("Upload image error:", error);
        alert("ပုံတင်ရာတွင် အဆင်မပြေပါ။");
    }
}

function viewProfile(username, fullname, profilePic) {
    const modalHtml = `
        <div id="profile-view-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:50000; display:flex; align-items:center; justify-content:center;">
            <div style="background:white; width:300px; border-radius:20px; padding:25px; text-align:center;">
                <img src="${profilePic}" style="width:100px; height:100px; border-radius:50%; object-fit:cover; margin-bottom:15px;">
                <h3 style="margin:5px 0;">${escapeHtml(fullname)}</h3>
                <p style="color:#666; margin:5px 0;">@${escapeHtml(username)}</p>
                <button onclick="document.getElementById('profile-view-modal').remove()" style="margin-top:20px; padding:10px 20px; background:#1e3a5f; color:white; border:none; border-radius:10px; cursor:pointer;">Close</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function showFullScreenImage(imageUrl) {
    const modalHtml = `
        <div id="full-image-modal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:black; z-index:60000; display:flex; align-items:center; justify-content:center;">
            <button onclick="document.getElementById('full-image-modal').remove()" style="position:absolute; top:20px; right:20px; background:white; border:none; width:40px; height:40px; border-radius:50%; font-size:24px; cursor:pointer; z-index:60001;">✕</button>
            <img src="${escapeHtml(imageUrl)}" style="max-width:95%; max-height:95%; object-fit:contain;">
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function updateChatBadge() {
    const badge = document.getElementById('message-badge');
    if (!badge) return;
    
    const lastSeen = localStorage.getItem('last_seen_chat') || '0';
    const newMessages = chatMessages.filter(msg => new Date(msg.timestamp).getTime() > parseInt(lastSeen)).length;
    
    if (newMessages > 0) {
        badge.style.display = 'flex';
        badge.innerText = newMessages > 99 ? '99+' : newMessages;
    } else {
        badge.style.display = 'none';
    }
}

function openChatPage() {
    localStorage.setItem('last_seen_chat', Date.now().toString());
    updateChatBadge();
    
    const chatHtml = `
        <div id="chat-page" style="position:fixed; top:0; left:0; width:100%; height:100%; background:#f5f0eb; z-index:40000; display:flex; flex-direction:column;">
            <div style="background:#1e3a5f; color:white; padding:15px; display:flex; align-items:center; gap:15px; flex-shrink:0;">
                <button onclick="closeChatPage()" style="background:white; border:none; width:38px; height:38px; border-radius:50%; font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center;">←</button>
                <h3 style="margin:0; font-size:18px;">💬 Barber Network</h3>
            </div>
            <div id="chat-messages-container" style="flex:1; overflow-y:auto; padding:15px; display:flex; flex-direction:column; gap:12px;"></div>
            <div style="background:white; padding:12px; display:flex; gap:10px; border-top:1px solid #ddd; flex-shrink:0;">
                <input type="file" id="chat-image-input" accept="image/*" style="display:none;">
                <button onclick="document.getElementById('chat-image-input').click()" style="background:#f0e7dc; border:none; width:48px; height:48px; border-radius:25px; font-size:20px; cursor:pointer;">📷</button>
                <input type="text" id="chat-input" placeholder="Type a message..." style="flex:1; padding:12px; border:1px solid #ddd; border-radius:25px; outline:none; font-size:16px;">
                <button onclick="sendChatMessage()" style="background:#1e3a5f; color:white; border:none; width:48px; height:48px; border-radius:25px; font-size:20px; cursor:pointer;">📤</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', chatHtml);
    
    document.getElementById('chat-image-input').onchange = uploadChatImage;
    document.getElementById('chat-input').focus();
    
    loadChatMessages();
    if (chatInterval) clearInterval(chatInterval);
    chatInterval = setInterval(loadChatMessages, 3000);
}

function closeChatPage() {
    if (chatInterval) {
        clearInterval(chatInterval);
        chatInterval = null;
    }
    const chatPage = document.getElementById('chat-page');
    if (chatPage) chatPage.remove();
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== INITIALIZATION ==========
// Profile modal ပွင့်တိုင်း Barber Button ထည့်ဖို့ observer
function observeProfileModal() {
    const observer = new MutationObserver(function(mutations) {
        const overlay = document.getElementById('profile-overlay');
        if (overlay && overlay.style.display === 'block') {
            setTimeout(() => {
                injectBarberButton();
            }, 100);
        }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

// Page load ဖြစ်တဲ့အခါ
document.addEventListener('DOMContentLoaded', function() {
    injectBadge();
    observeProfileModal();
    
    // Login ဝင်ပြီးရင် badge ကို update လုပ်ဖို့
    const checkInterval = setInterval(() => {
        if (localStorage.getItem(CONFIG.AUTH_EXPIRY_KEY)) {
            injectBadge();
            injectBarberButton();
            loadChatMessages();
            setInterval(() => {
                if (!document.getElementById('chat-page')) {
                    loadChatMessages();
                }
            }, 5000);
            clearInterval(checkInterval);
        }
    }, 1000);
});

// Global functions
window.openChatPage = openChatPage;
window.closeChatPage = closeChatPage;
window.showFullScreenImage = showFullScreenImage;
window.viewProfile = viewProfile;
window.sendChatMessage = sendChatMessage;
window.uploadChatImage = uploadChatImage;