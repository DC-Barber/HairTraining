// translate.js - Complete Translation with Table Support

(function() {
    console.log('🌐 Translation script loading...');
    
    let currentLang = 'my';
    let isTranslating = false;
    let pendingTranslate = false;
    
    const languages = {
        'my': { name: 'မြန်မာ', flag: '🇲🇲', code: 'my' },
        'en': { name: 'English', flag: '🇬🇧', code: 'en' },
        'vi': { name: 'Tiếng Việt', flag: '🇻🇳', code: 'vi' },
        'ja': { name: '日本語', flag: '🇯🇵', code: 'ja' },
        'th': { name: 'ภาษาไทย', flag: '🇹🇭', code: 'th' }
    };
    
    // Store original texts
    const originalTexts = new Map();
    
    // All translatable selectors (including tables)
    const TRANSLATE_SELECTORS = [
        '.page-content p',
        '.page-content li',
        '.page-content h2',
        '.page-content h3',
        '.page-content h4',
        '.page-content strong',
        '.page-content td',
        '.page-content th',
        '.page-header h2',
        '.page-number',
        '.counter-simple',
        '#toc-list li',
        '.title-section h1',
        '.title-section .eng-sub',
        '.page-indicator-compact',
        '.profile-modal h3',
        '.profile-name',
        '.profile-username',
        '.profile-info',
        '.logout-btn',
        '.lang-option',
        '.menu-header span',
        'button:not(#lang-dropdown-btn):not(#close-menu)'
    ];
    
    // Create dropdown button
    function createDropdown() {
        const existing = document.getElementById('lang-dropdown-container');
        if (existing) return;
        
        const container = document.createElement('div');
        container.id = 'lang-dropdown-container';
        container.style.cssText = `
            position: fixed;
            top: 12px;
            right: 70px;
            z-index: 30001;
        `;
        
        const btn = document.createElement('button');
        btn.id = 'lang-dropdown-btn';
        btn.innerHTML = '🇲🇲 မြန်မာ ▼';
        btn.style.cssText = `
            background: linear-gradient(135deg, #1e3a5f, #2c5282);
            border: none;
            border-radius: 30px;
            padding: 8px 14px;
            font-size: 0.75rem;
            font-weight: 600;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
        `;
        
        btn.onmouseenter = () => btn.style.transform = 'scale(1.02)';
        btn.onmouseleave = () => btn.style.transform = 'scale(1)';
        
        const menu = document.createElement('div');
        menu.id = 'lang-dropdown-menu';
        menu.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 8px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.2);
            min-width: 150px;
            z-index: 30002;
            display: none;
            overflow: hidden;
            backdrop-filter: blur(10px);
            background: rgba(255,255,255,0.98);
        `;
        
        for (const [code, lang] of Object.entries(languages)) {
            const option = document.createElement('div');
            option.innerHTML = `${lang.flag} <span style="margin-left: 5px;">${lang.name}</span>`;
            option.style.cssText = `
                padding: 12px 16px;
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
        
        console.log('✅ Dropdown created');
    }
    
    // Get all text from an element (including nested)
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
    
    // Save all original texts
    function saveAllOriginalTexts() {
        const elements = document.querySelectorAll(TRANSLATE_SELECTORS.join(','));
        
        elements.forEach(el => {
            if (!originalTexts.has(el)) {
                const text = getAllText(el);
                if (text && text.length > 0 && !/^[\d\s\/\.\-\[\]\(\)\<\>]+$/.test(text)) {
                    originalTexts.set(el, text);
                }
            }
        });
        
        // Also save table headers and cells specifically
        document.querySelectorAll('table th, table td').forEach(cell => {
            if (!originalTexts.has(cell)) {
                const text = getAllText(cell);
                if (text && text.length > 0 && !/^[\d\s\/\.\-]+$/.test(text)) {
                    originalTexts.set(cell, text);
                }
            }
        });
        
        console.log('📝 Saved', originalTexts.size, 'text elements');
    }
    
    // Batch translate using single API call
    async function batchTranslate(texts, targetLang) {
        if (texts.length === 0) return [];
        if (targetLang === 'my') return texts;
        
        const uniqueTexts = [...new Map(texts.map(t => [t, t])).values()];
        const translationMap = new Map();
        
        try {
            // Split into chunks of 30 texts to avoid URL length limits
            const chunkSize = 25;
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
            
            return texts.map(text => translationMap.get(text) || text);
        } catch (error) {
            console.error('Batch translation error:', error);
            return texts;
        }
    }
    
    // Translate page content
    async function translatePage(targetLang) {
        if (isTranslating) {
            pendingTranslate = true;
            return;
        }
        
        isTranslating = true;
        
        try {
            if (targetLang === 'my') {
                // Restore original texts
                for (const [el, original] of originalTexts) {
                    if (el && el.innerText !== original && document.body.contains(el)) {
                        el.innerText = original;
                    }
                }
                isTranslating = false;
                return;
            }
            
            // Get elements that need translation
            const elementsToTranslate = [];
            for (const [el, original] of originalTexts) {
                if (document.body.contains(el) && el.innerText === original) {
                    elementsToTranslate.push({ el, original });
                }
            }
            
            if (elementsToTranslate.length === 0) {
                isTranslating = false;
                return;
            }
            
            console.log(`🌐 Translating ${elementsToTranslate.length} items to ${targetLang}...`);
            
            // Translate in batches
            const batchSize = 20;
            for (let i = 0; i < elementsToTranslate.length; i += batchSize) {
                const batch = elementsToTranslate.slice(i, i + batchSize);
                const texts = batch.map(item => item.original);
                const translations = await batchTranslate(texts, targetLang);
                
                batch.forEach((item, idx) => {
                    if (translations[idx] && translations[idx] !== item.original) {
                        item.el.innerText = translations[idx];
                    }
                });
                
                // Small delay to avoid rate limiting
                await new Promise(r => setTimeout(r, 50));
            }
            
            console.log('✅ Translation completed');
        } catch (error) {
            console.error('Translation error:', error);
        } finally {
            isTranslating = false;
            if (pendingTranslate) {
                pendingTranslate = false;
                translatePage(targetLang);
            }
        }
    }
    
    // Switch language
    async function switchLanguage(langCode) {
        if (!languages[langCode] || currentLang === langCode) return;
        
        console.log('🔄 Switching to:', langCode);
        currentLang = langCode;
        localStorage.setItem('preferred_language', langCode);
        
        // Update button
        const btn = document.getElementById('lang-dropdown-btn');
        if (btn) {
            btn.innerHTML = `${languages[langCode].flag} ${languages[langCode].name} ▼`;
        }
        
        // Update menu highlight
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
    function showToast(msg, isError = false) {
        const existing = document.getElementById('translation-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.id = 'translation-toast';
        toast.textContent = msg;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: ${isError ? 'rgba(220, 53, 69, 0.95)' : 'rgba(0,0,0,0.85)'};
            color: white;
            padding: 10px 24px;
            border-radius: 40px;
            font-size: 0.85rem;
            z-index: 30003;
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
    
    // Observe page changes (navigation)
    function observePageChanges() {
        // Watch for page class changes
        const observer = new MutationObserver(() => {
            if (currentLang !== 'my' && !isTranslating) {
                clearTimeout(window.translateDelay);
                window.translateDelay = setTimeout(() => {
                    // Re-save new page content
                    setTimeout(() => saveAllOriginalTexts(), 100);
                    setTimeout(() => translatePage(currentLang), 200);
                }, 300);
            }
        });
        
        observer.observe(document.getElementById('pages-wrapper') || document.body, {
            attributes: true,
            attributeFilter: ['class'],
            subtree: true
        });
        
        // Watch for navigation buttons
        const nextBtn = document.getElementById('next-arrow');
        const prevBtn = document.getElementById('prev-arrow');
        
        const handleNav = () => {
            if (currentLang !== 'my') {
                setTimeout(() => saveAllOriginalTexts(), 200);
                setTimeout(() => translatePage(currentLang), 400);
            }
        };
        
        if (nextBtn) nextBtn.addEventListener('click', handleNav);
        if (prevBtn) prevBtn.addEventListener('click', handleNav);
        
        // Watch for TOC clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('#toc-list li')) {
                setTimeout(() => {
                    if (currentLang !== 'my') {
                        setTimeout(() => saveAllOriginalTexts(), 200);
                        setTimeout(() => translatePage(currentLang), 400);
                    }
                }, 300);
            }
        });
    }
    
    // Re-save texts when new content loads
    function observeContentChanges() {
        const observer = new MutationObserver((mutations) => {
            let hasNewContent = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    hasNewContent = true;
                    break;
                }
            }
            
            if (hasNewContent && currentLang !== 'my') {
                clearTimeout(window.saveDelay);
                window.saveDelay = setTimeout(() => {
                    saveAllOriginalTexts();
                    translatePage(currentLang);
                }, 500);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Initialize
    function init() {
        console.log('🌐 Translation manager starting...');
        
        // Wait for DOM and auth modal to potentially close
        const startInterval = setInterval(() => {
            const authModal = document.getElementById('auth-modal-overlay');
            const isLoggedIn = !authModal || authModal.style.display === 'none';
            
            if (isLoggedIn || document.readyState === 'complete') {
                clearInterval(startInterval);
                
                createDropdown();
                
                // Small delay to ensure page content is loaded
                setTimeout(() => {
                    saveAllOriginalTexts();
                    observePageChanges();
                    observeContentChanges();
                    
                    const savedLang = localStorage.getItem('preferred_language');
                    if (savedLang && savedLang !== 'my' && languages[savedLang]) {
                        setTimeout(() => switchLanguage(savedLang), 500);
                    }
                }, 300);
            }
        }, 200);
        
        // Also run on full load
        window.addEventListener('load', () => {
            setTimeout(() => {
                saveAllOriginalTexts();
                if (currentLang !== 'my') {
                    translatePage(currentLang);
                }
            }, 500);
        });
    }
    
    init();
})();