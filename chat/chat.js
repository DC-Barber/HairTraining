// chat/chat.js - Main Chat Window Controller
(function() {
    'use strict';
    
    let chatContainer = null;
    let isOpen = false;
    
    function closeProfileOverlay() {
        const overlay = document.getElementById('profile-overlay');
        if (overlay) overlay.style.display = 'none';
    }
    
    window.openChatNow = async function() {
        if (isOpen) return;
        
        console.log('Opening chat...');
        closeProfileOverlay();
        
        const user = window.ChatAPI.getCurrentUser();
        if (!user || !user.username) {
            alert('Please login first');
            return;
        }
        
        // Create container
        chatContainer = document.getElementById('chat-container');
        if (!chatContainer) {
            chatContainer = document.createElement('div');
            chatContainer.id = 'chat-container';
            document.body.appendChild(chatContainer);
        }
        
        // Build UI
        chatContainer.style.display = 'block';
        chatContainer.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: white; z-index: 30000; display: flex; flex-direction: column;">
                <div style="background: #1e3a5f; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 18px; font-weight: bold;">💬 Barber Network</span>
                    <button id="closeChatFinalBtn" style="background: #dc3545; border: none; color: white; width: 35px; height: 35px; border-radius: 50%; font-size: 20px; cursor: pointer;">✕</button>
                </div>
                <div id="chatMessagesContainer" style="flex: 1; overflow-y: auto; padding: 10px; background: #f0f0f0;"></div>
                <div style="padding: 10px; background: white; border-top: 1px solid #ddd;">
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <input type="text" id="chatMessageInput" placeholder="Type your message..." style="flex: 1; padding: 12px; border: 1px solid #ddd; border-radius: 25px;">
                        <button id="chatSendButton" style="background: #1e3a5f; color: white; border: none; padding: 0 20px; border-radius: 25px;">Send</button>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <input type="file" id="chatImageFile" accept="image/*" style="display: none;">
                        <button id="chatImageButton" style="background: #4a6a8a; color: white; border: none; padding: 8px 20px; border-radius: 25px;">📷 Image</button>
                        <span id="uploadStatus" style="font-size: 12px;"></span>
                    </div>
                </div>
            </div>
        `;
        
        const messagesContainer = document.getElementById('chatMessagesContainer');
        const messageInput = document.getElementById('chatMessageInput');
        const sendBtn = document.getElementById('chatSendButton');
        const imageInput = document.getElementById('chatImageFile');
        const imageBtn = document.getElementById('chatImageButton');
        const uploadStatus = document.getElementById('uploadStatus');
        
        // Notify loader that chat is open
        if (window.ChatEvents) {
            window.ChatEvents.onChatOpen(messagesContainer);
        }
        
        // Send message handler
        async function handleSend() {
            const message = messageInput.value.trim();
            if (!message) return;
            
            sendBtn.disabled = true;
            sendBtn.textContent = '...';
            
            const result = await window.ChatAPI.sendMessage(message);
            
            if (result.success) {
                messageInput.value = '';
                // Force immediate sync
                if (window.ChatLoader) window.ChatLoader.syncNow();
            } else {
                alert('Failed to send: ' + result.message);
            }
            
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send';
        }
        
        // Send image handler
        async function handleImage() {
            const file = imageInput.files[0];
            if (!file) return;
            
            uploadStatus.innerHTML = '📤 Uploading...';
            uploadStatus.style.color = '#1e3a5f';
            
            const result = await window.ChatAPI.sendImage(file);
            
            if (result.success) {
                imageInput.value = '';
                uploadStatus.innerHTML = '✅ Sent!';
                setTimeout(() => { uploadStatus.innerHTML = ''; }, 2000);
                if (window.ChatLoader) window.ChatLoader.syncNow();
            } else {
                uploadStatus.innerHTML = '❌ ' + (result.error || 'Failed');
                uploadStatus.style.color = '#dc3545';
                setTimeout(() => { uploadStatus.innerHTML = ''; }, 2000);
            }
        }
        
        // Close chat
        function closeChat() {
            if (window.ChatEvents) window.ChatEvents.onChatClose();
            chatContainer.style.display = 'none';
            isOpen = false;
        }
        
        // Event listeners
        document.getElementById('closeChatFinalBtn').onclick = closeChat;
        sendBtn.onclick = handleSend;
        imageBtn.onclick = () => imageInput.click();
        imageInput.onchange = handleImage;
        messageInput.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };
        
        isOpen = true;
    };
    
    window.openChatWindow = window.openChatNow;
    
    // Barber button init
    function initBarberButton() {
        const btn = document.getElementById('barber-network-btn');
        if (btn) {
            btn.onclick = (e) => { e.preventDefault(); window.openChatNow(); };
        } else {
            setTimeout(initBarberButton, 500);
        }
    }
    
    // Override setupProfileSystem to include barber button
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
    
    console.log('Chat window ready');
})();