// chat-init.js - Full Version with Image Viewer & Loading Sync
(function() {
    'use strict';
    
    // သင့် Chat API URL (config.js ကနေ ယူမယ်)
    function getApiUrl() {
        if (window.CONFIG && window.CONFIG.CHAT_API_URL) {
            return window.CONFIG.CHAT_API_URL;
        }
        return 'https://script.google.com/macros/s/AKfycbyUE0jJlRFfZINy9_X94vswzuaBAfLjbma-6s4BbINeJGchdppWOAgpFK0Q3tBwak1m/exec';
    }
    
    // Get current user
    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('hair_user_data') || '{}');
        } catch(e) {
            return {};
        }
    }
    
    // Close profile overlay
    function closeProfileOverlay() {
        const overlay = document.getElementById('profile-overlay');
        if (overlay) overlay.style.display = 'none';
    }
    
    // Escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    // Format time
    function formatTime(ts) {
        if (!ts) return '';
        try {
            const d = new Date(ts);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch(e) {
            return '';
        }
    }
    
    // Image Viewer Modal (Fullscreen)
    let currentImageViewer = null;
    
    function showImageViewer(imageUrl) {
        // Remove existing viewer
        if (currentImageViewer) {
            currentImageViewer.remove();
        }
        
        const viewer = document.createElement('div');
        viewer.id = 'image-viewer-modal';
        viewer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.95);
            z-index: 40000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.2s ease;
        `;
        
        viewer.innerHTML = `
            <div style="position: relative; max-width: 95%; max-height: 95%;">
                <button id="closeImageViewer" style="
                    position: absolute;
                    top: -40px;
                    right: -10px;
                    background: #dc3545;
                    color: white;
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    font-size: 24px;
                    cursor: pointer;
                    z-index: 40001;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">×</button>
                <img src="${imageUrl}" style="
                    max-width: 95vw;
                    max-height: 95vh;
                    object-fit: contain;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                ">
            </div>
        `;
        
        document.body.appendChild(viewer);
        currentImageViewer = viewer;
        
        document.getElementById('closeImageViewer').onclick = () => {
            viewer.remove();
            currentImageViewer = null;
        };
        
        // Click outside to close
        viewer.onclick = (e) => {
            if (e.target === viewer) {
                viewer.remove();
                currentImageViewer = null;
            }
        };
    }
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
        }
        .loading-dots::after {
            content: '...';
            animation: dots 1.5s steps(4, end) infinite;
            display: inline-block;
            width: 24px;
            text-align: left;
        }
        @keyframes dots {
            0%, 20% { content: ''; }
            40% { content: '.'; }
            60% { content: '..'; }
            80%, 100% { content: '...'; }
        }
    `;
    document.head.appendChild(style);
    
    // Main chat window
    window.openChatNow = async function() {
        console.log('Opening chat...');
        closeProfileOverlay();
        
        const userData = getCurrentUser();
        if (!userData || !userData.username) {
            alert('Please login first');
            return;
        }
        
        const API_URL = getApiUrl();
        
        // Create container
        let chatContainer = document.getElementById('chat-container');
        if (!chatContainer) {
            chatContainer = document.createElement('div');
            chatContainer.id = 'chat-container';
            document.body.appendChild(chatContainer);
        }
        
        // Chat UI with loading indicator
        chatContainer.style.display = 'block';
        chatContainer.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: white; z-index: 30000; display: flex; flex-direction: column;">
                <div style="background: #1e3a5f; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 18px; font-weight: bold;">💬Barber Network</span>
                    <button id="closeChatFinalBtn" style="background: #dc3545; border: none; color: white; width: 35px; height: 35px; border-radius: 50%; font-size: 20px; cursor: pointer;">✕</button>
                </div>
                <div id="chatMessagesContainer" style="flex: 1; overflow-y: auto; padding: 10px; background: #f0f0f0;">
                    <div style="text-align: center; color: #666; padding: 30px;">
                        <span class="loading-dots">🔄 Loading messages</span>
                    </div>
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
        
        let lastTimestamp = '0';
        let refreshTimer = null;
        let isLoading = false;
        
        // Function to load messages
        async function loadMessages(showLoading = false) {
            if (isLoading) return;
            isLoading = true;
            
            const container = document.getElementById('chatMessagesContainer');
            if (!container) {
                isLoading = false;
                return;
            }
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'getMessages',
                        username: userData.username,
                        lastTimestamp: lastTimestamp
                    })
                });
                
                const data = await response.json();
                
                if (data.success && data.messages && data.messages.length > 0) {
                    // Clear loading indicator if needed
                    if (container.children.length === 1 && container.innerHTML.includes('Loading messages')) {
                        container.innerHTML = '';
                    }
                    
                    // Add each message
                    data.messages.forEach(msg => {
                        const msgDiv = document.createElement('div');
                        msgDiv.style.marginBottom = '15px';
                        msgDiv.style.display = 'flex';
                        msgDiv.style.justifyContent = msg.isOwn ? 'flex-end' : 'flex-start';
                        
                        let imageHtml = '';
                        if (msg.imageUrl) {
                            imageHtml = `
                                <div style="margin-top: 8px;">
                                    <img src="${msg.imageUrl}" 
                                         class="chat-image-thumb" 
                                         style="max-width: 150px; max-height: 120px; border-radius: 12px; cursor: pointer; object-fit: cover;"
                                         onclick="showImageViewer('${msg.imageUrl}')"
                                         onerror="this.style.display='none'">
                                </div>
                            `;
                        }
                        
                        if (msg.isOwn) {
                            msgDiv.innerHTML = `
                                <div style="max-width: 75%; background: #1e3a5f; color: white; padding: 10px 14px; border-radius: 18px; border-bottom-right-radius: 4px;">
                                    ${msg.message ? `<div style="font-size: 14px; word-wrap: break-word;">${escapeHtml(msg.message)}</div>` : ''}
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
                    
                    if (data.latestTimestamp && data.latestTimestamp > lastTimestamp) {
                        lastTimestamp = data.latestTimestamp;
                    }
                    
                    container.scrollTop = container.scrollHeight;
                } else if (container.children.length === 0 || (container.children.length === 1 && container.innerHTML.includes('Loading messages'))) {
                    container.innerHTML = '<div style="text-align: center; color: #999; padding: 30px;">No messages yet. Be the first to say hi! 👋</div>';
                }
            } catch(e) {
                console.error('Load messages error:', e);
                if (container.children.length === 0 || (container.children.length === 1 && container.innerHTML.includes('Loading messages'))) {
                    container.innerHTML = '<div style="text-align: center; color: #dc3545; padding: 30px;">⚠️ Connection error. Check your internet.</div>';
                }
            } finally {
                isLoading = false;
            }
        }
        
        // Function to send text message
        async function sendTextMessage() {
            const input = document.getElementById('chatMessageInput');
            const message = input.value.trim();
            if (!message) return;
            
            const sendBtn = document.getElementById('chatSendButton');
            sendBtn.disabled = true;
            sendBtn.textContent = 'Sending...';
            
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'sendMessage',
                        username: userData.username,
                        fullname: userData.fullname || userData.username,
                        message: message,
                        imageUrl: ''
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    input.value = '';
                    lastTimestamp = '0';
                    const container = document.getElementById('chatMessagesContainer');
                    if (container) container.innerHTML = '<div style="text-align: center; color: #666; padding: 30px;"><span class="loading-dots">🔄 Syncing messages</span></div>';
                    await loadMessages();
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
        
        // Function to send image
        async function sendImageMessage() {
            const fileInput = document.getElementById('chatImageFile');
            const file = fileInput.files[0];
            if (!file) return;
            
            if (file.size > 2 * 1024 * 1024) {
                alert('Image must be less than 2MB');
                fileInput.value = '';
                return;
            }
            
            const statusSpan = document.getElementById('uploadStatusText');
            statusSpan.innerHTML = '📤 Uploading image...';
            statusSpan.style.color = '#1e3a5f';
            
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async function() {
                const base64 = reader.result.split(',')[1];
                
                try {
                    const uploadRes = await fetch(API_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'uploadImage',
                            imageBase64: base64
                        })
                    });
                    
                    const uploadData = await uploadRes.json();
                    
                    if (uploadData.success && uploadData.imageUrl) {
                        const sendRes = await fetch(API_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'sendMessage',
                                username: userData.username,
                                fullname: userData.fullname || userData.username,
                                message: '',
                                imageUrl: uploadData.imageUrl
                            })
                        });
                        const sendResult = await sendRes.json();
                        
                        if (sendResult.success) {
                            fileInput.value = '';
                            lastTimestamp = '0';
                            const container = document.getElementById('chatMessagesContainer');
                            if (container) container.innerHTML = '<div style="text-align: center; color: #666; padding: 30px;"><span class="loading-dots">🔄 Syncing messages</span></div>';
                            await loadMessages();
                            statusSpan.innerHTML = '✅ Image sent!';
                            setTimeout(() => { statusSpan.innerHTML = ''; }, 2000);
                        } else {
                            throw new Error(sendResult.message);
                        }
                    } else {
                        throw new Error(uploadData.message || 'Upload failed');
                    }
                } catch(e) {
                    console.error('Image error:', e);
                    statusSpan.innerHTML = '❌ Failed: ' + e.message;
                    statusSpan.style.color = '#dc3545';
                    setTimeout(() => { statusSpan.innerHTML = ''; }, 3000);
                }
            };
        }
        
        // Mark messages as read
        async function markAsRead() {
            try {
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'markAsRead',
                        username: userData.username
                    })
                });
            } catch(e) {}
        }
        
        // Close chat
        function closeChat() {
            if (refreshTimer) clearInterval(refreshTimer);
            const container = document.getElementById('chat-container');
            if (container) container.style.display = 'none';
        }
        
        // Make showImageViewer global for onclick
        window.showImageViewer = showImageViewer;
        
        // Setup event listeners
        document.getElementById('closeChatFinalBtn').onclick = closeChat;
        document.getElementById('chatSendButton').onclick = sendTextMessage;
        document.getElementById('chatImageButton').onclick = () => document.getElementById('chatImageFile').click();
        document.getElementById('chatImageFile').onchange = sendImageMessage;
        document.getElementById('chatMessageInput').onkeypress = (e) => {
            if (e.key === 'Enter') sendTextMessage();
        };
        
        // Initialize
        await markAsRead();
        await loadMessages(true);
        
        // Auto refresh every 3 seconds
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(() => loadMessages(), 3000);
    };
    
    // Make function global
    window.openChatWindow = window.openChatNow;
    
    // Initialize button
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
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBarberButton);
    } else {
        initBarberButton();
    }
    
    console.log('Chat system loaded with Image Viewer');
})();