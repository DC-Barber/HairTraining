

// chat/chat.js
let chatVisible = false;
let lastTimestamp = '0';
let messageCheckInterval = null;

// Open chat window
window.openChat = async function() {
    const container = document.getElementById('chat-container');
    if (!container) return;
    
    // Load chat HTML
    const response = await fetch('chat/chat.html');
    const html = await response.text();
    container.innerHTML = html;
    container.style.display = 'block';
    chatVisible = true;
    
    // Mark messages as read
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    await fetch(CONFIG.CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'markAsRead',
            username: userData.username
        })
    });
    updateUnreadBadge();
    
    // Load messages
    await loadMessages();
    
    // Start auto-refresh
    if (messageCheckInterval) clearInterval(messageCheckInterval);
    messageCheckInterval = setInterval(loadMessages, 3000);
};

// Close chat
function closeChat() {
    const container = document.getElementById('chat-container');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
    chatVisible = false;
    if (messageCheckInterval) {
        clearInterval(messageCheckInterval);
        messageCheckInterval = null;
    }
}

// Load messages
async function loadMessages() {
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    if (!userData.username) return;
    
    try {
        const response = await fetch(CONFIG.CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'getMessages',
                username: userData.username,
                lastTimestamp: lastTimestamp
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.messages && result.messages.length > 0) {
            const container = document.getElementById('chat-messages');
            if (!container) return;
            
            if (container.children.length === 1 && container.children[0].innerText === 'No messages yet') {
                container.innerHTML = '';
            }
            
            result.messages.forEach(msg => {
                addMessageToUI(msg);
            });
            
            if (result.latestTimestamp) {
                lastTimestamp = result.latestTimestamp;
            }
            
            container.scrollTop = container.scrollHeight;
        }
    } catch(err) {
        console.error('Load messages error:', err);
    }
}

// Add message to UI
function addMessageToUI(msg) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${msg.isOwn ? 'own' : 'other'}`;
    messageDiv.style.cssText = `
        display: flex;
        margin-bottom: 15px;
        justify-content: ${msg.isOwn ? 'flex-end' : 'flex-start'};
    `;
    
    const profilePic = msg.profilePic || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'50\' fill=\'%231e3a5f\'/%3E%3Ctext x=\'50\' y=\'67\' text-anchor=\'middle\' fill=\'white\' font-size=\'40\'%3E👤%3C/text%3E%3C/svg%3E';
    
    messageDiv.innerHTML = `
        ${!msg.isOwn ? `<img src="${profilePic}" class="chat-avatar" style="width: 35px; height: 35px; border-radius: 50%; margin-right: 10px; cursor: pointer;" onclick="viewUserProfile('${msg.username}')">` : ''}
        <div style="max-width: 70%;">
            ${!msg.isOwn ? `<div class="chat-name" style="font-size: 11px; color: #666; margin-bottom: 3px;">${msg.fullname || msg.username}</div>` : ''}
            <div class="chat-bubble" style="background: ${msg.isOwn ? '#1e3a5f' : '#f0f0f0'}; color: ${msg.isOwn ? 'white' : '#333'}; padding: 10px 14px; border-radius: 18px; word-wrap: break-word;">
                ${msg.message ? `<p style="margin: 0 0 5px 0;">${escapeHtml(msg.message)}</p>` : ''}
                ${msg.imageUrl ? `<a href="${msg.imageUrl}" target="_blank" style="color: ${msg.isOwn ? '#ffd700' : '#1e3a5f'};">📷 View Image</a>` : ''}
            </div>
            <div class="chat-time" style="font-size: 10px; color: #999; margin-top: 3px; text-align: ${msg.isOwn ? 'right' : 'left'}">
                ${new Date(msg.timestamp).toLocaleTimeString()}
            </div>
        </div>
        ${msg.isOwn ? `<img src="${profilePic}" class="chat-avatar" style="width: 35px; height: 35px; border-radius: 50%; margin-left: 10px;">` : ''}
    `;
    
    container.appendChild(messageDiv);
}

// Send text message
async function sendTextMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    if (!message) return;
    
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    
    await fetch(CONFIG.CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'sendMessage',
            username: userData.username,
            fullname: userData.fullname,
            profilePic: userData.profilePic || '',
            message: message
        })
    });
    
    input.value = '';
    await loadMessages();
}

// Send image
async function sendImage() {
    const fileInput = document.getElementById('chat-image-input');
    const file = fileInput.files[0];
    if (!file) return;
    
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    
    // Convert to Base64
    const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
    });
    
    // Upload to ImgBB via Apps Script
    const response = await fetch(CONFIG.CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'uploadImage',
            imageBase64: base64
        })
    });
    
    const result = await response.json();
    
    if (result.success && result.imageUrl) {
        await fetch(CONFIG.CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'sendMessage',
                username: userData.username,
                fullname: userData.fullname,
                profilePic: userData.profilePic || '',
                imageUrl: result.imageUrl
            })
        });
        
        fileInput.value = '';
        await loadMessages();
    } else {
        alert('Image upload failed');
    }
}

// Helper function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// chat.js - loadChatHTML function (ဒီအတိုင်းထားရန်)

async function loadChatHTML() {
    try {
        const response = await fetch('chat/chat.html');
        if (response.ok) {
            return await response.text();
        } else {
            return getDefaultChatHTML();
        }
    } catch(err) {
        console.error('Load chat HTML error:', err);
        return getDefaultChatHTML();
    }
}

function getDefaultChatHTML() {
    return `
        <div style="position: fixed; bottom: 80px; right: 80px; width: 380px; background: white; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); display: flex; flex-direction: column; z-index: 10000; max-height: 500px;">
            <div style="background: #1e3a5f; color: white; padding: 15px; border-radius: 20px 20px 0 0; display: flex; justify-content: space-between; align-items: center;">
                <span>💬 Barber Network Chat</span>
                <button id="close-chat-btn" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">✕</button>
            </div>
            <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 15px; min-height: 300px; max-height: 350px;">
                <div style="text-align: center; color: #999;">No messages yet</div>
            </div>
            <div style="padding: 15px; border-top: 1px solid #eee;">
                <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                    <input type="text" id="chat-input" placeholder="Type your message..." style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 20px;">
                    <button id="send-btn" style="background: #1e3a5f; color: white; border: none; padding: 10px 20px; border-radius: 20px; cursor: pointer;">Send</button>
                </div>
                <div style="display: flex; gap: 8px;">
                    <input type="file" id="chat-image-input" accept="image/*" style="display: none;">
                    <button id="image-btn" style="background: #4a6a8a; color: white; border: none; padding: 8px 15px; border-radius: 20px; cursor: pointer;">📷 Send Image</button>
                </div>
            </div>
        </div>
    `;
}
}

// Note: The actual chat.html file should be created in /chat/ folder
// For simplicity, the code above uses inline HTML