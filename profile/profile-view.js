// profile/profile-view.js
let currentViewingUser = null;
let isFriend = false;

// Load friend requests and friends list
async function loadFriendRequests() {
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    if (!userData.username) return;
    
    try {
        const response = await fetch(CONFIG.CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'getFriendRequests',
                username: userData.username
            })
        });
        const result = await response.json();
        
        if (result.success && result.requests && result.requests.length > 0) {
            console.log('Friend requests:', result.requests);
        }
    } catch(err) {
        console.error('Load friend requests error:', err);
    }
}

// Send friend request
async function sendFriendRequest(toUser) {
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    
    try {
        const response = await fetch(CONFIG.CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'sendFriendRequest',
                fromUser: userData.username,
                toUser: toUser
            })
        });
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Friend request sent!');
        } else {
            alert('❌ ' + result.message);
        }
    } catch(err) {
        console.error('Send friend request error:', err);
    }
}

// Accept friend request
async function acceptFriendRequest(fromUser) {
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    
    try {
        const response = await fetch(CONFIG.CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'acceptFriendRequest',
                fromUser: fromUser,
                toUser: userData.username
            })
        });
        const result = await response.json();
        
        if (result.success) {
            alert('✅ Friend request accepted!');
            loadFriendRequests();
        } else {
            alert('❌ ' + result.message);
        }
    } catch(err) {
        console.error('Accept friend request error:', err);
    }
}

// View user profile
async function viewUserProfile(username) {
    currentViewingUser = username;
    const currentUser = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    
    if (currentUser.username === username) {
        alert('This is your profile');
        return;
    }
    
    try {
        // Check if they are friends
        const friendsResponse = await fetch(CONFIG.CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'getFriends',
                username: currentUser.username
            })
        });
        const friendsResult = await friendsResponse.json();
        isFriend = friendsResult.friends?.some(f => f.username === username) || false;
        
        // Get profile picture
        const profileResponse = await fetch(CONFIG.CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'getUserProfile',
                username: username
            })
        });
        const profileResult = await profileResponse.json();
        
        if (isFriend) {
            alert(`👤 ${username}\n\n✅ You are friends!`);
        } else {
            const confirm = confirm(`👤 ${username}\n\nSend friend request to view contact info?`);
            if (confirm) {
                await sendFriendRequest(username);
            }
        }
    } catch(err) {
        console.error('View profile error:', err);
        alert('Unable to load profile');
    }
}

// Update unread badge on profile icon
async function updateUnreadBadge() {
    const userData = JSON.parse(localStorage.getItem(CONFIG.USER_DATA_KEY) || '{}');
    if (!userData.username) return;
    
    try {
        const response = await fetch(CONFIG.CHAT_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'getUnreadCount',
                username: userData.username
            })
        });
        const result = await response.json();
        
        const profileIcon = document.getElementById('profile-icon-btn');
        if (profileIcon && result.count > 0) {
            let badge = document.getElementById('unread-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.id = 'unread-badge';
                badge.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #dc3545; color: white; border-radius: 50%; min-width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center; padding: 0 4px; font-weight: bold;';
                profileIcon.style.position = 'relative';
                profileIcon.appendChild(badge);
            }
            badge.textContent = result.count > 99 ? '99+' : result.count;
            badge.style.display = 'flex';
        } else if (profileIcon) {
            const existingBadge = document.getElementById('unread-badge');
            if (existingBadge) existingBadge.style.display = 'none';
        }
    } catch(err) {
        console.error('Update badge error:', err);
    }
}

// Initialize profile system
const originalSetupProfile = window.setupProfileSystem;
window.setupProfileSystem = function() {
    if (typeof originalSetupProfile === 'function') {
        originalSetupProfile();
    }
    loadFriendRequests();
    
    // Add Barber Network button handler
    const barberBtn = document.getElementById('barber-network-btn');
    if (barberBtn) {
        barberBtn.onclick = function() {
            if (typeof window.openChatWindow === 'function') {
                window.openChatWindow();
            } else {
                alert('Chat feature loading...');
                // Fallback: create chat container
                const container = document.getElementById('chat-container');
                if (container) {
                    container.style.display = 'block';
                }
            }
        };
    }
};

// Start badge checking
setInterval(updateUnreadBadge, 10000);
updateUnreadBadge();