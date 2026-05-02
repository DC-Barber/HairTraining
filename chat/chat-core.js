// chat/chat-core.js - Fixed (with fallback URL)
(function() {
    'use strict';
    
    // ✅ Fallback URL (သင်၏ Apps Script URL - ဒီမှာ ထည့်ပါ)
    const FALLBACK_API_URL = 'https://script.google.com/macros/s/AKfycbwXStl6JCMGh-LthuAuQqRcnm4_TdM9E83ymRfE3oW3AYajyRN_v15PF7xdXo4Y6wvxfA/exec';
    
    function getCurrentUser() {
        try {
            const data = localStorage.getItem('hair_user_data');
            return data ? JSON.parse(data) : null;
        } catch(e) {
            return null;
        }
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
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch(e) {
            return '';
        }
    }
    
    // ✅ Get API URL with fallback
    function getApiUrl() {
        if (window.CONFIG && window.CONFIG.CHAT_API_URL) {
            console.log('Using CONFIG.CHAT_API_URL');
            return window.CONFIG.CHAT_API_URL;
        }
        console.log('Using FALLBACK_API_URL');
        return FALLBACK_API_URL;
    }
    
    // API caller with retry
    async function callApi(action, data = {}, retryCount = 0) {
        const user = getCurrentUser();
        if (!user) return { success: false, message: 'Not logged in' };
        
        const API_URL = getApiUrl();
        if (!API_URL) return { success: false, message: 'API URL not configured' };
        
        console.log(`Calling API: ${action} to ${API_URL.substring(0, 60)}...`);
        
        const payload = { action: action, username: user.username, ...data };
        const maxRetries = 2;
        
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
            
            if (!response.ok) {
                if (response.status === 429 && retryCount < maxRetries) {
                    await new Promise(r => setTimeout(r, 2000));
                    return callApi(action, data, retryCount + 1);
                }
                throw new Error(`HTTP ${response.status}`);
            }
            
            return await response.json();
        } catch(e) {
            console.error(`API call ${action} failed:`, e);
            
            if (retryCount < maxRetries) {
                await new Promise(r => setTimeout(r, 2000));
                return callApi(action, data, retryCount + 1);
            }
            
            return { success: false, message: e.message };
        }
    }
    
    // Compress image
    async function compressImage(file, maxWidth = 600, maxHeight = 600) {
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
    
    window.ChatAPI = {
        getCurrentUser: getCurrentUser,
        escapeHtml: escapeHtml,
        formatTime: formatTime,
        
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
                return { success: false, error: 'Please select an image' };
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
                callApi('markAsRead', {}).catch(() => {});
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
    
    console.log('Chat core loaded with fallback URL');
})();