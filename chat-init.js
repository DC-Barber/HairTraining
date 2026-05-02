// chat-init.js - COMPLETE FULL VERSION with LocalStorage Caching
(function() {
    'use strict';
    
    // ==================== CONFIGURATION ====================
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyUE0jJlRFfZINy9_X94vswzuaBAfLjbma-6s4BbINeJGchdppWOAgpFK0Q3tBwak1m/exec';
    const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
    const CACHE_KEY = 'chat_messages_cache';
    const CACHE_TIMESTAMP_KEY = 'chat_cache_timestamp';
    const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
    const AUTO_REFRESH_INTERVAL = 5000;
    const CACHE_VALIDITY_MS = 24 * 60 * 60 * 1000;
    
    // ==================== STATE ====================
    let currentImageViewer = null;
    let lastTimestamp = '0';
    let refreshTimer = null;
    let isLoading = false;
    let currentUser = null;
    let messageIds = new Set();
    let isFirstLoad = true;
    let typingTimeout = null;
    let isTyping = false;
    
    // ==================== CACHE FUNCTIONS ====================
    function getCachedMessages() {
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            const cacheTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);
            if (cached && cacheTime) {
                const age = Date.now() - parseInt(cacheTime);
                if (age < CACHE_VALIDITY_MS) {
                    return JSON.parse(cached);
                }
            }
            return null;
        } catch(e) {
            console.error('Cache read error:', e);
            return null;
        }
    }
    
    function saveToCache(messages) {
        try {
            const messagesToCache = messages.slice(-500);
            localStorage.setItem(CACHE_KEY, JSON.stringify(messagesToCache));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            messagesToCache.forEach(msg => messageIds.add(msg.id));
        } catch(e) {
            console.error('Cache save error:', e);
        }
    }
    
    function clearCache() {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(CACHE_TIMESTAMP_KEY);
        messageIds.clear();
    }
    
    // ==================== HELPER FUNCTIONS ====================
    function getCurrentUser() {
        try {
            const data = localStorage.getItem('hair_user_data');
            return data ? JSON.parse(data) : {};
        } catch(e) {
            return {};
        }
    }
    
    function closeProfileOverlay() {
        const overlay = document.getElementById('profile-overlay');
        if (overlay) overlay.style.display = 'none';
    }
    
    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    function formatTime(ts) {
        if (!ts) return '';
        try {
            const d = new Date(ts);
            const now = new Date();
            const isToday = d.toDateString() === now.toDateString();
            if (isToday) {
                return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else {
                return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
        } catch(e) {
            return '';
        }
    }
    
    // ==================== SMART FETCH ====================
    async function smartFetch(url, options, retryCount = 0) {
        const maxRetries = 2;
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            if (response.ok) return response;
            if (response.status === 429) {
                await new Promise(r => setTimeout(r, 2000));
                return smartFetch(url, options, retryCount + 1);
            }
        } catch(e) {
            console.log('Direct fetch failed:', e.message);
        }
        
        if (retryCount < maxRetries) {
            try {
                const proxyUrl = CORS_PROXY + url;
                const response = await fetch(proxyUrl, options);
                if (response.ok) return response;
            } catch(e) {
                console.log('Proxy fetch failed:', e.message);
            }
        }
        
        throw new Error('Network error after retries');
    }
    
    async function callApi(action, data = {}) {
        const payload = { action: action, username: currentUser?.username || '', ...data };
        try {
            const response = await smartFetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch(e) {
            console.error(`API call ${action} failed:`, e);
            return { success: false, message: e.message };
        }
    }
    
    // ==================== IMAGE COMPRESSION ====================
    function compressImage(file, maxWidth = 800, maxHeight = 800) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = function(e) {
                const img = new Image();
                img.src = e.target.result;
                img.onload = function() {
                    let width = img.width, height = img.height;
                    if (width > maxWidth || height > maxHeight) {
                        if (width > height) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        } else {
                            width = (width * maxHeight) / height;
                            height = maxHeight;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(resolve, file.type, 0.7);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    }
    
    // ==================== IMAGE VIEWER ====================
    function showImageViewer(imageUrl) {
        if (currentImageViewer) currentImageViewer.remove();
        
        const viewer = document.createElement('div');
        viewer.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.95); z-index: 40000;
            display: flex; align-items: center; justify-content: center;
            animation: fadeIn 0.2s ease;
        `;
        viewer.innerHTML = `
            <div style="position: relative;">
                <button id="closeViewerBtn" style="position: absolute; top: -45px; right: -15px;
                    background: #dc3545; color: white; border: none; width: 40px; height: 40px;
                    border-radius: 50%; font-size: 24px; cursor: pointer;">×</button>
                <img src="${imageUrl}" style="max-width: 90vw; max-height: 90vh; border-radius: 12px;">
            </div>
        `;
        document.body.appendChild(viewer);
        currentImageViewer = viewer;
        
        document.getElementById('closeViewerBtn').onclick = () => viewer.remove();
        viewer.onclick = (e) => { if (e.target === viewer) viewer.remove(); };
    }
    window.showImageViewer = showImageViewer;
    
    // ==================== TYPING INDICATOR ====================
    async function sendTypingIndicator() {
        if (!isTyping) return;
        try {
            await callApi('typing', { isTyping: true });
        } catch(e) {}
    }
    
    function onUserTyping() {
        if (typingTimeout) clearTimeout(typingTimeout);
        if (!isTyping) {
            isTyping = true;
            sendTypingIndicator();
        }
        typingTimeout = setTimeout(() => {
            isTyping = false;
            callApi('typing', { isTyping: false }).catch(e => {});
        }, 1000);
    }
    
    // ==================== OFFLINE DETECTION ====================
    let isOffline = false;
    let offlineIndicator = null;
    
    function updateOfflineStatus() {
        const container = document.getElementById('chatMessagesContainer');
        if (!container) return;
        
        if (!navigator.onLine && !isOffline) {
            isOffline = true;
            offlineIndicator = document.createElement('div');
            offlineIndicator.id = 'offline-indicator';
            offlineIndicator.style.cssText = 'background: #dc3545; color: white; padding: 8px; text-align: center; font-size: 12px; position: sticky; top: 0; z-index: 100;';
            offlineIndicator.innerHTML = '⚠️ No internet connection. Messages will send when you reconnect.';
            const header = document.querySelector('#chat-container > div > div:first-child');
            if (header && !document.getElementById('offline-indicator')) {
                header.parentNode.insertBefore(offlineIndicator, header.nextSibling);
            }
        } else if (navigator.onLine && isOffline) {
            isOffline = false;
            if (offlineIndicator) offlineIndicator.remove();
        }
    }
    
    window.addEventListener('online', () => { isOffline = false; updateOfflineStatus(); });
    window.addEventListener('offline', () => { isOffline = true; updateOfflineStatus(); });
    
    // ==================== UNREAD BADGE ====================
    async function updateUnreadBadge() {
        const userData = getCurrentUser();
        if (!userData.username) return;
        
        try {
            const result = await callApi('getUnreadCount', {});
            if (result.success && result.count > 0) {
                const profileIcon = document.getElementById('profile-icon-btn');
                if (profileIcon) {
                    let badge = document.getElementById('unread-badge');
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.id = 'unread-badge';
                        badge.style.cssText = `
                            position: absolute; top: -5px; right: -5px;
                            background: #dc3545; color: white; border-radius: 50%;
                            min-width: 18px; height: 18px; font-size: 10px;
                            display: flex; align-items: center; justify-content: center;
                            padding: 0 4px; font-weight: bold; animation: pulse 1s infinite;
                        `;
                        profileIcon.style.position = 'relative';
                        profileIcon.appendChild(badge);
                    }
                    badge.textContent = result.count > 99 ? '99+' : result.count;
                    badge.style.display = 'flex';
                }
            } else {
                const badge = document.getElementById('unread-badge');
                if (badge) badge.style.display = 'none';
            }
        } catch(e) {
            console.error('Badge update error:', e);
        }
    }
    
    // ==================== DISPLAY MESSAGES ====================
    function displayMessages(container, messages, isInitial = false) {
        if (!container) return;
        
        if (isInitial && container.children.length > 0) {
            container.innerHTML = '';
        }
        
        messages.forEach(msg => {
            if (messageIds.has(msg.id)) return;
            messageIds.add(msg.id);
            
            const msgDiv = document.createElement('div');
            msgDiv.style.marginBottom = '15px';
            msgDiv.style.display = 'flex';
            msgDiv.style.justifyContent = msg.isOwn ? 'flex-end' : 'flex-start';
            msgDiv.style.animation = 'fadeIn 0.3s ease';
            msgDiv.setAttribute('data-msg-id', msg.id);
            
            let imageHtml = '';
            if (msg.imageUrl && msg.imageUrl.trim()) {
                imageHtml = `
                    <div style="margin-top: 8px;">
                        <img src="${msg.imageUrl}" class="chat-image-thumb" 
                             style="max-width: 150px; max-height: 120px; border-radius: 12px; cursor: pointer; object-fit: cover;"
                             onclick="showImageViewer('${msg.imageUrl}')"
                             onerror="this.style.display='none'">
                    </div>
                `;
            }
            
            const statusHtml = msg.isOwn ? `<span class="message-status status-sent" style="font-size: 9px; margin-left: 5px;">✓</span>` : '';
            
            if (msg.isOwn) {
                msgDiv.innerHTML = `
                    <div style="max-width: 75%; background: #1e3a5f; color: white; padding: 10px 14px; border-radius: 18px; border-bottom-right-radius: 4px;">
                        ${msg.message ? `<div style="font-size: 14px; word-wrap: break-word;">${escapeHtml(msg.message)}${statusHtml}</div>` : `<div>${statusHtml}</div>`}
                        ${imageHtml}
                        <div style="font-size: 10px; color: #aaa; margin-top: 5px; text-align: right;">${formatTime(msg.timestamp)}</div>
                    </div>
                `;
            } else {
                msgDiv.innerHTML = `
                    <div style="max-width: 75%; background: white; padding: 10px 14px; border-radius: 18px; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                        <div style="font-size: 11px; color: #666; margin-bottom: 3px;">${escapeHtml(msg.fullname || msg.username)}</div>
                        ${msg.message ? `<div style="font-size: 14px; word-wrap: break-word;">${escapeHtml(msg.message)}</div>` : ''}
                        ${imageHtml}
                        <div style="font-size: 10px; color: #999; margin-top: 5px;">${formatTime(msg.timestamp)}</div>
                    </div>
                `;
            }
            container.appendChild(msgDiv);
        });
        
        container.scrollTop = container.scrollHeight;
    }
    
    // ==================== LOAD MESSAGES WITH CACHING ====================
    async function loadMessages(container) {
        if (isLoading) return;
        isLoading = true;
        
        if (!container) {
            isLoading = false;
            return;
        }
        
        try {
            if (isFirstLoad) {
                const cachedMessages = getCachedMessages();
                if (cachedMessages && cachedMessages.length > 0) {
                    console.log(`Loading ${cachedMessages.length} messages from cache`);
                    if (container.innerHTML.includes('Loading')) container.innerHTML = '';
                    displayMessages(container, cachedMessages, true);
                    const newestMsg = cachedMessages[cachedMessages.length - 1];
                    if (newestMsg && newestMsg.timestamp > lastTimestamp) {
                        lastTimestamp = newestMsg.timestamp;
                    }
                }
                isFirstLoad = false;
            }
            
            const result = await callApi('getMessages', { lastTimestamp: lastTimestamp });
            
            if (result.success && result.messages && result.messages.length > 0) {
                console.log(`Fetched ${result.messages.length} new messages from server`);
                displayMessages(container, result.messages, false);
                const allMessages = [...(getCachedMessages() || []), ...result.messages];
                saveToCache(allMessages);
                if (result.latestTimestamp && result.latestTimestamp > lastTimestamp) {
                    lastTimestamp = result.latestTimestamp;
                }
            } else if (container.children.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">No messages yet. Be the first to say hi! 👋</div>';
            }
        } catch(e) {
            console.error('Load messages error:', e);
            if (container.children.length === 0) {
                container.innerHTML = '<div style="text-align: center; color: #dc3545; padding: 40px;">⚠️ Connection error. Check your internet and refresh.</div>';
            }
        } finally {
            isLoading = false;
        }
    }
    
    // ==================== SEND TEXT MESSAGE ====================
    async function sendTextMessage(userData, inputElement, sendBtn, container) {
        const message = inputElement.value.trim();
        if (!message) return;
        
        sendBtn.disabled = true;
        sendBtn.textContent = 'Sending...';
        
        try {
            const result = await callApi('sendMessage', {
                fullname: userData.fullname || userData.username,
                message: message,
                imageUrl: ''
            });
            
            if (result.success) {
                inputElement.value = '';
                clearCache();
                lastTimestamp = '0';
                container.innerHTML = '<div class="sync-indicator" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 20px;"><span style="animation: spin 1s linear infinite;">🔄</span> Syncing messages...</div>';
                isFirstLoad = true;
                await loadMessages(container);
                await updateUnreadBadge();
            } else {
                alert('Failed to send: ' + result.message);
            }
        } catch(e) {
            console.error('Send error:', e);
            alert('Failed to send message');
        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send';
        }
    }
    
    // ==================== SEND IMAGE MESSAGE ====================
    async function sendImageMessage(userData, fileInput, statusSpan, container) {
        const file = fileInput.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            fileInput.value = '';
            return;
        }
        
        if (file.size > MAX_IMAGE_SIZE) {
            alert(`Image must be less than 2MB`);
            fileInput.value = '';
            return;
        }
        
        statusSpan.innerHTML = '📤 Compressing image...';
        statusSpan.style.color = '#1e3a5f';
        
        try {
            const compressedBlob = await compressImage(file);
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(compressedBlob);
                reader.onload = () => resolve(reader.result.split(',')[1]);
            });
            
            statusSpan.innerHTML = '📤 Uploading to server...';
            
            const uploadResult = await callApi('uploadImage', { imageBase64: base64 });
            
            if (uploadResult.success && uploadResult.imageUrl) {
                statusSpan.innerHTML = '📤 Sending message...';
                
                const sendResult = await callApi('sendMessage', {
                    fullname: userData.fullname || userData.username,
                    message: '',
                    imageUrl: uploadResult.imageUrl
                });
                
                if (sendResult.success) {
                    fileInput.value = '';
                    clearCache();
                    lastTimestamp = '0';
                    container.innerHTML = '<div class="sync-indicator" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 20px;"><span style="animation: spin 1s linear infinite;">🔄</span> Syncing messages...</div>';
                    isFirstLoad = true;
                    await loadMessages(container);
                    statusSpan.innerHTML = '✅ Image sent!';
                    setTimeout(() => { statusSpan.innerHTML = ''; }, 2000);
                } else {
                    throw new Error(sendResult.message);
                }
            } else {
                throw new Error(uploadResult.message || 'Upload failed');
            }
        } catch(e) {
            console.error('Image error:', e);
            statusSpan.innerHTML = '❌ Failed: ' + e.message;
            statusSpan.style.color = '#dc3545';
            setTimeout(() => { statusSpan.innerHTML = ''; }, 3000);
        }
    }
    
    // ==================== MARK AS READ ====================
    async function markMessagesAsRead() {
        try {
            await callApi('markAsRead', {});
            await updateUnreadBadge();
        } catch(e) {
            console.error('Mark read error:', e);
        }
    }
    
    // ==================== CSS ANIMATIONS ====================
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
            .chat-image-thumb { transition: transform 0.2s ease; }
            .chat-image-thumb:hover { transform: scale(1.02); }
            .sync-indicator span { display: inline-block; }
        `;
        document.head.appendChild(style);
    }
    addStyles();
    
    // ==================== MAIN CHAT WINDOW ====================
    window.openChatNow = async function() {
        console.log('Opening chat with caching and all features...');
        closeProfileOverlay();
        
        currentUser = getCurrentUser();
        if (!currentUser || !currentUser.username) {
            alert('Please login first');
            return;
        }
        
        let chatContainer = document.getElementById('chat-container');
        if (!chatContainer) {
            chatContainer = document.createElement('div');
            chatContainer.id = 'chat-container';
            document.body.appendChild(chatContainer);
        }
        
        chatContainer.style.display = 'block';
        chatContainer.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: white; z-index: 30000; display: flex; flex-direction: column;">
                <div style="background: #1e3a5f; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 18px; font-weight: bold;">💬 Barber Network</span>
                    <button id="closeChatFinalBtn" style="background: #dc3545; border: none; color: white; width: 35px; height: 35px; border-radius: 50%; font-size: 20px; cursor: pointer;">✕</button>
                </div>
                <div id="chatMessagesContainer" style="flex: 1; overflow-y: auto; padding: 10px; background: #f0f0f0;">
                    <div style="text-align: center; color: #666; padding: 30px;">🔄 Loading messages...</div>
                </div>
                <div style="padding: 10px; background: white; border-top: 1px solid #ddd;">
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <input type="text" id="chatMessageInput" placeholder="Type your message..." style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 25px; font-size: 16px;">
                        <button id="chatSendButton" style="background: #1e3a5f; color: white; border: none; padding: 0 20px; border-radius: 25px; font-size: 16px; cursor: pointer;">Send</button>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="file" id="chatImageFile" accept="image/jpeg,image/png,image/jpg,image/gif" style="display: none;">
                        <button id="chatImageButton" style="background: #4a6a8a; color: white; border: none; padding: 8px 20px; border-radius: 25px; font-size: 14px; cursor: pointer;">📷 Send Image</button>
                        <span id="uploadStatusText" style="font-size: 12px; color: #666;"></span>
                    </div>
                </div>
            </div>
        `;
        
        const messagesContainer = document.getElementById('chatMessagesContainer');
        const messageInput = document.getElementById('chatMessageInput');
        const sendBtn = document.getElementById('chatSendButton');
        const imageInput = document.getElementById('chatImageFile');
        const imageBtn = document.getElementById('chatImageButton');
        const uploadStatus = document.getElementById('uploadStatusText');
        
        lastTimestamp = '0';
        isFirstLoad = true;
        messageIds.clear();
        if (refreshTimer) clearInterval(refreshTimer);
        
        document.getElementById('closeChatFinalBtn').onclick = () => {
            if (refreshTimer) clearInterval(refreshTimer);
            chatContainer.style.display = 'none';
        };
        
        sendBtn.onclick = () => sendTextMessage(currentUser, messageInput, sendBtn, messagesContainer);
        imageBtn.onclick = () => imageInput.click();
        imageInput.onchange = () => sendImageMessage(currentUser, imageInput, uploadStatus, messagesContainer);
        messageInput.onkeypress = (e) => {
            if (e.key === 'Enter') sendTextMessage(currentUser, messageInput, sendBtn, messagesContainer);
            onUserTyping();
        };
        messageInput.oninput = onUserTyping;
        
        await markMessagesAsRead();
        await loadMessages(messagesContainer);
        
        refreshTimer = setInterval(async () => {
            if (chatContainer.style.display !== 'none') {
                await loadMessages(messagesContainer);
                await updateUnreadBadge();
            }
        }, AUTO_REFRESH_INTERVAL);
        
        updateUnreadBadge();
        setInterval(updateUnreadBadge, 10000);
    };
    
    // ==================== GLOBAL & BUTTON INIT ====================
    window.openChatWindow = window.openChatNow;
    
    function initBarberButton() {
        const btn = document.getElementById('barber-network-btn');
        if (btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.openChatNow();
            };
            console.log('Barber button initialized');
        } else {
            setTimeout(initBarberButton, 500);
        }
    }
    
    const originalSetupProfile = window.setupProfileSystem;
    if (typeof originalSetupProfile === 'function') {
        window.setupProfileSystem = function() {
            originalSetupProfile();
            setTimeout(initBarberButton, 200);
        };
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBarberButton);
    } else {
        initBarberButton();
    }
    
    console.log('Chat system loaded - COMPLETE FULL VERSION with all features');
})();