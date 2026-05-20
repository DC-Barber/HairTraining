// custom-ad.js - Custom Ad System with Google Sheets

const CustomAd = {
    SHEET_ID: '1T5OHebH3N6WLvGyqeab3okjFYPCYY9jAoa2sF49F4yM',
    SHEET_NAME: 'Sheet1',
    
    currentAd: null,
    adLoaded: false,
    isAdShowing: false,
    pendingCallback: null,
    
    // Check if running on localhost
    isLocalhost: function() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    },
    
    getSheetAPIUrl: function() {
        return `https://docs.google.com/spreadsheets/d/${this.SHEET_ID}/gviz/tq?tqx=out:json&sheet=${this.SHEET_NAME}`;
    },
    
    loadAds: async function() {
        if (this.isLocalhost()) {
            console.log('🏠 Localhost detected - using test ad data');
            this.currentAd = {
                id: 1,
                imageUrl: 'https://placehold.co/300x250/1e3a5f/white?text=Test+Ad+Localhost',
                linkUrl: 'https://dcbarber.shop'
            };
            this.adLoaded = true;
            return;
        }
        
        try {
            console.log('📡 Loading ads from Google Sheets...');
            const response = await fetch(this.getSheetAPIUrl());
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            let text = await response.text();
            text = text.replace(/^\/\*O_o\*\//, '');
            text = text.replace('google.visualization.Query.setResponse(', '');
            text = text.replace(/\);$/, '');
            
            const data = JSON.parse(text);
            const rows = data.table.rows;
            const cols = data.table.cols || [];
            
            let idCol = 0, imageCol = 1, linkCol = 2, activeCol = 3;
            for (let i = 0; i < cols.length; i++) {
                const label = (cols[i].label || '').toLowerCase();
                if (label === 'id') idCol = i;
                if (label === 'image' || label === 'image_url') imageCol = i;
                if (label === 'link' || label === 'link_url') linkCol = i;
                if (label === 'active' || label === 'is_active') activeCol = i;
            }
            
            const ads = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row || !row.c) continue;
                const isActive = row.c[activeCol]?.v === true || row.c[activeCol]?.v === 'TRUE';
                if (isActive) {
                    ads.push({
                        id: row.c[idCol]?.v || i,
                        imageUrl: row.c[imageCol]?.v || '',
                        linkUrl: row.c[linkCol]?.v || '#'
                    });
                }
            }
            
            if (ads.length > 0) {
                const randomIndex = Math.floor(Math.random() * ads.length);
                this.currentAd = ads[randomIndex];
                console.log('✅ Ad loaded:', this.currentAd);
            } else {
                this.currentAd = {
                    id: 0,
                    imageUrl: 'https://placehold.co/300x250/1e3a5f/white?text=No+Active+Ads',
                    linkUrl: '#',
                };
            }
            this.adLoaded = true;
        } catch (error) {
            console.error('❌ Failed to load ads:', error);
            this.currentAd = {
                id: 0,
                imageUrl: 'https://placehold.co/300x250/d9534f/white?text=Ad+Error',
                linkUrl: '#',
            };
            this.adLoaded = true;
        }
    },
    
    showAdDialog: function(callback) {
        if (this.isAdShowing) return;
        if (document.getElementById('custom-ad-overlay')) return;
        
        this.isAdShowing = true;
        this.pendingCallback = callback;
        
        const overlay = document.createElement('div');
        overlay.id = 'custom-ad-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:100000;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(5px);';
        
        const adCard = document.createElement('div');
        adCard.style.cssText = 'background:white;border-radius:20px;width:90%;max-width:320px;overflow:hidden;box-shadow:0 20px 40px rgba(0,0,0,0.3);position:relative;';
        
        if (!document.querySelector('#ad-style')) {
            const style = document.createElement('style');
            style.id = 'ad-style';
            style.textContent = `
                @keyframes adFadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes adPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
            `;
            document.head.appendChild(style);
        }
        adCard.style.animation = 'adFadeIn 0.3s ease';
        
        // Close button (hidden initially)
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;width:36px;height:36px;background:#1e3a5f;color:white;border:none;border-radius:50%;font-size:18px;cursor:pointer;z-index:10;display:none;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
        
        // Timer display
        const timerDisplay = document.createElement('div');
        timerDisplay.style.cssText = 'position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.65);color:white;padding:5px 12px;border-radius:20px;font-size:13px;font-weight:bold;z-index:10;font-family:monospace;';
        timerDisplay.innerHTML = '⏳ 5';
        
        // Ad link and image
        const adLink = document.createElement('a');
        adLink.href = this.currentAd.linkUrl;
        adLink.target = '_blank';
        adLink.style.display = 'block';
        
        const adImg = document.createElement('img');
        adImg.src = this.currentAd.imageUrl;
        adImg.alt = 'Advertisement';
        adImg.style.cssText = 'width:100%;height:auto;display:block;';
        adImg.onerror = () => {
            adImg.src = 'https://placehold.co/300x250/1e3a5f/white?text=Image+Not+Found';
        };
        
        adLink.appendChild(adImg);
        
        const adLabel = document.createElement('div');
        adLabel.style.cssText = 'text-align:center;padding:10px;font-size:11px;color:#999;background:#fafafa;border-top:1px solid #eee;';
        adLabel.innerHTML = '🎯 Sponsored';
        
        adCard.appendChild(closeBtn);
        adCard.appendChild(timerDisplay);
        adCard.appendChild(adLink);
        adCard.appendChild(adLabel);
        overlay.appendChild(adCard);
        document.body.appendChild(overlay);
        
        let seconds = 5;
        const countdown = setInterval(() => {
            seconds--;
            timerDisplay.innerHTML = `⏳ ${seconds}`;
            if (seconds <= 0) {
                clearInterval(countdown);
                timerDisplay.style.display = 'none';
                closeBtn.style.display = 'flex';
                closeBtn.style.animation = 'adPulse 0.5s ease';
                setTimeout(() => {
                    closeBtn.style.animation = '';
                }, 500);
            }
        }, 1000);
        
        // Close button click handler - execute original function
        closeBtn.onclick = () => {
            overlay.remove();
            this.isAdShowing = false;
            if (this.pendingCallback) {
                this.pendingCallback();
                this.pendingCallback = null;
            }
        };
        
        // Click outside only after timer ends
        overlay.onclick = (e) => {
            if (e.target === overlay && seconds <= 0) {
                overlay.remove();
                this.isAdShowing = false;
                if (this.pendingCallback) {
                    this.pendingCallback();
                    this.pendingCallback = null;
                }
            }
        };
    },
    
    init: function() {
        console.log('🎯 Custom Ad System Initialized');
        if (this.isLocalhost()) {
            console.log('🏠 Running on localhost - using test ads');
        }
        this.loadAds();
        
        // ========== SPECIFY WHICH BUTTONS TRIGGER ADS ==========
        // ဒီနေရာမှာ သတ်မှတ်ထားတဲ့ ခလုတ်တွေပဲ Ad ပြမယ်
        const adTriggerSelectors = [
            '.arrow-btn',           // မြှားခလုတ် (နောက်/ရှေ့)
            '#fab-btn',             // FAB button (☰)
            '#profile-icon-btn',    // Profile icon
            '#guest-mode-btn',      // Guest user button
            '#login-submit-btn',    // Login button
            '#mode-toggle-btn',     // Register toggle
            '.back-link',           // Privacy/About back links
            '.logout-btn',          // Logout button
            '#prev-arrow',          // Previous arrow
            '#next-arrow'           // Next arrow
        ];
        
        const selectorString = adTriggerSelectors.join(',');
        
        const hookButtons = () => {
            const btns = document.querySelectorAll(selectorString);
            console.log(`🔘 Found ${btns.length} buttons to hook for ads`);
            
            btns.forEach(btn => {
                if (btn && !btn.hasAdHook) {
                    btn.hasAdHook = true;
                    
                    // Store original click handler
                    const originalOnClick = btn.onclick;
                    const originalClickListener = btn.click;
                    
                    // Remove original onclick attribute if exists
                    if (originalOnClick) {
                        btn.removeAttribute('onclick');
                    }
                    
                    // Add new click handler
                    btn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        console.log('🔘 Button clicked, showing ad first');
                        
                        // Show ad, then execute original action after close
                        this.showAdDialog(() => {
                            console.log('✅ Ad closed, executing original button action');
                            
                            // Execute original handler
                            if (originalOnClick) {
                                originalOnClick.call(btn, e);
                            }
                            
                            // Trigger native click if needed
                            if (btn.click && btn !== e.target) {
                                // Prevent infinite loop
                            }
                        });
                    });
                }
            });
        };
        
        setTimeout(hookButtons, 1500);
        
        const observer = new MutationObserver(() => hookButtons());
        observer.observe(document.body, { childList: true, subtree: true });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CustomAd.init());
} else {
    CustomAd.init();
}