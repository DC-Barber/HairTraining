

// chat/chat-utils.js - Utility functions

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Badge injection functions
function injectBadge() {
    if (document.getElementById('message-badge')) return;
    
    const profileIcon = document.getElementById('profile-icon-btn');
    if (!profileIcon) return;
    
    const parentDiv = profileIcon.parentElement;
    if (!parentDiv) return;
    
    const badgeContainer = document.createElement('div');
    badgeContainer.style.position = 'relative';
    badgeContainer.style.display = 'inline-block';
    
    parentDiv.insertBefore(badgeContainer, profileIcon);
    badgeContainer.appendChild(profileIcon);
    
    const badge = document.createElement('span');
    badge.id = 'message-badge';
    badge.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #e74c3c; color: white; border-radius: 50%; min-width: 18px; height: 18px; font-size: 10px; display: none; align-items: center; justify-content: center; padding: 0 4px; font-weight: bold; box-shadow: 0 1px 3px rgba(0,0,0,0.3);';
    badge.innerText = '0';
    badgeContainer.appendChild(badge);
}

function injectBarberButton() {
    if (document.getElementById('barber-network-btn')) return;
    
    const examBtn = document.querySelector('#profile-overlay button[onclick="openExam()"]');
    if (!examBtn) return;
    
    const barberBtn = document.createElement('button');
    barberBtn.id = 'barber-network-btn';
    barberBtn.innerHTML = '💬 Barber Network';
    barberBtn.style.cssText = 'background: #2980b9; color: white; border: none; width: 100%; padding: 12px; border-radius: 12px; font-weight: bold; cursor: pointer; margin-bottom: 12px;';
    barberBtn.onclick = function() {
        document.getElementById('profile-overlay').style.display = 'none';
        openChatPage();
    };
    
    examBtn.insertAdjacentElement('afterend', barberBtn);
}

function observeProfileModal() {
    const observer = new MutationObserver(function(mutations) {
        const overlay = document.getElementById('profile-overlay');
        if (overlay && overlay.style.display === 'block') {
            setTimeout(() => {
                injectBarberButton();
            }, 150);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}