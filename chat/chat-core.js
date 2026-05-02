

// chat/chat-core.js - API Communication Layer
(function() {
    'use strict';
    
    let currentUser = null;
    let pendingCallbacks = [];
    let isConnected = true;
    
    // Helper: Get current user
    function getCurrentUser() {
        try {
            const data = localStorage.getItem('hair_user_data');
            return data ? JSON.parse(data) : null;
        } catch(e) {
            return null;
        }
    }
    
    // Helper: Escape HTML
    function escapeHtml(text) {
        if (!text) return '';
        return text.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    // Helper: Format time
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
    
    // Main API caller
    async function callApi(action, data = {}) {
        const user = getCurrentUser();
        if (!user) return { success: false, message: 'Not logged in' };
        
        const API_URL = window.CONFIG?.CHAT_API_URL;
        if (!API_URL) return { success: false, message: 'API URL not configured' };
        
        const payload = { action: action, username: user.username, ...data };
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return await response.json();
        } catch(e) {
            console.error(`API call ${action} failed:`, e);
            isConnected = false;
            setTimeout(() => { isConnected = true; }, 5000);
            return { success: false, message: e.message };
        }
    }
    
    // Compress image
    async function compressImage(file, maxWidth = 800, maxHeight = 800) {
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
    
    // Expose public API
    window.ChatAPI = {
        getCurrentUser: getCurrentUser,
        escapeHtml: escapeHtml,
        formatTime: formatTime,
        isConnected: () => isConnected,
        
        sendMessage: async function(message) {
            const user = getCurrentUser();
            if (!user) return { success: false };
            return await callApi('sendMessage', {
                fullname: user.fullname || user.username,
                message: message,
                imageUrl: ''
            });
        },
        
        sendImage: async function(file) {
            const user = getCurrentUser();
            if (!user) return { success: false, error: 'Not logged in' };
            
            if (!file.type.startsWith('image/')) {
                return { success: false, error: 'Please select an image file' };
            }
            if (file.size > 2 * 1024 * 1024) {
                return { success: false, error: 'Image must be less than 2MB' };
            }
            
            try {
                const compressedBlob = await compressImage(file);
                const base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(compressedBlob);
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                });
                
                const uploadResult = await callApi('uploadImage', { imageBase64: base64 });
                if (!uploadResult.success || !uploadResult.imageUrl) {
                    return { success: false, error: uploadResult.message || 'Upload failed' };
                }
                
                return await callApi('sendMessage', {
                    fullname: user.fullname || user.username,
                    message: '',
                    imageUrl: uploadResult.imageUrl
                });
            } catch(e) {
                return { success: false, error: e.message };
            }
        },
        
        getNewMessages: async function(lastTimestamp) {
            const result = await callApi('getMessages', { lastTimestamp: lastTimestamp });
            if (result.success && result.messages) {
                // Mark as read automatically when fetching
                await callApi('markAsRead', {});
                return result.messages;
            }
            return [];
        },
        
        getUnreadCount: async function() {
            const result = await callApi('getUnreadCount', {});
            if (result.success) return result.count || 0;
            return 0;
        },
        
        markAsRead: async function() {
            await callApi('markAsRead', {});
        }
    };
    
    console.log('Chat core loaded');
})();