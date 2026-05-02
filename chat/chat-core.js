
// chat/chat-core.js - Core message functions

let chatMessages = [];
let chatInterval = null;

async function loadChatMessages() {
    if (!CONFIG.CHAT_API_URL) return;
    
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
    
    // ✅ messages တွေကို အပေါ်ဆုံးမှာ အဟောင်း၊ အောက်ဆုံးမှာ အသစ် ဖြစ်အောင် (ပုံမှန်အတိုင်း)
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
    
    // ✅ Scroll to bottom (new message ကိုပြဖို့)
    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const content = input.value.trim();
    if (!content) return;
    
    const sendBtn = document.getElementById('chat-send-btn');
    if (!sendBtn) return;
    
    // ✅ Disable button and show sending animation
    const originalText = sendBtn.innerHTML;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '⏳';
    sendBtn.style.opacity = '0.6';
    
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
    } finally {
        // ✅ Re-enable button
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalText;
        sendBtn.style.opacity = '1';
        input.focus();
    }
}

function updateChatBadge() {
    const badge = document.getElementById('message-badge');
    if (!badge) return;
    
    const lastSeen = localStorage.getItem('last_seen_chat') || '0';
    const newMessages = chatMessages.filter(msg => new Date(msg.timestamp).getTime() > parseInt(lastSeen)).length;
    
    if (newMessages > 0 && !document.getElementById('chat-page')) {
        badge.style.display = 'flex';
        badge.innerText = newMessages > 99 ? '99+' : newMessages;
    } else {
        badge.style.display = 'none';
    }
}
