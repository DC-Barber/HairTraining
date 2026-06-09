

// visitor.js - Visitor Counter with Google Sheets Database (No UI Display)
// ဤဖိုင်သည် Google Sheets ကို database အဖြစ်သုံးပြီး UI တွင်မပြဘဲ background မှာ visitor count ကို update လုပ်မည်

// ==================== CONFIGURATION ====================
// သင်၏ Google Apps Script Web App URL ကို ထည့်ပါ
// Deploy ပြီးရရှိသော URL ပုံစံ: https://script.google.com/macros/s/YOUR_ID/exec
const VISITOR_API_URL = 'https://script.google.com/macros/s/AKfycbwq4Ky2KARUw00aRdyssgPtLvUXs-gTM2exbZNbxlsgTRLNoO1TVQr9A8VYh3KV2nAb1Q/exec';

// Storage keys
const STORAGE_KEYS = {
    SESSION_COUNTED: 'visitor_counted_sheet',
    TODAY_COUNT: 'visitor_today_sheet',
    TOTAL_COUNT: 'visitor_total_sheet',
    LAST_UPDATE: 'visitor_last_update'
};

// ==================== CORE FUNCTIONS ====================

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Update visitor count in Google Sheets (silent mode - no UI)
async function updateVisitorCount() {
    try {
        // Check if already counted in this session
        const sessionCounted = sessionStorage.getItem(STORAGE_KEYS.SESSION_COUNTED);
        
        if (!sessionCounted) {
            // Call Google Sheets API to update count
            const response = await fetch(`${VISITOR_API_URL}?action=updateCount`, {
                method: 'GET',
                mode: 'cors'
            });
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    // Mark this session as counted
                    sessionStorage.setItem(STORAGE_KEYS.SESSION_COUNTED, 'true');
                    
                    // Store in localStorage for reference (not displayed)
                    localStorage.setItem(STORAGE_KEYS.TODAY_COUNT, data.today);
                    localStorage.setItem(STORAGE_KEYS.TOTAL_COUNT, data.total);
                    localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
                    
                    console.log('[Visitor] Count updated:', data.today, '/', data.total);
                }
            } else {
                console.warn('[Visitor] API response not OK:', response.status);
                // Fallback to localStorage only
                updateLocalFallback();
            }
        } else {
            // Get latest count without updating
            await getLatestCount();
        }
    } catch (error) {
        console.error('[Visitor] Update failed:', error);
        // Silent fail - fallback to localStorage
        updateLocalFallback();
    }
}

// Get latest count without incrementing
async function getLatestCount() {
    try {
        const response = await fetch(`${VISITOR_API_URL}?action=getCount`, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                localStorage.setItem(STORAGE_KEYS.TODAY_COUNT, data.today);
                localStorage.setItem(STORAGE_KEYS.TOTAL_COUNT, data.total);
                localStorage.setItem(STORAGE_KEYS.LAST_UPDATE, new Date().toISOString());
            }
        }
    } catch (error) {
        console.warn('[Visitor] Get count failed:', error);
    }
}

// Fallback to localStorage only (when API fails)
function updateLocalFallback() {
    const today = getTodayDate();
    const lastDate = localStorage.getItem('visitor_last_date_fallback');
    let todayCount = parseInt(localStorage.getItem('visitor_today_fallback')) || 0;
    let totalCount = parseInt(localStorage.getItem('visitor_total_fallback')) || 0;
    
    const sessionCounted = sessionStorage.getItem('visitor_counted_fallback');
    
    if (!sessionCounted) {
        if (lastDate !== today) {
            todayCount = 0;
            localStorage.setItem('visitor_last_date_fallback', today);
        }
        
        todayCount++;
        totalCount++;
        
        localStorage.setItem('visitor_today_fallback', todayCount);
        localStorage.setItem('visitor_total_fallback', totalCount);
        sessionStorage.setItem('visitor_counted_fallback', 'true');
        
        console.log('[Visitor] Fallback count updated:', todayCount, '/', totalCount);
    }
}

// Get current visitor counts (returns object, not displayed)
function getCurrentCounts() {
    return {
        today: parseInt(localStorage.getItem(STORAGE_KEYS.TODAY_COUNT)) || 0,
        total: parseInt(localStorage.getItem(STORAGE_KEYS.TOTAL_COUNT)) || 0,
        lastUpdate: localStorage.getItem(STORAGE_KEYS.LAST_UPDATE) || null
    };
}

// Reset session (for testing purposes)
function resetSessionCount() {
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_COUNTED);
    sessionStorage.removeItem('visitor_counted_fallback');
    console.log('[Visitor] Session reset');
}

// ==================== AUTO INITIALIZATION ====================
// Run when page loads (silent mode - no UI display)
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to not interfere with page loading
    setTimeout(function() {
        updateVisitorCount();
    }, 1000);
});

// Optional: Update on page visibility change (when tab becomes active again)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Page became visible again - get latest count without incrementing
        setTimeout(getLatestCount, 500);
    }
});

// ==================== EXPORTS (for debugging - optional) ====================
// Make functions available globally for debugging (remove in production if needed)
window.VisitorCounter = {
    update: updateVisitorCount,
    getCounts: getCurrentCounts,
    resetSession: resetSessionCount
};