// visitor.js - Google Sheets Database with Profile Border Color Feedback
// ဤဖိုင်သည် Google Sheets ကို database အဖြစ်သုံးပြီး profile icon border တွင် အရောင်ပြောင်းပေးမည်

// ==================== CONFIGURATION ====================
const VISITOR_API_URL = 'https://script.google.com/macros/s/AKfycbwTk39Nr11Xmw12Yw3lh6ndgGe0fxyZs7TFdmRsZyOnCGjtL3J-5cu_4dIO2LKYx0yn/exec';

// ==================== DOM ELEMENTS ====================
function getProfileIcon() {
    return document.querySelector('.profile-icon');
}

// ==================== UPDATE PROFILE BORDER COLOR ====================
function setProfileBorderColor(status) {
    const profileIcon = getProfileIcon();
    if (!profileIcon) return;
    
    // Remove existing status classes
    profileIcon.classList.remove('border-success', 'border-error', 'border-pending');
    
    if (status === 'success') {
        // Data received from Google Sheets - Green border
        profileIcon.classList.add('border-success');
        profileIcon.style.border = '3px solid #2ecc71';
        profileIcon.style.boxShadow = '0 0 0 2px rgba(46, 204, 113, 0.3)';
    } else if (status === 'error') {
        // No data from Google Sheets - Red border
        profileIcon.classList.add('border-error');
        profileIcon.style.border = '3px solid #e74c3c';
        profileIcon.style.boxShadow = '0 0 0 2px rgba(231, 76, 60, 0.3)';
    } else if (status === 'pending') {
        // Checking/waiting - Yellow/Orange border
        profileIcon.classList.add('border-pending');
        profileIcon.style.border = '3px solid #f39c12';
        profileIcon.style.boxShadow = '0 0 0 2px rgba(243, 156, 18, 0.3)';
    }
}

// ==================== ADD INDICATOR DOT ON PROFILE ====================
function addStatusDot(status) {
    // Remove existing dot if any
    const existingDot = document.querySelector('.profile-status-dot');
    if (existingDot) existingDot.remove();
    
    const profileWrapper = document.getElementById('profile-icon-wrapper');
    if (!profileWrapper) return;
    
    const dot = document.createElement('div');
    dot.className = `profile-status-dot status-${status}`;
    dot.style.cssText = `
        position: absolute;
        bottom: 2px;
        right: 2px;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid white;
        transition: all 0.3s ease;
    `;
    
    if (status === 'success') {
        dot.style.backgroundColor = '#2ecc71';
        dot.style.boxShadow = '0 0 5px #2ecc71';
    } else if (status === 'error') {
        dot.style.backgroundColor = '#e74c3c';
        dot.style.boxShadow = '0 0 5px #e74c3c';
    } else if (status === 'pending') {
        dot.style.backgroundColor = '#f39c12';
        dot.style.boxShadow = '0 0 5px #f39c12';
        // Blinking animation for pending
        dot.style.animation = 'blink 1s infinite';
    }
    
    profileWrapper.style.position = 'relative';
    profileWrapper.appendChild(dot);
}

// Add CSS animation for blinking
function addBlinkAnimation() {
    if (!document.getElementById('blink-animation')) {
        const style = document.createElement('style');
        style.id = 'blink-animation';
        style.textContent = `
            @keyframes blink {
                0% { opacity: 1; }
                50% { opacity: 0.4; }
                100% { opacity: 1; }
            }
            .profile-status-dot {
                transition: all 0.3s ease;
            }
            .border-success {
                transition: all 0.3s ease;
            }
            .border-error {
                transition: all 0.3s ease;
            }
            .border-pending {
                transition: all 0.3s ease;
                animation: borderPulse 1s infinite;
            }
            @keyframes borderPulse {
                0% { border-color: #f39c12; box-shadow: 0 0 0 2px rgba(243, 156, 18, 0.3); }
                50% { border-color: #e67e22; box-shadow: 0 0 0 4px rgba(243, 156, 18, 0.5); }
                100% { border-color: #f39c12; box-shadow: 0 0 0 2px rgba(243, 156, 18, 0.3); }
            }
        `;
        document.head.appendChild(style);
    }
}

// ==================== API CALL FUNCTION ====================
async function callAPI(action) {
    try {
        const response = await fetch(`${VISITOR_API_URL}?action=${action}`, {
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache'
        });
        
        if (response.ok) {
            return await response.json();
        } else {
            console.warn(`API returned ${response.status}`);
            return null;
        }
    } catch (error) {
        console.error('API call failed:', error);
        return null;
    }
}

// ==================== UPDATE VISITOR COUNT ====================
async function updateVisitorCount() {
    // Set pending state - checking connection
    setProfileBorderColor('pending');
    addStatusDot('pending');
    
    try {
        // First, test if API is reachable
        const testResult = await callAPI('test');
        
        if (!testResult || !testResult.success) {
            // API not reachable - Red border
            console.log('[Visitor] API not reachable');
            setProfileBorderColor('error');
            addStatusDot('error');
            return;
        }
        
        console.log('[Visitor] API reachable, updating count...');
        
        const sessionCounted = sessionStorage.getItem('visitor_counted_sheet');
        
        if (!sessionCounted) {
            const data = await callAPI('updateCount');
            
            if (data && data.success) {
                sessionStorage.setItem('visitor_counted_sheet', 'true');
                localStorage.setItem('visitor_today_sheet', data.today);
                localStorage.setItem('visitor_total_sheet', data.total);
                localStorage.setItem('visitor_last_update', new Date().toISOString());
                localStorage.setItem('visitor_data_received', 'true');
                
                console.log('[Visitor] Count updated - Today:', data.today, 'Total:', data.total);
                
                // Success - Green border
                setProfileBorderColor('success');
                addStatusDot('success');
            } else {
                console.log('[Visitor] Update failed');
                setProfileBorderColor('error');
                addStatusDot('error');
            }
        } else {
            // Already counted this session, just get latest
            const data = await callAPI('getCount');
            
            if (data && data.success) {
                localStorage.setItem('visitor_today_sheet', data.today);
                localStorage.setItem('visitor_total_sheet', data.total);
                localStorage.setItem('visitor_data_received', 'true');
                
                console.log('[Visitor] Count retrieved - Today:', data.today, 'Total:', data.total);
                
                // Success - Green border
                setProfileBorderColor('success');
                addStatusDot('success');
            } else {
                setProfileBorderColor('error');
                addStatusDot('error');
            }
        }
    } catch (error) {
        console.error('[Visitor] Error:', error);
        setProfileBorderColor('error');
        addStatusDot('error');
    }
}

// ==================== GET CURRENT COUNTS (for debugging) ====================
function getCurrentCounts() {
    return {
        today: localStorage.getItem('visitor_today_sheet') || '0',
        total: localStorage.getItem('visitor_total_sheet') || '0',
        dataReceived: localStorage.getItem('visitor_data_received') === 'true',
        lastUpdate: localStorage.getItem('visitor_last_update') || null
    };
}

// ==================== CHECK IF DATA WAS RECEIVED EVER ====================
function checkDataReceived() {
    const dataReceived = localStorage.getItem('visitor_data_received') === 'true';
    if (dataReceived) {
        setProfileBorderColor('success');
        addStatusDot('success');
    } else {
        setProfileBorderColor('pending');
        addStatusDot('pending');
    }
}

// ==================== INITIALIZATION ====================
addBlinkAnimation();

document.addEventListener('DOMContentLoaded', function() {
    // Check if data was ever received
    checkDataReceived();
    
    // Update visitor count after 1 second
    setTimeout(function() {
        updateVisitorCount();
    }, 1000);
    
    // Re-check when page becomes visible again
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            setTimeout(updateVisitorCount, 500);
        }
    });
});

// ==================== DEBUG FUNCTIONS (Console only) ====================
window.VisitorCounter = {
    update: updateVisitorCount,
    getCounts: getCurrentCounts,
    checkAPI: async () => await callAPI('test'),
    getSheetData: async () => await callAPI('getCount')
};

console.log('[Visitor] Script loaded. Use VisitorCounter.getCounts() to check status');
