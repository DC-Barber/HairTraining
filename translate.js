// translate.js - Global Translation for ALL Pages

(function() {
    console.log('🌐 Global Translation Script Loaded');
    
    let currentLang = localStorage.getItem('preferred_language') || 'my';
    
    const languages = {
        'my': { name: 'မြန်မာ', flag: '🇲🇲', nameEn: 'Myanmar' },
        'en': { name: 'English', flag: '🇬🇧', nameEn: 'English' },
        'vi': { name: 'Tiếng Việt', flag: '🇻🇳', nameEn: 'Vietnamese' },
        'ja': { name: '日本語', flag: '🇯🇵', nameEn: 'Japanese' },
        'th': { name: 'ภาษาไทย', flag: '🇹🇭', nameEn: 'Thai' }
    };
    
    // Cache for translations
    const translationCache = new Map();
    const originalTexts = new Map();
    
    // Elements to translate (for all pages)
    const TRANSLATE_SELECTORS = [
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th',
        'button:not(#lang-dropdown-btn):not(#close-menu)',
        '.page-content', '.page-header h2', '.page-number',
        '.counter-simple', '#toc-list li', '.title-section h1',
        '.title-section .eng-sub', '.page-indicator-compact',
        '.profile-modal h3', '.profile-name', '.profile-username',
        '.profile-info', '.logout-btn', '.menu-header span',
        'label', 'legend', 'caption', 'summary', 'figcaption'
    ];
    
    // Create dropdown (appears on ALL pages)
    function createDropdown() {
        const existing = document.getElementById('lang-dropdown-container');
        if (existing) return;
        
        const container = document.createElement('div');
        container.id = 'lang-dropdown-container';
        container.style.cssText = `
    position: fixed;
    top: 12px;
    right: 120px;   
    z-index: 999999;
`;
        
        const btn = document.createElement('button');
        btn.id = 'lang-dropdown-btn';
        btn.innerHTML = `${languages[currentLang].flag} ${languages[currentLang].name} ▼`;
        btn.style.cssText = `
            background: linear-gradient(135deg, #1e3a5f, #2c5282);
            border: none;
            border-radius: 40px;
            padding: 8px 16px;
            font-size: 0.8rem;
            font-weight: 600;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.25);
            transition: all 0.2s ease;
            font-family: inherit;
        `;
        
        btn.onmouseenter = () => btn.style.transform = 'scale(1.02)';
        btn.onmouseleave = () => btn.style.transform = 'scale(1)';
        
        const menu = document.createElement('div');
        menu.id = 'lang-dropdown-menu';
        menu.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 10px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            min-width: 160px;
            z-index: 999999;
            display: none;
            overflow: hidden;
            backdrop-filter: blur(10px);
            background: rgba(255,255,255,0.98);
        `;
        
        for (const [code, lang] of Object.entries(languages)) {
            const option = document.createElement('div');
            option.innerHTML = `${lang.flag} <span style="margin-left: 8px;">${lang.name}</span>`;
            option.style.cssText = `
                padding: 12px 18px;
                cursor: pointer;
                font-size: 0.85rem;
                color: #333;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.15s;
                font-weight: ${currentLang === code ? '600' : '400'};
                background: ${currentLang === code ? '#f0e7dc' : 'transparent'};
            `;
            option.onmouseenter = () => option.style.background = '#f0e7dc';
            option.onmouseleave = () => {
                option.style.background = currentLang === code ? '#f0e7dc' : 'transparent';
            };
            option.onclick = () => switchLanguage(code);
            menu.appendChild(option);
        }
        
        container.appendChild(btn);
        container.appendChild(menu);
        document.body.appendChild(container);
        
        btn.onclick = (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        };
        
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                menu.style.display = 'none';
            }
        });
        
        console.log('✅ Global dropdown created');
    }
    
    // Get all text from element
    function getAllText(element) {
        let text = '';
        for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE && 
                       !['SCRIPT', 'STYLE', 'IMG', 'INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)) {
                text += getAllText(node);
            }
        }
        return text.trim();
    }
    
    // Save original texts on current page
    function saveOriginalTexts() {
        const elements = document.querySelectorAll(TRANSLATE_SELECTORS.join(','));
        let newCount = 0;
        
        elements.forEach(el => {
            if (!originalTexts.has(el) && el.offsetParent !== null) {
                const text = getAllText(el);
                if (text && text.length > 0 && text.length < 500 && !/^[\d\s\/\.\-\[\]\(\)\<\>]+$/.test(text)) {
                    originalTexts.set(el, text);
                    newCount++;
                }
            }
        });
        
        // Also save table cells
        document.querySelectorAll('td, th, caption').forEach(cell => {
            if (!originalTexts.has(cell)) {
                const text = getAllText(cell);
                if (text && text.length > 0 && text.length < 500) {
                    originalTexts.set(cell, text);
                    newCount++;
                }
            }
        });
        
        if (newCount > 0) {
            console.log(`📝 Saved ${newCount} new text elements (total: ${originalTexts.size})`);
        }
        
        return elements.length;
    }
    
    // Batch translate
    async function batchTranslate(texts, targetLang) {
        if (texts.length === 0) return [];
        if (targetLang === 'my') return texts;
        
        const cacheKey = `${targetLang}|${texts.join('|')}`;
        if (translationCache.has(cacheKey)) {
            return translationCache.get(cacheKey);
        }
        
        try {
            const uniqueTexts = [...new Map(texts.map(t => [t, t])).values()];
            const translationMap = new Map();
            
            const chunkSize = 20;
            for (let i = 0; i < uniqueTexts.length; i += chunkSize) {
                const chunk = uniqueTexts.slice(i, i + chunkSize);
                const combined = chunk.join('\n\n\n');
                
                const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=my&tl=${targetLang}&dt=t&q=${encodeURIComponent(combined)}`;
                const response = await fetch(url);
                const data = await response.json();
                
                if (data && data[0]) {
                    const translated = data[0].map(item => item[0]).join('');
                    const results = translated.split('\n\n\n');
                    chunk.forEach((orig, idx) => {
                        translationMap.set(orig, results[idx] || orig);
                    });
                }
            }
            
            const result = texts.map(text => translationMap.get(text) || text);
            translationCache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Translation error:', error);
            return texts;
        }
    }
    
    // Translate current page
    async function translatePage(targetLang) {
        if (targetLang === 'my') {
            // Restore original
            for (const [el, original] of originalTexts) {
                if (el && document.body.contains(el) && el.innerText !== original) {
                    el.innerText = original;
                }
            }
            console.log('📖 Restored Myanmar language');
            return;
        }
        
        // Get untranslated elements
        const toTranslate = [];
        for (const [el, original] of originalTexts) {
            if (document.body.contains(el) && el.innerText === original && original.trim().length > 0) {
                toTranslate.push({ el, original });
            }
        }
        
        if (toTranslate.length === 0) {
            console.log('No new elements to translate');
            return;
        }
        
        console.log(`🌐 Translating ${toTranslate.length} elements to ${targetLang}...`);
        
        const batchSize = 25;
        for (let i = 0; i < toTranslate.length; i += batchSize) {
            const batch = toTranslate.slice(i, i + batchSize);
            const texts = batch.map(item => item.original);
            const translations = await batchTranslate(texts, targetLang);
            
            batch.forEach((item, idx) => {
                if (translations[idx] && translations[idx] !== item.original) {
                    item.el.innerText = translations[idx];
                }
            });
            
            await new Promise(r => setTimeout(r, 30));
        }
        
        console.log('✅ Translation complete');
    }
    
    // Switch language
    async function switchLanguage(langCode) {
        if (!languages[langCode] || currentLang === langCode) return;
        
        console.log(`🔄 Switching from ${currentLang} to ${langCode}`);
        currentLang = langCode;
        localStorage.setItem('preferred_language', langCode);
        
        const btn = document.getElementById('lang-dropdown-btn');
        if (btn) {
            btn.innerHTML = `${languages[langCode].flag} ${languages[langCode].name} ▼`;
        }
        
        // Update menu
        document.querySelectorAll('#lang-dropdown-menu > div').forEach(option => {
            const text = option.innerText;
            for (const [code, lang] of Object.entries(languages)) {
                if (text.includes(lang.name)) {
                    option.style.fontWeight = code === langCode ? '600' : '400';
                    option.style.background = code === langCode ? '#f0e7dc' : 'transparent';
                }
            }
        });
        
        showToast(`📖 ${languages[langCode].name}...`);
        await translatePage(langCode);
        showToast(`✅ ${languages[langCode].name}`);
    }
    
    // Toast notification
    function showToast(msg) {
        const existing = document.getElementById('global-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.id = 'global-toast';
        toast.textContent = msg;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 10px 24px;
            border-radius: 40px;
            font-size: 0.85rem;
            z-index: 999999;
            white-space: nowrap;
            max-width: 90%;
            white-space: normal;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            backdrop-filter: blur(4px);
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    // Watch for page changes (SPA navigation)
    function watchPageChanges() {
        let lastUrl = window.location.href;
        
        const checkForChanges = () => {
            const currentUrl = window.location.href;
            if (currentUrl !== lastUrl) {
                lastUrl = currentUrl;
                console.log('📍 Page changed to:', currentUrl);
                
                // Wait for new page to load
                setTimeout(() => {
                    saveOriginalTexts();
                    if (currentLang !== 'my') {
                        translatePage(currentLang);
                    }
                }, 500);
            }
        };
        
        // Watch for URL changes
        setInterval(checkForChanges, 500);
        
        // Watch for DOM changes (for SPAs)
        const observer = new MutationObserver(() => {
            if (document.readyState === 'complete') {
                const currentTextCount = originalTexts.size;
                const newCount = saveOriginalTexts();
                
                if (newCount > currentTextCount && currentLang !== 'my') {
                    clearTimeout(window.translateDelay);
                    window.translateDelay = setTimeout(() => {
                        translatePage(currentLang);
                    }, 300);
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Apply to iframes (for vlibrary.html etc)
    function watchIframes() {
        setInterval(() => {
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDoc && !iframe.hasAttribute('data-translate-injected')) {
                        iframe.setAttribute('data-translate-injected', 'true');
                        
                        // Add translation capability to iframe
                        const script = iframeDoc.createElement('script');
                        script.textContent = `
                            (function() {
                                const parentLang = localStorage.getItem('preferred_language') || 'my';
                                if (parentLang !== 'my') {
                                    setTimeout(() => {
                                        const elements = document.querySelectorAll('p, h1, h2, h3, li, td, th, button');
                                        elements.forEach(el => {
                                            const text = el.innerText;
                                            if (text && text.trim()) {
                                                fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=my&tl=' + parentLang + '&dt=t&q=' + encodeURIComponent(text))
                                                    .then(r => r.json())
                                                    .then(data => {
                                                        if (data && data[0] && data[0][0]) {
                                                            el.innerText = data[0][0][0];
                                                        }
                                                    });
                                            }
                                        });
                                    }, 1000);
                                }
                            })();
                        `;
                        iframeDoc.body.appendChild(script);
                    }
                } catch(e) {
                    // Cross-origin iframe - cannot access
                }
            }
        }, 2000);
    }
    
    // Initialize
    function init() {
        console.log('🌐 Global Translation System Starting...');
        
        // Create dropdown immediately
        createDropdown();
        
        // Save original texts after page loads
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    saveOriginalTexts();
                    if (currentLang !== 'my') {
                        translatePage(currentLang);
                    }
                }, 300);
            });
        } else {
            setTimeout(() => {
                saveOriginalTexts();
                if (currentLang !== 'my') {
                    translatePage(currentLang);
                }
            }, 300);
        }
        
        // Watch for changes
        watchPageChanges();
        watchIframes();
        
        // Also run on full load
        window.addEventListener('load', () => {
            setTimeout(() => {
                saveOriginalTexts();
                if (currentLang !== 'my') {
                    translatePage(currentLang);
                }
            }, 500);
        });
    }
    
    init();
})();