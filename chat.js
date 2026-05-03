// chat.js - GET နဲ့ POST သီးခြားစီ

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
        statusDiv.style.backgroundColor = type === 'error' ? '#dc3545' : (type === 'success' ? '#28a745' : '#17a2b8');
        statusDiv.textContent = msg;
        statusDiv.style.display = 'block';
        setTimeout(() => { statusDiv.style.display = 'none'; }, 2500);
    }
    
    // ========== GET MESSAGES (using GET only) ==========
    async function getMessages() {
        const apiUrl = CONFIG.CHAT_API_URL;
        if (!apiUrl) {
            throw new Error('CHAT_API_URL not configured');
        }
        
        // ✅ GET request - simple and works everywhere
        const url = `${apiUrl}?action=load&t=${Date.now()}`;
        console.log('GET Messages URL:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        return await response.json();
    }
    
    // ========== POST MESSAGES (using POST only) ==========
    async function postMessage(messageData) {
        const apiUrl = CONFIG.CHAT_API_URL;
        if (!apiUrl) {
            throw new Error('CHAT_API_URL not configured');
        }
        
        // ✅ POST request - for sending messages
        console.log('POST Message:', messageData);
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageData)
        });
        
        return await response.json();
    }
    
    // ========== LOAD MESSAGES ==========
    async function loadMessages() {
        try {
            console.log('Loading messages via GET...');
            const result = await getMessages();
            console.log('GET Result:', result);
            
            if (result && result.success && result.messages) {
                const currentUser = getCurrentUser();
                const currentUsername = currentUser?.username;
                
                const oldIds = chatMessages.map(m => m.id);
                const newMessages = result.messages.filter(m => !oldIds.includes(m.id));
                
                if (newMessages.length > 0) {
                    console.log('New messages:', newMessages.length);
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
                return true;
            } else if (result && !result.success) {
                console.error('Load failed:', result.message);
                return false;
            }
            return false;
        } catch (err) {
            console.error('Load error:', err);
            showStatus('Connection error: ' + err.message, 'error');
            return false;
        }
    }
    
    function appendMessageToUI(msg, isOwn, scroll = true) {
        const container = document.getElementById('chat-messages-container');
        if (!container) return;
        
        const defaultAvatar = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Ccircle cx=\'50\' cy=\'50\' r=\'50\' fill=\'%231e3a5f\'/%3E%3Ctext x=\'50\' y=\'67\' text-anchor=\'middle\' fill=\'white\' font-size=\'40\'%3E👤%3C/text%3E%3C/svg%3E';
        const profilePic = (msg.profilePic && msg.profilePic !== '') ? msg.profilePic : defaultAvatar;
        const displayName = msg.fullname || msg.username;
        
        let contentHtml = '';
        if (msg.type === 'text') {
            contentHtml = `<div style="background: ${isOwn ? '#1e3a5f' : 'white'}; color: ${isOwn ? 'white' : '#333'}; padding: 10px 16px; border-radius: 18px; ${isOwn ? 'border-bottom-right-radius: 4px;' : 'border-bottom-left-radius: 4px;'} max-width: 260px; word-wrap: break-word;">${escapeHtml(msg.content)}</div>`;
        } else if (msg.type === 'image') {
            contentHtml = `<div><img src="${escapeHtml(msg.content)}" onclick="showFullScreenImage('${escapeHtml(msg.content)}')" style="max-width: 180px; max-height: 150px; border-radius: 12px; cursor: pointer;"></div>`;
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.style.marginBottom = '15px';
        messageDiv.style.display = 'flex';
        messageDiv.style.justifyContent = isOwn ? 'flex-end' : 'flex-start';
        messageDiv.style.gap = '8px';
        messageDiv.setAttribute('data-msg-id', msg.id);
        
        if (isOwn) {
            messageDiv.innerHTML = `
                <div style="max-width: 75%;">
                    ${contentHtml}
                    <div style="font-size: 10px; color: #999; margin-top: 4px; text-align: right;">${formatTime(msg.timestamp)}</div>
                </div>
                <img src="${profilePic}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
            `;
        } else {
            messageDiv.innerHTML = `
                <img src="${profilePic}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover;">
                <div style="max-width: 75%;">
                    <div style="font-size: 11px; color: #666; margin-bottom: 3px;">${escapeHtml(displayName)}</div>
                    ${contentHtml}
                    <div style="font-size: 10px; color: #999; margin-top: 4px;">${formatTime(msg.timestamp)}</div>
                </div>
            `;
        }
        
        container.appendChild(messageDiv);
        if (scroll) container.scrollTop = container.scrollHeight;
    }
    
    function renderAllMessages() {
        const container = document.getElementById('chat-messages-container');
        if (!container) return;
        
        const currentUser = getCurrentUser();
        const currentUsername = currentUser?.username;
        container.innerHTML = '';
        
        if (!chatMessages || chatMessages.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#999;padding:40px;">✨ No messages yet. Say hi! ✨</div>';
            return;
        }
        
        chatMessages.forEach(msg => {
            const isOwn = msg.username === currentUsername;
            appendMessageToUI(msg, isOwn, false);
        });
        container.scrollTop = container.scrollHeight;
    }
    
    // ========== SEND TEXT MESSAGE (using POST) ==========
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
        
        const tempId = 'temp_' + Date.now();
        
        // Optimistic UI
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
        
        try {
            const payload = {
                action: 'send',
                username: user.username,
                fullname: user.fullname || user.username,
                profilePic: user.profilePic || '',
                type: 'text',
                content: content,
                userId: user.username
            };
            
            const result = await postMessage(payload);
            console.log('POST Result:', result);
            
            if (result && result.success) {
                showStatus('✓ Sent', 'success');
                await loadMessages();
                renderAllMessages();
            } else {
                showStatus('❌ Failed: ' + (result?.message || 'Unknown error'), 'error');
                await loadMessages();
                renderAllMessages();
            }
        } catch (err) {
            console.error('Send error:', err);
            showStatus('❌ Network error: ' + err.message, 'error');
        } finally {
            isSending = false;
            if (sendBtn) sendBtn.disabled = false;
        }
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
                <span style="flex:1; font-size:12px;">Image ready to send</span>
                <button onclick="cancelImagePreview()" style="background:#dc3545; color:white; border:none; padding:4px 12px; border-radius:15px; font-size:11px; cursor:pointer;">Cancel</button>
                <button onclick="sendImageMessage()" style="background:#28a745; color:white; border:none; padding:4px 12px; border-radius:15px; font-size:11px; cursor:pointer;">Send</button>
            `;
            previewDiv.style.display = 'flex';
        };
    }
    
    function hideImagePreview() {
        const previewDiv = document.getElementById('chat-image-preview');
        if (previewDiv) previewDiv.style.display = 'none';
        pendingImage = null;
        const fileInput = document.getElementById('chat-image-input');
        if (fileInput) fileInput.value = '';
    }
    
    window.cancelImagePreview = hideImagePreview;
    
    async function sendImageMessage() {
        if (!pendingImage || isSending) return;
        
        const user = getCurrentUser();
        if (!user) {
            showStatus('Please login first', 'error');
            return;
        }
        
        isSending = true;
        showStatus('Uploading image...', 'info');
        
        hideImagePreview();
        
        try {
            // Upload to ImgBB
            const formData = new FormData();
            formData.append('image', pendingImage.split(',')[1]);
            formData.append('key', CONFIG.IMGBB_API_KEY);
            
            const uploadRes = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
            const uploadResult = await uploadRes.json();
            
            if (!uploadResult.success) throw new Error('ImgBB upload failed');
            
            // Send message via POST
            const payload = {
                action: 'send',
                username: user.username,
                fullname: user.fullname || user.username,
                profilePic: user.profilePic || '',
                type: 'image',
                content: uploadResult.data.url,
                userId: user.username
            };
            
            const result = await postMessage(payload);
            
            if (result && result.success) {
                showStatus('✓ Image sent', 'success');
                await loadMessages();
                renderAllMessages();
            } else {
                showStatus('❌ Failed', 'error');
            }
        } catch (err) {
            console.error('Image error:', err);
            showStatus('❌ Upload failed: ' + err.message, 'error');
        } finally {
            isSending = false;
            pendingImage = null;
        }
    }
    
    window.sendImageMessage = sendImageMessage;
    
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
    async function openChat() {
        if (document.getElementById('chat-page')) return;
        
        localStorage.setItem('last_seen_chat', Date.now().toString());
        
        showStatus('Loading chat...', 'info');
        
        const html = `
            <div id="chat-page" style="position:fixed; top:0; left:0; width:100%; height:100%; background:#f8f9fa; z-index:50000; display:flex; flex-direction:column;">
                <div style="background:#1e3a5f; color:white; padding:15px; display:flex; align-items:center; gap:15px; flex-shrink:0;">
                    <button id="chat-close-btn" style="background:white; border:none; width:38px; height:38px; border-radius:50%; font-size:20px; cursor:pointer;">←</button>
                    <h3 style="margin:0;">💬 Barber Network</h3>
                </div>
                <div id="chat-messages-container" style="flex:1; overflow-y:auto; padding:15px; display:flex; flex-direction:column; gap:12px;"></div>
                <div class="chat-input-area" style="background:white; padding:12px; display:flex; gap:10px; border-top:1px solid #ddd; flex-shrink:0;">
                    <input type="file" id="chat-image-input" accept="image/*" style="display:none;">
                    <button id="chat-image-btn" style="background:#f0e7dc; border:none; width:48px; height:48px; border-radius:25px; font-size:20px; cursor:pointer;">📷</button>
                    <input type="text" id="chat-input" placeholder="Type a message..." style="flex:1; padding:12px; border:1px solid #ddd; border-radius:25px; outline:none; font-size:16px;">
                    <button id="chat-send-btn" style="background:#1e3a5f; color:white; border:none; width:48px; height:48px; border-radius:25px; font-size:14px; font-weight:bold; cursor:pointer;">Send</button>
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
            if (e.key === 'Enter') {
                e.preventDefault();
                sendTextMessage();
            }
        };
        
        // Load messages
        const success = await loadMessages();
        if (success && chatMessages.length > 0) {
            renderAllMessages();
            showStatus('Chat ready - ' + chatMessages.length + ' messages', 'success');
        } else if (success) {
            renderAllMessages();
            showStatus('Chat ready', 'success');
        } else {
            showStatus('Unable to load messages', 'error');
        }
        
        // Auto refresh every 5 seconds
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(async () => {
            if (document.getElementById('chat-page')) {
                await loadMessages();
                renderAllMessages();
                updateBadge();
            }
        }, 5000);
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
    
    function observeProfileModal() {
        const observer = new MutationObserver(() => {
            const overlay = document.getElementById('profile-overlay');
            if (overlay && overlay.style.display === 'block') {
                setTimeout(injectBarberButton, 100);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    
    // ========== INIT ==========
    function init() {
        console.log('Chat system initializing...');
        console.log('CHAT_API_URL:', CONFIG.CHAT_API_URL);
        
        injectBadge();
        observeProfileModal();
        
        // Periodic check
        setInterval(() => {
            if (localStorage.getItem(CONFIG.AUTH_EXPIRY_KEY)) {
                injectBadge();
                const overlay = document.getElementById('profile-overlay');
                if (overlay && overlay.style.display === 'block') {
                    injectBarberButton();
                }
            }
        }, 3000);
    }
    

    // ... your existing code ...
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // ✅ MAKE SURE THESE ARE PRESENT
    window.openChat = openChat;
    window.openChatPage = openChat;
    
    console.log('✅ Chat system loaded');
    
})();  // This closes the IIFE