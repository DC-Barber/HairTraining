

// chat/chat-upload.js - Image upload functions

async function uploadChatImage() {
    const input = document.getElementById('chat-image-input');
    const file = input.files[0];
    if (!file) return;
    
    const sendBtn = document.getElementById('chat-send-btn');
    const originalText = sendBtn.innerHTML;
    sendBtn.disabled = true;
    sendBtn.innerHTML = '📤';
    sendBtn.style.opacity = '0.6';
    
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    const deviceId = localStorage.getItem('device_id') || await APIService.getDeviceId();
    
    const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
    });
    
    try {
        const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
        const response = await fetch(CORS_PROXY + CONFIG.IMGBB_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageBase64: base64,
                username: userData.username,
                fullname: userData.fullname,
                deviceId: deviceId
            })
        });
        const result = await response.json();
        
        if (result.success && result.imageUrl) {
            const payload = {
                action: 'send',
                username: userData.username,
                fullname: userData.fullname,
                profilePic: userData.profilePic || '',
                type: 'image',
                content: result.imageUrl,
                userId: userData.username
            };
            
            const sendResponse = await fetch(CONFIG.CHAT_API_URL, {
                method: 'POST',
                mode: 'cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const sendResult = await sendResponse.json();
            if (sendResult.success) {
                await loadChatMessages();
            }
        }
        input.value = '';
    } catch (error) {
        console.error("Upload image error:", error);
        alert("ပုံတင်ရာတွင် အဆင်မပြေပါ။");
    } finally {
        sendBtn.disabled = false;
        sendBtn.innerHTML = originalText;
        sendBtn.style.opacity = '1';
    }
}