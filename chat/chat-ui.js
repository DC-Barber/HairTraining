// chat/chat-ui.js - Optimized UI
(function() {
    'use strict';
    
    let currentImageViewer = null;
    
    function showImageViewer(imageUrl) {
        if (currentImageViewer) currentImageViewer.remove();
        const viewer = document.createElement('div');
        viewer.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.95); z-index: 40000;
            display: flex; align-items: center; justify-content: center;
        `;
        viewer.innerHTML = `
            <div style="position: relative;">
                <button id="closeViewerBtn" style="position: absolute; top: -40px; right: -10px;
                    background: #dc3545; color: white; border: none; width: 36px; height: 36px;
                    border-radius: 50%; font-size: 20px; cursor: pointer;">×</button>
                <img src="${imageUrl}" style="max-width: 90vw; max-height: 90vh; border-radius: 12px;">
            </div>
        `;
        document.body.appendChild(viewer);
        currentImageViewer = viewer;
        document.getElementById('closeViewerBtn').onclick = () => viewer.remove();
        viewer.onclick = (e) => { if (e.target === viewer) viewer.remove(); };
    }
    window.showImageViewer = showImageViewer;
    
    function createMessageElement(msg, isOwn) {
        const div = document.createElement('div');
        div.style.marginBottom = '12px';
        div.style.display = 'flex';
        div.style.justifyContent = isOwn ? 'flex-end' : 'flex-start';
        
        let imageHtml = '';
        if (msg.imageUrl && msg.imageUrl.trim()) {
            imageHtml = `
                <div style="margin-top: 6px;">
                    <img src="${msg.imageUrl}" 
                         style="max-width: 130px; max-height: 100px; border-radius: 10px; cursor: pointer;"
                         onclick="showImageViewer('${msg.imageUrl}')">
                </div>
            `;
        }
        
        if (isOwn) {
            div.innerHTML = `
                <div style="max-width: 75%; background: #1e3a5f; color: white; padding: 8px 12px; border-radius: 16px; border-bottom-right-radius: 4px;">
                    ${msg.message ? `<div style="font-size: 13px;">${window.ChatAPI.escapeHtml(msg.message)}</div>` : ''}
                    ${imageHtml}
                    <div style="font-size: 9px; color: #aaa; margin-top: 4px; text-align: right;">${window.ChatAPI.formatTime(msg.timestamp)}</div>
                </div>
            `;
        } else {
            div.innerHTML = `
                <div style="max-width: 75%; background: white; padding: 8px 12px; border-radius: 16px; border-bottom-left-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                    <div style="font-size: 10px; color: #666; margin-bottom: 2px;">${window.ChatAPI.escapeHtml(msg.fullname || msg.username)}</div>
                    ${msg.message ? `<div style="font-size: 13px;">${window.ChatAPI.escapeHtml(msg.message)}</div>` : ''}
                    ${imageHtml}
                    <div style="font-size: 9px; color: #999; margin-top: 4px;">${window.ChatAPI.formatTime(msg.timestamp)}</div>
                </div>
            `;
        }
        return div;
    }
    
    function appendNewMessages(messages, container) {
        if (!container || !messages || messages.length === 0) return false;
        
        let hasNew = false;
        messages.forEach(msg => {
            if (!window.ChatCache.hasMessage(msg.id)) {
                const msgDiv = createMessageElement(msg, msg.isOwn);
                msgDiv.setAttribute('data-msg-id', msg.id);
                container.appendChild(msgDiv);
                hasNew = true;
            }
        });
        
        if (hasNew) {
            container.scrollTop = container.scrollHeight;
        }
        return hasNew;
    }
    
    function loadAllMessages(messages, container) {
        if (!container) return;
        container.innerHTML = '';
        messages.forEach(msg => {
            const msgDiv = createMessageElement(msg, msg.isOwn);
            msgDiv.setAttribute('data-msg-id', msg.id);
            container.appendChild(msgDiv);
        });
        container.scrollTop = container.scrollHeight;
    }
    
    function showLoading(container, text = 'Loading messages...') {
        if (container && container.children.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: #666; padding: 30px;">🔄 ${text}</div>`;
        }
    }
    
    function showEmpty(container) {
        if (container && container.children.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #999; padding: 40px;">No messages yet. Be the first! 👋</div>';
        }
    }
    
    function showError(container, message = 'Connection error.') {
        if (container && container.children.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: #dc3545; padding: 40px;">⚠️ ${message}</div>`;
        }
    }
    
    window.ChatUI = {
        createMessageElement: createMessageElement,
        appendNewMessages: appendNewMessages,
        loadAllMessages: loadAllMessages,
        showLoading: showLoading,
        showEmpty: showEmpty,
        showError: showError,
        showImageViewer: showImageViewer
    };
    
    // Add minimal CSS
    const style = document.createElement('style');
    style.textContent = `@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}`;
    document.head.appendChild(style);
    
    console.log('Chat UI loaded (optimized)');
})();