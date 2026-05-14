// translate.js - Fixed Version

(function() {
    console.log('🌐 Translation Script Loaded');
    
    let currentLang = localStorage.getItem('preferred_language') || 'my';
    
    const languages = {
        'my': { name: 'မြန်မာ', flag: '🇲🇲' },
        'en': { name: 'English', flag: '🇬🇧' },
        'vi': { name: 'Tiếng Việt', flag: '🇻🇳' },
        'ja': { name: '日本語', flag: '🇯🇵' },
        'th': { name: 'ภาษาไทย', flag: '🇹🇭' }
    };
    
    // Cache for translations
    const translationCache = new Map();
    const originalTexts = new Map();
    
    const TRANSLATE_SELECTORS = [
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'span', 'strong', 'em', 'b', 'i',
        'td', 'th', 'caption', 'figcaption',
        '.page-content', '.page-content p', '.page-content li', '.page-content h2', '.page-content h3',
        '.page-header h2', '.page-number', '.counter-simple', '#center-counter', '#header-page-num',
        '.page-indicator-compact', '#toc-list li', '#toc-list a', '.menu-header span',
        '.title-section h1', '.title-section .eng-sub',
        '.profile-modal h3', '.profile-name', '.profile-username', '.profile-info',
        '.profile-info div', '.profile-info b', '.profile-info span', '.logout-btn', '#close-profile',
        'button:not(#lang-dropdown-btn):not(#close-menu)',
        '#login-submit-btn', '#mode-toggle-btn', '#mode-toggle-text', '#guest-mode-btn',
        '#form-title', '#modal-title', '#login-error', '#upload-status',
        'a:not(.no-translate)', 'label', 'footer p', 'footer a'
    ];
    
    // Create dropdown - Fixed version
    function createDropdown() {
        const existing = document.getElementById('lang-dropdown-container');
        if (existing) return;
        
        // Try multiple ways to find where to insert the button
        let insertTarget = null;
        
        // Method 1: Look for header right div
        const header = document.querySelector('.clean-header');
        if (header) {
            // Find the div that contains profile icon
            const profileIcon = document.getElementById('profile-icon-btn');
            if (profileIcon && profileIcon.parentElement) {
                insertTarget = profileIcon.parentElement;
                console.log('✅ Found profile icon parent');
            } else {
                // Find any div with flex/gap inside header
                const rightDiv = header.querySelector('div[style*="display: flex"], div:last-child');
                if (rightDiv) {
                    insertTarget = rightDiv;
                    console.log('✅ Found header right div');
                } else {
                    insertTarget = header;
                    console.log('✅ Using header as target');
                }
            }
        }
        
        // Method 2: If header not found, use fixed position
        if (!insertTarget) {
            console.log('⚠️ Header not found, using fixed position');
            createFixedDropdown();
            return;
        }
        
        const container = document.createElement('div');
        container.id = 'lang-dropdown-container';
        container.style.cssText = `
            position: relative;
            display: inline-block;
            margin: 0 8px;
        `;
        
        const btn = document.createElement('button');
        btn.id = 'lang-dropdown-btn';
        btn.innerHTML = `${languages[currentLang].flag} ${languages[currentLang].name} ▼`;
        btn.style.cssText = `
            background: #1e3a5f;
            border: none;
            border-radius: 30px;
            padding: 6px 12px;
            font-size: 0.7rem;
            font-weight: 600;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
            white-space: nowrap;
        `;
        
        btn.onmouseenter = () => btn.style.background = '#2c5282';
        btn.onmouseleave = () => btn.style.background = '#1e3a5f';
        
        const menu = document.createElement('div');
        menu.id = 'lang-dropdown-menu';
        menu.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 5px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            min-width: 140px;
            z-index: 10000;
            display: none;
            overflow: hidden;
        `;
        
        for (const [code, lang] of Object.entries(languages)) {
            const option = document.createElement('div');
            option.innerHTML = `${lang.flag} ${lang.name}`;
            option.style.cssText = `
                padding: 10px 15px;
                cursor: pointer;
                font-size: 0.8rem;
                color: #333;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: background 0.15s;
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
        
        // Insert before profile icon or at the beginning
        const profileIcon = document.getElementById('profile-icon-btn');
        if (profileIcon && insertTarget === profileIcon.parentElement) {
            insertTarget.insertBefore(container, profileIcon);
        } else {
            insertTarget.appendChild(container);
        }
        
        btn.onclick = (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        };
        
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                menu.style.display = 'none';
            }
        });
        
        console.log('✅ Dropdown added successfully');
    }
    
    // Fallback: Fixed position dropdown
    function createFixedDropdown() {
        const existing = document.getElementById('lang-dropdown-container');
        if (existing) return;
        
        const container = document.createElement('div');
        container.id = 'lang-dropdown-container';
        container.style.cssText = `
            position: fixed;
            top: 12px;
            right: 16px;
            z-index: 999999;
        `;
        
        const btn = document.createElement('button');
        btn.id = 'lang-dropdown-btn';
        btn.innerHTML = `${languages[currentLang].flag} ${languages[currentLang].name} ▼`;
        btn.style.cssText = `
            background: #1e3a5f;
            border: none;
            border-radius: 30px;
            padding: 6px 12px;
            font-size: 0.7rem;
            font-weight: 600;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        
        btn.onmouseenter = () => btn.style.background = '#2c5282';
        btn.onmouseleave = () => btn.style.background = '#1e3a5f';
        
        const menu = document.createElement('div');
        menu.id = 'lang-dropdown-menu';
        menu.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 5px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.15);
            min-width: 140px;
            z-index: 10000;
            display: none;
            overflow: hidden;
        `;
        
        for (const [code, lang] of Object.entries(languages)) {
            const option = document.createElement('div');
            option.innerHTML = `${lang.flag} ${lang.name}`;
            option.style.cssText = `
                padding: 10px 15px;
                cursor: pointer;
                font-size: 0.8rem;
                color: #333;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: background 0.15s;
            `;
            option.onmouseenter = () => option.style.background = '#f0e7dc';
            option.onmouseleave = () => option.style.background = 'transparent';
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
        
        console.log('✅ Fixed dropdown added');
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
    
    // Save original texts
    function saveOriginalTexts() {
        const elements = document.querySelectorAll(TRANSLATE_SELECTORS.join(','));
        let newCount = 0;
        
        elements.forEach(el => {
            if (!originalTexts.has(el) && el.offsetParent !== null) {
                const text = getAllText(el);
                if (text && text.length > 0 && text.length < 500 && !/^[\d\s\/\.\-\[\]\(\)]+$/.test(text)) {
                    originalTexts.set(el, text);
                    newCount++;
                }
            }
        });
        
        if (newCount > 0) console.log(`📝 Saved ${newCount} texts (total: ${originalTexts.size})`);
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
    
    // Translate page
    async function translatePage(targetLang) {
        if (targetLang === 'my') {
            for (const [el, original] of originalTexts) {
                if (el && document.body.contains(el) && el.innerText !== original) {
                    el.innerText = original;
                }
            }
            console.log('📖 Restored Myanmar');
            return;
        }
        
        const toTranslate = [];
        for (const [el, original] of originalTexts) {
            if (document.body.contains(el) && el.innerText === original && original.trim().length > 0) {
                toTranslate.push({ el, original });
            }
        }
        
        if (toTranslate.length === 0) return;
        
        console.log(`🌐 Translating ${toTranslate.length} elements...`);
        
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
        
        console.log(`🔄 Switching to ${langCode}`);
        currentLang = langCode;
        localStorage.setItem('preferred_language', langCode);
        
        const btn = document.getElementById('lang-dropdown-btn');
        if (btn) {
            btn.innerHTML = `${languages[langCode].flag} ${languages[langCode].name} ▼`;
        }
        
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
            padding: 8px 20px;
            border-radius: 40px;
            font-size: 0.8rem;
            z-index: 100000;
            white-space: nowrap;
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    // Watch for page changes
    function watchPageChanges() {
        const observer = new MutationObserver(() => {
            if (document.readyState === 'complete') {
                const newCount = saveOriginalTexts();
                if (newCount > 0 && currentLang !== 'my') {
                    clearTimeout(window.translateDelay);
                    window.translateDelay = setTimeout(() => {
                        translatePage(currentLang);
                    }, 300);
                }
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        const nextBtn = document.getElementById('next-arrow');
        const prevBtn = document.getElementById('prev-arrow');
        
        const handleNav = () => {
            if (currentLang !== 'my') {
                setTimeout(() => saveOriginalTexts(), 200);
                setTimeout(() => translatePage(currentLang), 400);
            }
        };
        
        if (nextBtn) nextBtn.addEventListener('click', handleNav);
        if (prevBtn) prevBtn.addEventListener('click', handleNav);
    }
    
    // Initialize
    function init() {
        console.log('🌐 Translation System Starting...');
        
        // Try to create dropdown immediately and retry if needed
        function tryCreateDropdown(attempt = 0) {
            if (attempt > 10) {
                console.log('⚠️ Max attempts reached, using fixed dropdown');
                createFixedDropdown();
                return;
            }
            
            const header = document.querySelector('.clean-header');
            if (header) {
                createDropdown();
            } else {
                console.log(`⏳ Waiting for header... attempt ${attempt + 1}`);
                setTimeout(() => tryCreateDropdown(attempt + 1), 500);
            }
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                tryCreateDropdown();
                setTimeout(() => {
                    saveOriginalTexts();
                    watchPageChanges();
                    if (currentLang !== 'my') translatePage(currentLang);
                }, 800);
            });
        } else {
            tryCreateDropdown();
            setTimeout(() => {
                saveOriginalTexts();
                watchPageChanges();
                if (currentLang !== 'my') translatePage(currentLang);
            }, 800);
        }
    }
    
    init();
})();