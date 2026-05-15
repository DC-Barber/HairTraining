// translate.js - Complete Translation with Auto Close Dropdown (Fixed)

(function() {
    console.log('🌐 Translation Script Loaded');
    
    let currentLang = localStorage.getItem('preferred_language') || 'my';
    let isTranslating = false;
    
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
    
    // Complete TRANSLATE_SELECTORS
    const TRANSLATE_SELECTORS = [
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'span', 'strong', 'em', 'b', 'i', 'div', 'small', 'label', 'caption', 'figcaption', 'summary',
        'td', 'th', 'tr', 'table caption', '.page-content table td', '.page-content table th',
        '.page-content', '.page-content p', '.page-content li', '.page-content h2', '.page-content h3', '.page-content h4',
        '.page-content div:not(.page-image):not(.no-translate)', '.page-content span', '.page-content strong', '.page-content b',
        '.page-header h2', '.page-number', '.counter-simple', '#center-counter', '#header-page-num',
        '.page-indicator-compact', '#toc-list li', '#toc-list a', '.menu-header span',
        '.title-section h1', '.title-section .eng-sub',
        '.profile-modal h3', '.profile-name', '.profile-username', '.profile-info',
        '.profile-info div', '.profile-info b', '.profile-info span', '.logout-btn', '#close-profile',
        'button:not(#lang-dropdown-btn):not(#close-menu)',
        '#login-submit-btn', '#mode-toggle-btn', '#mode-toggle-text', '#guest-mode-btn',
        '#form-title', '#modal-title', '#login-error', '#upload-status',
        'a:not(.no-translate)', 'label', 'footer p', 'footer a',
        'ul li', 'ol li', '.page-content ul', '.page-content ol',
        '.error-message', '.success-message', '.status-message'
    ];
    
    const EXCLUDE_SELECTORS = [
        '#lang-dropdown-btn', '#lang-dropdown-menu', '.lang-option',
        'input', 'textarea', 'select', 'code', 'pre code',
        '.page-image', 'img', '.no-translate'
    ];
    
    // Create dropdown inside header - FIXED VERSION
    function createDropdown() {
        const existing = document.getElementById('lang-dropdown-container');
        if (existing) return;
        
        const header = document.querySelector('.clean-header');
        if (!header) {
            setTimeout(createDropdown, 200);
            return;
        }
        
        // Find the right div - the one containing profile icon
        const profileIcon = document.getElementById('profile-icon-btn');
        let headerRightDiv = null;
        
        if (profileIcon && profileIcon.parentElement) {
            headerRightDiv = profileIcon.parentElement;
            console.log('✅ Found header right div via profile icon');
        } else {
            // Fallback: find div with flex and gap
            const divs = header.querySelectorAll('div');
            for (const div of divs) {
                const style = div.getAttribute('style') || '';
                if (style.includes('display: flex') || (div.children.length > 0 && div.querySelector('#profile-icon-btn'))) {
                    headerRightDiv = div;
                    break;
                }
            }
        }
        
        if (!headerRightDiv) {
            console.log('⚠️ Could not find header right div, using fixed position');
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
            option.className = 'lang-option';
            option.setAttribute('data-lang-code', code);
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
        
        // Insert before profile icon
        if (profileIcon && profileIcon.parentElement === headerRightDiv) {
            headerRightDiv.insertBefore(container, profileIcon);
        } else {
            headerRightDiv.appendChild(container);
        }
        
        btn.onclick = (e) => {
            e.stopPropagation();
            const isVisible = menu.style.display === 'block';
            menu.style.display = isVisible ? 'none' : 'block';
        };
        
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                menu.style.display = 'none';
            }
        });
        
        console.log('✅ Dropdown added to header');
    }
    
    // Fixed dropdown as fallback
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
            option.className = 'lang-option';
            option.setAttribute('data-lang-code', code);
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
        
        console.log('✅ Fixed dropdown created');
    }
    
    function shouldExclude(element) {
        for (const selector of EXCLUDE_SELECTORS) {
            if (element.closest && element.closest(selector)) {
                return true;
            }
        }
        return false;
    }
    
    function getAllText(element) {
        let text = '';
        for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE && 
                       !['SCRIPT', 'STYLE', 'IMG', 'INPUT', 'TEXTAREA', 'SELECT', 'IFRAME'].includes(node.tagName)) {
                if (!shouldExclude(node)) {
                    text += getAllText(node);
                }
            }
        }
        return text.trim();
    }
    
    function saveOriginalTexts() {
        const elements = document.querySelectorAll(TRANSLATE_SELECTORS.join(','));
        let newCount = 0;
        
        elements.forEach(el => {
            if (shouldExclude(el)) return;
            if (!originalTexts.has(el) && el.offsetParent !== null) {
                const text = getAllText(el);
                if (text && text.length > 0 && text.length < 1000 && 
                    !/^[\d\s\/\.\-\[\]\(\)\<\>\%\$\#\@\!]+\s*$/.test(text)) {
                    originalTexts.set(el, text);
                    newCount++;
                }
            }
        });
        
        document.querySelectorAll('td, th, caption').forEach(cell => {
            if (shouldExclude(cell)) return;
            if (!originalTexts.has(cell)) {
                const text = getAllText(cell);
                if (text && text.length > 0 && text.length < 500) {
                    originalTexts.set(cell, text);
                    newCount++;
                }
            }
        });
        
        if (newCount > 0) console.log(`📝 Saved ${newCount} new texts (total: ${originalTexts.size})`);
        return elements.length;
    }
    
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
            
            const chunkSize = 15;
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
                
                await new Promise(r => setTimeout(r, 50));
            }
            
            const result = texts.map(text => translationMap.get(text) || text);
            translationCache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Translation error:', error);
            return texts;
        }
    }
    
    async function translatePage(targetLang) {
        if (isTranslating) {
            setTimeout(() => translatePage(targetLang), 200);
            return;
        }
        
        isTranslating = true;
        
        try {
            if (targetLang === 'my') {
                for (const [el, original] of originalTexts) {
                    if (el && document.body.contains(el) && el.innerText !== original) {
                        el.innerText = original;
                    }
                }
                console.log('📖 Restored Myanmar language');
                isTranslating = false;
                return;
            }
            
            const toTranslate = [];
            for (const [el, original] of originalTexts) {
                if (document.body.contains(el) && el.innerText === original && original.trim().length > 0) {
                    toTranslate.push({ el, original });
                }
            }
            
            if (toTranslate.length === 0) {
                console.log('No new elements to translate');
                isTranslating = false;
                return;
            }
            
            console.log(`🌐 Translating ${toTranslate.length} elements to ${targetLang}...`);
            
            const batchSize = 20;
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
        } catch (error) {
            console.error('Translation error:', error);
        } finally {
            isTranslating = false;
        }
    }
    
    async function switchLanguage(langCode) {
        if (!languages[langCode] || currentLang === langCode) return;
        
        console.log(`🔄 Switching from ${currentLang} to ${langCode}`);
        currentLang = langCode;
        localStorage.setItem('preferred_language', langCode);
        
        const btn = document.getElementById('lang-dropdown-btn');
        if (btn) {
            btn.innerHTML = `${languages[langCode].flag} ${languages[langCode].name} ▼`;
        }
        
        document.querySelectorAll('#lang-dropdown-menu > div').forEach(option => {
            const optionLang = option.getAttribute('data-lang-code');
            if (optionLang === langCode) {
                option.style.fontWeight = '600';
                option.style.background = '#f0e7dc';
            } else {
                option.style.fontWeight = '400';
                option.style.background = 'transparent';
            }
        });
        
        const menu = document.getElementById('lang-dropdown-menu');
        if (menu) menu.style.display = 'none';
        
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
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    function refreshPageContent() {
        console.log('🔄 Refreshing page content...');
        const currentElements = document.querySelectorAll(TRANSLATE_SELECTORS.join(','));
        for (const el of currentElements) {
            if (originalTexts.has(el)) {
                const newText = getAllText(el);
                if (newText !== originalTexts.get(el)) {
                    originalTexts.set(el, newText);
                }
            }
        }
        saveOriginalTexts();
        if (currentLang !== 'my') {
            translatePage(currentLang);
        }
    }
    
    function watchPageChanges() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList && target.classList.contains('page') && target.classList.contains('active')) {
                        console.log('📄 Page changed to:', target.id);
                        setTimeout(() => refreshPageContent(), 300);
                        break;
                    }
                }
            }
        });
        
        const allPages = document.querySelectorAll('.page');
        allPages.forEach(page => {
            observer.observe(page, { attributes: true, attributeFilter: ['class'] });
        });
        
        const bodyObserver = new MutationObserver(() => {
            const newPages = document.querySelectorAll('.page:not([data-observed])');
            if (newPages.length > 0) {
                newPages.forEach(page => {
                    page.setAttribute('data-observed', 'true');
                    observer.observe(page, { attributes: true, attributeFilter: ['class'] });
                });
            }
        });
        bodyObserver.observe(document.body, { childList: true, subtree: true });
        
        const nextBtn = document.getElementById('next-arrow');
        const prevBtn = document.getElementById('prev-arrow');
        
        const handleNav = () => {
            if (currentLang !== 'my') {
                setTimeout(() => refreshPageContent(), 400);
            }
        };
        
        if (nextBtn) nextBtn.addEventListener('click', handleNav);
        if (prevBtn) prevBtn.addEventListener('click', handleNav);
        
        document.addEventListener('click', (e) => {
            const tocItem = e.target.closest('#toc-list li');
            if (tocItem) {
                setTimeout(() => refreshPageContent(), 500);
            }
        });
    }
    
    function init() {
        console.log('🌐 Translation System Starting...');
        
        let attempts = 0;
        const maxAttempts = 30;
        
        function tryCreate() {
            const header = document.querySelector('.clean-header');
            if (header && document.getElementById('profile-icon-btn')) {
                createDropdown();
                return true;
            }
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(tryCreate, 300);
            } else {
                console.log('⚠️ Could not find header, creating fixed dropdown');
                createFixedDropdown();
            }
            return false;
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                tryCreate();
                setTimeout(() => {
                    saveOriginalTexts();
                    watchPageChanges();
                    const savedLang = localStorage.getItem('preferred_language');
                    if (savedLang && savedLang !== 'my' && languages[savedLang]) {
                        setTimeout(() => switchLanguage(savedLang), 500);
                    }
                }, 800);
            });
        } else {
            tryCreate();
            setTimeout(() => {
                saveOriginalTexts();
                watchPageChanges();
                const savedLang = localStorage.getItem('preferred_language');
                if (savedLang && savedLang !== 'my' && languages[savedLang]) {
                    setTimeout(() => switchLanguage(savedLang), 500);
                }
            }, 800);
        }
    }
    
    init();
})();