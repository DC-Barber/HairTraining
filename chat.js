// chat.js - Complete Chat System (GET method only, CORS-safe)

(function() {
    'use strict';
    
    let chatMessages = [];
    let refreshInterval = null;
    let pendingImage = null;
    let isSending = false;
    
    // ========== UTILITIES ==========
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    function formatTime(timestamp) {
        if (!timestamp) return '';
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const isToday = date.toDateString() === now.toDateString();
            if (isToday) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        } catch(e) {
            return '';
        }
    }
    
    function getCurrentUser() {
        try {
            const data = localStorage.getItem(CONFIG.USER_DATA_KEY);
            return data ? JSON.parse(data) : null;
        } catch(e) {
            return null;
        }
    }
    
    function showStatus(msg, type = 'info') {
        let statusDiv = document.getElementById('chat-status');
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.id = 'chat-status';
            statusDiv.style.cssText = 'position:fixed; bottom:100px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.85); color:white; padding:8px 16px; border-radius:20px; font-size:12px; z-index:100001; white-space:nowrap; max-width:90%; text-align:center;';
            document.body.appendChild(statusDiv);
        }
        statusDiv.textContent = msg;
        statusDiv.style.background = type === 'error' ? '#dc3545' : (type === 'success' ? '#28a745' : '#17a2b8');
        statusDiv.style.display = 'block';
        setTimeout(() => { statusDiv.style.display = 'none'; }, 2000);
    }
    
    // ========== API CALLS (GET method only) ==========
    async function callApi(action, params = {}) {
        const apiUrl = CONFIG.CHAT_API_URL;
        if (!apiUrl) {
            showStatus('Chat API not configured', 'error');
            return null;
        }
        
        const urlParams = new URLSearchParams({ action: action, ...params });
        const url = `${apiUrl}?${urlParams.toString()}`;
        
        try {
            const response = await fetch(url);
            const result = await response.json();
            return result;
        } catch (err) {
            console.error('API call error:', err);
            showStatus('Network error', 'error');
            return null;
        }
    }
    
    // ========== LOAD MESSAGES ==========
    async function loadMessages() {
        const result = await callApi('load');
        if (result && result.success && result.messages) {
            const currentUser = getCurrentUser();
            const currentUsername = currentUser?.username;
            
            // Check for new messages
            const oldIds = chatMessages.map(m => m.id);
            const newMessages = result.messages.filter(m => !oldIds.includes(m.id));
            
            if (newMessages.length > 0) {
                chatMessages = result.messages;
                const container = document.getElementById('chat-messages-container');
                if (container) {
                    newMessages.forEach(msg => {
                        const isOwn = msg.username === currentUsername;
                        appendMessageToUI(msg, isOwn);
                    });
                }
                updateBadge();
            } else {
                chatMessages = result.messages;
            }
        }
    }
    
    function appendMessageToUI(msg, isOwn) {
        const container = document.getElementById('chat-messages-container');
        if (!container) return;
        
        const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'50\' fill=\'%231e3a5f\'/%3E%3Ctext x=\'50\' y=\'67\' text-anchor=\'middle\' fill=\'white\' font-size=\'40\'%3E👤%3C/text%3E%3C/svg%3E';
        const profilePic = (msg.profilePic && msg.profilePic !== '') ? msg.profilePic : defaultAvatar;
        const displayName = msg.fullname || msg.username;
        
        let contentHtml = '';
        if (msg.type === 'text') {
            contentHtml = `<div class="chat-bubble-content">${escapeHtml(msg.content)}</div>`;
        } else if (msg.type === 'image') {
            contentHtml = `<div><img src="${escapeHtml(msg.content)}" class="chat-bubble-image" onclick="showFullScreenImage('${escapeHtml(msg.content)}')" style="max-width:180px; max-height:150px; border-radius:12px; cursor:pointer;"></div>`;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message-row ${isOwn ? 'chat-message-own' : 'chat-message-other'}`;
        messageDiv.setAttribute('data-msg-id', msg.id);
        
        if (isOwn) {
            messageDiv.innerHTML = `
                <div class="chat-bubble">
                    ${contentHtml}
                    <div class="chat-time">${formatTime(msg.timestamp)}</div>
                </div>
                <img src="${profilePic}" class="chat-avatar">
            `;
        } else {
            messageDiv.innerHTML = `
                <img src="${profilePic}" class="chat-avatar">
                <div class="chat-bubble">
                    <div class="chat-sender-name">${escapeHtml(displayName)}</div>
                    ${contentHtml}
                    <div class="chat-time">${formatTime(msg.timestamp)}</div>
                </div>
            `;
        }
        
        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }
    
    // ========== SEND TEXT MESSAGE ==========
    async function sendTextMessage() {
        const input = document.getElementById('chat-input');
        const content = input.value.trim();
        if (!content || isSending) return;
        
        const user = getCurrentUser();
        if (!user) {
            showStatus('Please login first', 'error');
            return;
        }
        
        isSending = true;
        const sendBtn = document.getElementById('chat-send-btn');
        if (sendBtn) sendBtn.disabled = true;
        
        // Optimistic UI
        const tempId = 'temp_' + Date.now();
        const tempMsg = {
            id: tempId,
            username: user.username,
            fullname: user.fullname || user.username,
            profilePic: user.profilePic || '',
            type: 'text',
            content: content,
            timestamp: new Date().toISOString()
        };
        appendMessageToUI(tempMsg, true);
        input.value = '';
        
        // Send to server
        const result = await callApi('send', {
            username: user.username,
            fullname: user.fullname || user.username,
            profilePic: user.profilePic || '',
            type: 'text',
            content: content,
            userId: user.username
        });
        
        if (result && result.success) {
            showStatus('✓ Message sent', 'success');
            await loadMessages(); // Refresh to get real ID
        } else {
            showStatus('❌ Failed to send', 'error');
            // Remove the optimistic message
            const tempDiv = document.querySelector(`.chat-message-row[data-msg-id="${tempId}"]`);
            if (tempDiv) tempDiv.remove();
        }
        
        isSending = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
    }
    
    // ========== IMAGE HANDLING ==========
    function showImagePreview(file) {
        if (!file.type.startsWith('image/')) {
            showStatus('Please select an image file', 'error');
            return;
        }
        
        if (file.size > 1024 * 1024) {
            showStatus('Image must be less than 1MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(e) {
            pendingImage = e.target.result;
            
            let previewDiv = document.getElementById('chat-image-preview');
            if (!previewDiv) {
                previewDiv = document.createElement('div');
                previewDiv.id = 'chat-image-preview';
                previewDiv.style.cssText = 'background:white; padding:8px 12px; display:flex; align-items:center; justify-content:space-between; gap:10px; border-top:1px solid #ddd; flex-shrink:0;';
                const inputArea = document.querySelector('.chat-input-area');
                if (inputArea) inputArea.insertAdjacentElement('afterend', previewDiv);
            }
            
            previewDiv.innerHTML = `
                <img src="${pendingImage}" style="max-width:50px; max-height:50px; border-radius:8px;">
                <span style="flex:1; font-size:12px;">Ready to send</span>
                <button id="cancel-image-btn" style="background:#dc3545; color:white; border:none; padding:4px 12px; border-radius:15px; font-size:11px; cursor:pointer;">Cancel</button>
                <button id="send-image-btn" style="background:#28a745; color:white; border:none; padding:4px 12px; border-radius:15px; font-size:11px; cursor:pointer;">Send</button>
            `;
            previewDiv.style.display = 'flex';
            
            document.getElementById('cancel-image-btn').onclick = hideImagePreview;
            document.getElementById('send-image-btn').onclick = sendImageMessage;
        };
    }
    
    function hideImagePreview() {
        const previewDiv = document.getElementById('chat-image-preview');
        if (previewDiv) {
            previewDiv.style.display = 'none';
            previewDiv.innerHTML = '';
        }
        pendingImage = null;
        const fileInput = document.getElementById('chat-image-input');
        if (fileInput) fileInput.value = '';
    }
    
    async function sendImageMessage() {
        if (!pendingImage || isSending) return;
        
        const user = getCurrentUser();
        if (!user) {
            showStatus('Please login first', 'error');
            return;
        }
        
        isSending = true;
        const sendBtn = document.getElementById('chat-send-btn');
        const imageBtn = document.getElementById('chat-image-btn');
        if (sendBtn) sendBtn.disabled = true;
        if (imageBtn) imageBtn.disabled = true;
        
        showStatus('Uploading image...', 'info');
        
        const tempId = 'temp_img_' + Date.now();
        const tempMsg = {
            id: tempId,
            username: user.username,
            fullname: user.fullname || user.username,
            profilePic: user.profilePic || '',
            type: 'image',
            content: 'Uploading...',
            timestamp: new Date().toISOString()
        };
        appendMessageToUI(tempMsg, true);
        
        hideImagePreview();
        
        try {
            // Upload to ImgBB
            const formData = new FormData();
            formData.append('image', pendingImage.split(',')[1]);
            formData.append('key', CONFIG.IMGBB_API_KEY);
            
            const uploadRes = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
            const uploadResult = await uploadRes.json();
            
            if (!uploadResult.success) throw new Error('ImgBB upload failed');
            
            // Send message with image URL
            const result = await callApi('send', {
                username: user.username,
                fullname: user.fullname || user.username,
                profilePic: user.profilePic || '',
                type: 'image',
                content: uploadResult.data.url,
                userId: user.username
            });
            
            if (result && result.success) {
                showStatus('✓ Image sent', 'success');
                await loadMessages();
            } else {
                throw new Error('Send failed');
            }
            
            // Remove temp message
            const tempDiv = document.querySelector(`.chat-message-row[data-msg-id="${tempId}"]`);
            if (tempDiv) tempDiv.remove();
            
        } catch (err) {
            console.error(err);
            showStatus('❌ Upload failed', 'error');
            const tempDiv = document.querySelector(`.chat-message-row[data-msg-id="${tempId}"]`);
            if (tempDiv) tempDiv.innerHTML = tempDiv.innerHTML.replace('Uploading...', '❌ Failed');
        } finally {
            isSending = false;
            pendingImage = null;
            if (sendBtn) sendBtn.disabled = false;
            if (imageBtn) imageBtn.disabled = false;
        }
    }
    
    // ========== BADGE ==========
    function updateBadge() {
        const badge = document.getElementById('message-badge');
        if (!badge) return;
        
        const currentUser = getCurrentUser();
        if (!currentUser) return;
        
        const lastSeen = localStorage.getItem('last_seen_chat') || '0';
        const newCount = chatMessages.filter(m => 
            m.username !== currentUser.username && 
            new Date(m.timestamp).getTime() > parseInt(lastSeen)
        ).length;
        
        if (newCount > 0 && !document.getElementById('chat-page')) {
            badge.style.display = 'flex';
            badge.innerText = newCount > 99 ? '99+' : newCount;
        } else {
            badge.style.display = 'none';
        }
    }
    
    // ========== OPEN CHAT ==========
    function openChat() {
        if (document.getElementById('chat-page')) return;
        
        localStorage.setItem('last_seen_chat', Date.now().toString());
        updateBadge();
        
        // Add CSS if not present
        if (!document.querySelector('#chat-styles')) {
            const style = document.createElement('style');
            style.id = 'chat-styles';
            style.textContent = `
                .chat-page { position:fixed; top:0; left:0; width:100%; height:100%; background:#f8f9fa; z-index:50000; display:flex; flex-direction:column; animation:slideUp 0.3s ease; }
                @keyframes slideUp { from { transform:translateY(100%); } to { transform:translateY(0); } }
                .chat-header { background:#1e3a5f; color:white; padding:15px; display:flex; align-items:center; gap:15px; flex-shrink:0; }
                .chat-back-btn { background:white; border:none; width:38px; height:38px; border-radius:50%; font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
                .chat-title { margin:0; font-size:18px; }
                .chat-messages { flex:1; overflow-y:auto; padding:15px; display:flex; flex-direction:column; gap:12px; }
                .chat-message-row { display:flex; gap:8px; animation:fadeIn 0.2s ease; }
                @keyframes fadeIn { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
                .chat-message-own { justify-content:flex-end; }
                .chat-message-other { justify-content:flex-start; }
                .chat-avatar { width:36px; height:36px; border-radius:50%; object-fit:cover; flex-shrink:0; }
                .chat-bubble { max-width:75%; }
                .chat-sender-name { font-size:11px; color:#666; margin-bottom:3px; }
                .chat-message-own .chat-sender-name { text-align:right; }
                .chat-bubble-content { background:white; padding:10px 16px; border-radius:18px; border-bottom-left-radius:4px; word-wrap:break-word; }
                .chat-message-own .chat-bubble-content { background:#1e3a5f; color:white; border-bottom-right-radius:4px; border-bottom-left-radius:18px; }
                .chat-time { font-size:10px; color:#999; margin-top:4px; }
                .chat-message-own .chat-time { text-align:right; }
                .chat-input-area { background:white; padding:12px; display:flex; gap:10px; border-top:1px solid #ddd; flex-shrink:0; }
                .chat-input { flex:1; padding:12px; border:1px solid #ddd; border-radius:25px; outline:none; font-size:16px; }
                .chat-input:focus { border-color:#1e3a5f; }
                .chat-image-btn { background:#f0e7dc; border:none; width:48px; height:48px; border-radius:25px; font-size:20px; cursor:pointer; }
                .chat-send-btn { background:#1e3a5f; color:white; border:none; width:48px; height:48px; border-radius:25px; font-size:14px; font-weight:bold; cursor:pointer; }
                .chat-send-btn:disabled, .chat-image-btn:disabled { opacity:0.5; }
                .chat-empty { text-align:center; color:#999; padding:40px; }
            `;
            document.head.appendChild(style);
        }
        
        const html = `
            <div id="chat-page" class="chat-page">
                <div class="chat-header">
                    <button class="chat-back-btn" id="chat-close-btn">←</button>
                    <h3 class="chat-title">💬 Barber Network</h3>
                </div>
                <div id="chat-messages-container" class="chat-messages"></div>
                <div class="chat-input-area">
                    <input type="file" id="chat-image-input" accept="image/*" style="display:none;">
                    <button id="chat-image-btn" class="chat-image-btn">📷</button>
                    <input type="text" id="chat-input" class="chat-input" placeholder="Type a message...">
                    <button id="chat-send-btn" class="chat-send-btn">Send</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
        
        // Event listeners
        document.getElementById('chat-close-btn').onclick = closeChat;
        document.getElementById('chat-send-btn').onclick = sendTextMessage;
        document.getElementById('chat-image-btn').onclick = () => document.getElementById('chat-image-input').click();
        document.getElementById('chat-image-input').onchange = (e) => {
            if (e.target.files[0]) showImagePreview(e.target.files[0]);
        };
        document.getElementById('chat-input').onkeypress = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); sendTextMessage(); }
        };
        
        // Load messages
        loadMessages();
        
        // Auto refresh
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => {
            if (document.getElementById('chat-page')) loadMessages();
        }, 3000);
    }
    
    function closeChat() {
        if (refreshInterval) clearInterval(refreshInterval);
        const chatPage = document.getElementById('chat-page');
        if (chatPage) chatPage.remove();
        hideImagePreview();
        updateBadge();
    }
    
    // ========== FULL SCREEN IMAGE ==========
    window.showFullScreenImage = function(imageUrl) {
        const modal = document.createElement('div');
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:black; z-index:100000; display:flex; align-items:center; justify-content:center;';
        modal.innerHTML = `
            <button onclick="this.parentElement.remove()" style="position:absolute; top:20px; right:20px; background:white; border:none; width:40px; height:40px; border-radius:50%; font-size:24px; cursor:pointer;">✕</button>
            <img src="${escapeHtml(imageUrl)}" style="max-width:95%; max-height:95%; object-fit:contain;">
        `;
        document.body.appendChild(modal);
    };
    
    // ========== INJECT BUTTONS ==========
    function injectBarberButton() {
        if (document.getElementById('barber-network-btn')) return;
        const examBtn = document.querySelector('#profile-overlay button[onclick="openExam()"]');
        if (!examBtn) return;
        const btn = document.createElement('button');
        btn.id = 'barber-network-btn';
        btn.innerHTML = '💬 Barber Network';
        btn.style.cssText = 'background:#2980b9; color:white; border:none; width:100%; padding:12px; border-radius:12px; font-weight:bold; cursor:pointer; margin-bottom:12px;';
        btn.onclick = () => {
            document.getElementById('profile-overlay').style.display = 'none';
            openChat();
        };
        examBtn.insertAdjacentElement('afterend', btn);
    }
    
    function injectBadge() {
        if (document.getElementById('message-badge')) return;
        const profileIcon = document.getElementById('profile-icon-btn');
        if (!profileIcon) return;
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        profileIcon.parentElement.insertBefore(wrapper, profileIcon);
        wrapper.appendChild(profileIcon);
        const badge = document.createElement('span');
        badge.id = 'message-badge';
        badge.style.cssText = 'position:absolute; top:-5px; right:-5px; background:#e74c3c; color:white; border-radius:50%; min-width:18px; height:18px; font-size:10px; display:none; align-items:center; justify-content:center; padding:0 4px;';
        wrapper.appendChild(badge);
    }
    
    // ========== INIT ==========
    function init() {
        injectBadge();
        const observer = new MutationObserver(() => {
            const overlay = document.getElementById('profile-overlay');
            if (overlay && overlay.style.display === 'block') setTimeout(injectBarberButton, 100);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setInterval(() => {
            if (localStorage.getItem(CONFIG.AUTH_EXPIRY_KEY)) {
                injectBadge();
                const overlay = document.getElementById('profile-overlay');
                if (overlay && overlay.style.display === 'block') injectBarberButton();
            }
        }, 2000);
    }
    
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
    
    window.openChat = openChat;
})();