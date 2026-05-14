// translate.js - Complete Translation with Auto Close Dropdown

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
    
    // Complete TRANSLATE_SELECTORS - All elements on all pages
    const TRANSLATE_SELECTORS = [
        // Basic text elements
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'span', 'strong', 'em', 'b', 'i', 'div', 'small', 'label', 'caption', 'figcaption', 'summary',
        
        // Table elements
        'td', 'th', 'tr', 'table caption', '.page-content table td', '.page-content table th',
        
        // Page structure - ALL page content
        '.page-content', '.page-content p', '.page-content li', '.page-content h2', '.page-content h3', '.page-content h4',
        '.page-content div:not(.page-image):not(.no-translate)', '.page-content span', '.page-content strong', '.page-content b',
        '.page-header h2', '.page-number', '.counter-simple', '#center-counter', '#header-page-num',
        '.page-indicator-compact',
        
        // Navigation
        '#toc-list li', '#toc-list a', '.menu-header span', '.fab', '.fab-menu .menu-header',
        '.arrow-btn', '.nav-simple .counter-simple',
        
        // Header
        '.title-section h1', '.title-section .eng-sub', '.clean-header .title-section',
        
        // Profile modal
        '.profile-modal h3', '.profile-name', '.profile-username', '.profile-info',
        '.profile-info div', '.profile-info b', '.profile-info span', '.logout-btn', '#close-profile',
        '#profile-overlay .profile-modal div',
        
        // Buttons
        'button:not(#lang-dropdown-btn):not(#close-menu):not(#lang-dropdown-menu button)',
        '#login-submit-btn', '#mode-toggle-btn', '#mode-toggle-text', '#guest-mode-btn',
        
        // Auth modal
        '#form-title', '#modal-title', '#login-error', '#upload-status', '.auth-modal-text',
        
        // Links
        'a:not(.no-translate)', '.privacy-link', '.about-link',
        
        // Lists
        'ul li', 'ol li', '.page-content ul', '.page-content ol',
        
        // Error and status
        '.error-message', '.success-message', '.status-message', '.alert', '.notification',
        
        // Form labels
        'label', '.form-label', '.input-group-text',
        
        // Modal content
        '.modal-title', '.modal-body p', '.modal-body span',
        
        // Accordion and tabs
        '.accordion-header', '.accordion-button', '.accordion-body', '.tab-title', '.nav-link',
        
        // Footer
        'footer p', 'footer a', '.footer-text',
        
        // Any element with text content
        '[class*="title"]', '[class*="header"]', '[class*="label"]', '[class*="message"]',
        '[class*="description"]', '[class*="text"]', '[class*="info"]', '[class*="note"]',
        
        // Additional for specific pages (Page 1,4,6,7,26,29,33,37,38,39,40,41)
        '.page-content hr', '.page-content em', '.page-content .highlight', '.page-content .warning',
        '.page-content .tip', '.page-content .important', '.page-content .note-box',
        'blockquote', 'code', 'pre', '.table-caption', '.legend',
        
        // Special page elements
        '.warm-tone', '.cool-tone', '.color-wheel', '.formula-box',
        '.developer-table', '.bleach-info', '.highlight-guide'
    ];
    
    // Exclude selectors (don't translate these)
    const EXCLUDE_SELECTORS = [
        '#lang-dropdown-btn', '#lang-dropdown-menu', '.lang-option',
        'input', 'textarea', 'select', 'code', 'pre code',
        '.page-image', 'img', '.no-translate', '[data-no-translate]'
    ];
    
    // Create dropdown inside header
    function createDropdown() {
        const existing = document.getElementById('lang-dropdown-container');
        if (existing) return;
        
        const header = document.querySelector('.clean-header');
        if (!header) {
            setTimeout(createDropdown, 200);
            return;
        }
        
        const headerRightDiv = header.querySelector('div:last-child');
        if (!headerRightDiv) {
            setTimeout(createDropdown, 200);
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
        
        const profileIcon = document.getElementById('profile-icon-btn');
        if (profileIcon) {
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
    
    // Check if element should be excluded from translation
    function shouldExclude(element) {
        for (const selector of EXCLUDE_SELECTORS) {
            if (element.closest && element.closest(selector)) {
                return true;
            }
        }
        return false;
    }
    
    // Get all text from element (preserve structure)
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
    
    // Save original texts for current page
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
        
        // Also save table cells specifically
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
    
    // Batch translate using API
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
                
                // Small delay between chunks
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
    
    // Translate page content
    async function translatePage(targetLang) {
        if (isTranslating) {
            setTimeout(() => translatePage(targetLang), 200);
            return;
        }
        
        isTranslating = true;
        
        try {
            if (targetLang === 'my') {
                // Restore original texts
                for (const [el, original] of originalTexts) {
                    if (el && document.body.contains(el) && el.innerText !== original) {
                        el.innerText = original;
                    }
                }
                console.log('📖 Restored Myanmar language');
                isTranslating = false;
                return;
            }
            
            // Get elements that need translation
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
    
    // Switch language - dropdown auto closes after selection
    async function switchLanguage(langCode) {
        if (!languages[langCode] || currentLang === langCode) return;
        
        console.log(`🔄 Switching from ${currentLang} to ${langCode}`);
        currentLang = langCode;
        localStorage.setItem('preferred_language', langCode);
        
        // Update button text
        const btn = document.getElementById('lang-dropdown-btn');
        if (btn) {
            btn.innerHTML = `${languages[langCode].flag} ${languages[langCode].name} ▼`;
        }
        
        // Update menu highlight
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
        
        // Close dropdown automatically
        const menu = document.getElementById('lang-dropdown-menu');
        if (menu) menu.style.display = 'none';
        
        showToast(`📖 ${languages[langCode].name}...`);
        await translatePage(langCode);
        showToast(`✅ ${languages[langCode].name}`);
    }
    
    // Show toast notification
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
            font-family: inherit;
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    // Refresh page content (re-save and re-translate)
    function refreshPageContent() {
        console.log('🔄 Refreshing page content...');
        
        // Clear current page texts from cache (keep others)
        const currentElements = document.querySelectorAll(TRANSLATE_SELECTORS.join(','));
        for (const el of currentElements) {
            if (originalTexts.has(el)) {
                // Don't remove, just update if changed
                const newText = getAllText(el);
                if (newText !== originalTexts.get(el)) {
                    originalTexts.set(el, newText);
                }
            }
        }
        
        // Save any new texts
        saveOriginalTexts();
        
        // Re-translate if needed
        if (currentLang !== 'my') {
            translatePage(currentLang);
        }
    }
    
    // Watch for page changes (navigation, TOC clicks, etc.)
    function watchPageChanges() {
        // Watch for page active class changes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList && target.classList.contains('page') && target.classList.contains('active')) {
                        console.log('📄 Page changed to:', target.id);
                        setTimeout(() => {
                            refreshPageContent();
                        }, 300);
                        break;
                    }
                }
            }
        });
        
        // Observe all pages
        const allPages = document.querySelectorAll('.page');
        allPages.forEach(page => {
            observer.observe(page, { attributes: true, attributeFilter: ['class'] });
        });
        
        // Also observe body for new pages (SPA)
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
        
        // Watch navigation buttons
        const nextBtn = document.getElementById('next-arrow');
        const prevBtn = document.getElementById('prev-arrow');
        
        const handleNav = () => {
            if (currentLang !== 'my') {
                setTimeout(() => refreshPageContent(), 400);
            }
        };
        
        if (nextBtn) nextBtn.addEventListener('click', handleNav);
        if (prevBtn) prevBtn.addEventListener('click', handleNav);
        
        // Watch TOC clicks
        document.addEventListener('click', (e) => {
            const tocItem = e.target.closest('#toc-list li');
            if (tocItem) {
                setTimeout(() => refreshPageContent(), 500);
            }
        });
    }
    
    // Initialize
    function init() {
        console.log('🌐 Translation System Starting...');
        
        // Try to create dropdown with retry
        let attempts = 0;
        const maxAttempts = 20;
        
        function tryCreate() {
            const header = document.querySelector('.clean-header');
            if (header) {
                createDropdown();
                return true;
            }
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(tryCreate, 300);
            } else {
                console.log('⚠️ Could not find header, creating fallback');
                createFallbackDropdown();
            }
            return false;
        }
        
        function createFallbackDropdown() {
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
            
            console.log('✅ Fallback dropdown created');
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
