// custom-ad.js - နောက်ဆုံး (Guest Proceed Button ပါ)

const CustomAd = {
    CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQLQKYGz1FbjIZPXkrvbrWv3ktfoplkY8thdxAArpnhvwgk-fu7z0ahtUOBacuEC_BWzO9_oKpq3Upr/pub?output=csv',
    FORCE_TEST_MODE: false,
    
    currentAd: null,
    adLoaded: false,
    isAdShowing: false,
    
    isLocalhost: function() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.protocol === 'file:';
    },
    
    loadAds: async function() {
        if (this.isLocalhost() && this.FORCE_TEST_MODE) {
            this.currentAd = {
                id: 1,
                imageUrl: 'https://placehold.co/300x250/1e3a5f/white?text=Test+Ad',
                linkUrl: 'https://dcbarber.shop'
            };
            this.adLoaded = true;
            return;
        }
        
        try {
            console.log('📡 Loading ads from CSV...');
            const response = await fetch(this.CSV_URL);
            if (!response.ok) throw new Error();
            
            const csvText = await response.text();
            const ads = this.parseCSV(csvText);
            
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
    
    parseCSV: function(csvText) {
        const lines = csvText.trim().split(/\r?\n/);
        if (lines.length < 2) return [];
        
        const headers = this.parseCSVLine(lines[0]);
        
        let idCol = -1, imageCol = -1, linkCol = -1, activeCol = -1;
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i].toLowerCase().trim();
            if (header === 'id') idCol = i;
            if (header === 'image_url') imageCol = i;
            if (header === 'link_url') linkCol = i;
            if (header === 'active') activeCol = i;
        }
        
        if (idCol === -1 || imageCol === -1 || linkCol === -1 || activeCol === -1) {
            return [];
        }
        
        const ads = [];
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = this.parseCSVLine(lines[i]);
            if (values.length <= Math.max(idCol, imageCol, linkCol, activeCol)) continue;
            
            const isActive = values[activeCol] === 'TRUE' || values[activeCol] === 'true' || values[activeCol] === '1';
            
            if (isActive) {
                const imageUrl = values[imageCol]?.trim() || '';
                const linkUrl = values[linkCol]?.trim() || '#';
                if (imageUrl) {
                    ads.push({
                        id: parseInt(values[idCol]) || i,
                        imageUrl: imageUrl,
                        linkUrl: linkUrl
                    });
                }
            }
        }
        console.log(`📊 ${ads.length} active ads found`);
        return ads;
    },
    
    parseCSVLine: function(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        
        return result.map(val => {
            if (val.startsWith('"') && val.endsWith('"')) {
                return val.slice(1, -1);
            }
            return val;
        });
    },
    
    showAd: function(callback) {
        if (this.isAdShowing) return;
        if (document.getElementById('custom-ad-overlay')) return;
        
        if (!this.adLoaded || !this.currentAd) {
            this.loadAds().then(() => this.showAd(callback));
            return;
        }
        
        this.isAdShowing = true;
        
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
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = 'position:absolute;top:10px;right:10px;width:36px;height:36px;background:#1e3a5f;color:white;border:none;border-radius:50%;font-size:18px;cursor:pointer;z-index:10;display:none;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
        closeBtn.setAttribute('data-ad-close', 'true');
        
        const timerDisplay = document.createElement('div');
        timerDisplay.style.cssText = 'position:absolute;top:10px;left:10px;background:rgba(0,0,0,0.65);color:white;padding:5px 12px;border-radius:20px;font-size:13px;font-weight:bold;z-index:10;font-family:monospace;';
        timerDisplay.innerHTML = '⏳ 5';
        
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
            }
        }, 1000);
        
        closeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            overlay.remove();
            this.isAdShowing = false;
            if (callback) callback();
        };
        
        overlay.onclick = (e) => {
            if (e.target === overlay && seconds <= 0) {
                overlay.remove();
                this.isAdShowing = false;
                if (callback) callback();
            }
        };
    },
    
    init: function() {
        console.log('🎯 Custom Ad Initialized');
        this.loadAds();
        
        // ========== Ad ပြမယ့် ခလုတ်တွေ ==========
        const selectors = [
            '.arrow-btn',
            '#fab-btn',
            '#profile-icon-btn',
            '#mode-toggle-btn',
            '.back-link',
            '.logout-btn',
            '#prev-arrow',
            '#next-arrow',
            '#guest-info-proceed' 
        ];
        
        const hookButtons = () => {
            document.querySelectorAll(selectors.join(',')).forEach(btn => {
                // Ad overlay ထဲက button ဆိုရင် ကျော်
                if (btn.closest('#custom-ad-overlay')) return;
                if (btn.hasAttribute('data-ad-close')) return;
                if (btn.hasAdHook) return;
                
                // Guest mode ရဲ့ မူလခလုတ် (ဒိုင်ယာလော့ခ်ဖွင့်တဲ့ခလုတ်) ကို ကျော်
                if (btn.id === 'guest-mode-btn') return;
                
                btn.hasAdHook = true;
                
                const originalOnClick = btn.getAttribute('onclick');
                const originalOnClickFn = btn.onclick;
                const originalHref = btn.href;
                
                if (originalOnClick) {
                    btn.removeAttribute('onclick');
                }
                
                btn.addEventListener('click', (e) => {
                    // Guest info popup ရှိနေရင် Ad မပြနဲ့
                    if (document.getElementById('guest-info-overlay')) return;
                    
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log('🔘 Showing ad for:', btn.id || btn.className);
                    
                    this.showAd(() => {
                        console.log('✅ Ad closed, executing original action');
                        
                        if (originalOnClick) {
                            try {
                                const fn = new Function('event', originalOnClick);
                                fn.call(btn, e);
                            } catch(err) {}
                        }
                        
                        if (originalOnClickFn && !originalOnClick) {
                            originalOnClickFn.call(btn, e);
                        }
                        
                        if (originalHref && originalHref !== '#') {
                            window.location.href = originalHref;
                        }
                        
                        if (!originalOnClick && !originalOnClickFn && !originalHref) {
                            const wasHook = btn.hasAdHook;
                            btn.hasAdHook = false;
                            btn.click();
                            btn.hasAdHook = wasHook;
                        }
                    });
                });
            });
        };
        
        setTimeout(hookButtons, 1000);
        new MutationObserver(() => hookButtons()).observe(document.body, { childList: true, subtree: true });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CustomAd.init());
} else {
    CustomAd.init();
}