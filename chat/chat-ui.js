

// chat/chat-ui.js - UI related functions (open, close, modals)

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
                <button id="chat-image-btn" style="background:#f0e7dc; border:none; width:48px; height:48px; border-radius:25px; font-size:20px; cursor:pointer;">📷</button>
                <input type="text" id="chat-input" placeholder="Type a message..." style="flex:1; padding:12px; border:1px solid #ddd; border-radius:25px; outline:none; font-size:16px;">
                <button id="chat-send-btn" style="background:#1e3a5f; color:white; border:none; width:48px; height:48px; border-radius:25px; font-size:16px; font-weight:bold; cursor:pointer;">Send</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', chatHtml);
    
    // Image upload handler
    document.getElementById('chat-image-input').onchange = uploadChatImage;
    document.getElementById('chat-image-btn').onclick = () => document.getElementById('chat-image-input').click();
    document.getElementById('chat-send-btn').onclick = sendChatMessage;
    
    // Enter key to send
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
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
    updateChatBadge();
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