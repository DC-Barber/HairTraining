// translate.js - Google Translate Integration (Fixed Version)

const TranslationManager = {
    currentLang: 'my',
    
    languages: {
        'my': { name: 'မြန်မာ', flag: '🇲🇲', code: 'my', googleCode: 'my' },
        'en': { name: 'English', flag: '🇬🇧', code: 'en', googleCode: 'en' },
        'vi': { name: 'Tiếng Việt', flag: '🇻🇳', code: 'vi', googleCode: 'vi' },
        'ja': { name: '日本語', flag: '🇯🇵', code: 'ja', googleCode: 'ja' },
        'th': { name: 'ภาษาไทย', flag: '🇹🇭', code: 'th', googleCode: 'th' }
    },
    
    excludeSelectors: [
        'input', 'textarea', 'code', 'pre', '.no-translate',
        '#auth-modal-overlay input', '#auth-modal-overlay select',
        '#login-username', '#login-password', '#register-phone', '#register-fullname',
        '[type="password"]', '[type="text"]', '[type="tel"]'
    ],
    
    translationCache: new Map(),
    
    init() {
        const savedLang = localStorage.getItem('preferred_language');
        if (savedLang && this.languages[savedLang]) {
            this.currentLang = savedLang;
        } else {
            this.currentLang = 'my';
        }
        
        // Wait for DOM to be fully ready and auth modal to potentially close
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.waitForHeaderAndCreateDropdown());
        } else {
            this.waitForHeaderAndCreateDropdown();
        }
    },
    
    waitForHeaderAndCreateDropdown() {
        // Wait for header to be available (auth modal might be blocking)
        let attempts = 0;
        const maxAttempts = 30;
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            // Look for header or profile icon
            const header = document.querySelector('.clean-header');
            const profileIcon = document.getElementById('profile-icon-btn');
            
            // Also check if auth modal is not visible (user is logged in)
            const authModal = document.getElementById('auth-modal-overlay');
            const isLoggedIn = !authModal || authModal.style.display === 'none' || authModal.style.display === '';
            
            if ((header && profileIcon) || (header && isLoggedIn && attempts > 10)) {
                clearInterval(checkInterval);
                this.createLanguageDropdown();
                console.log('✅ Translation dropdown created');
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                console.log('⚠️ Could not find header, creating dropdown at body');
                this.createLanguageDropdownFallback();
            }
        }, 200);
    },
    
    createLanguageDropdownFallback() {
        // Create dropdown in top-right corner as fallback
        const existingContainer = document.getElementById('lang-dropdown-container');
        if (existingContainer) return;
        
        const container = document.createElement('div');
        container.id = 'lang-dropdown-container';
        container.style.cssText = `
            position: fixed;
            top: 12px;
            right: 70px;
            z-index: 30001;
        `;
        
        this.buildDropdownElements(container);
        document.body.appendChild(container);
    },
    
    createLanguageDropdown() {
        const existingContainer = document.getElementById('lang-dropdown-container');
        if (existingContainer) return;
        
        // Try to find header
        const header = document.querySelector('.clean-header');
        const profileIcon = document.getElementById('profile-icon-btn');
        
        const container = document.createElement('div');
        container.id = 'lang-dropdown-container';
        container.style.cssText = `
            position: relative;
            display: inline-block;
            margin-right: 8px;
        `;
        
        this.buildDropdownElements(container);
        
        if (header) {
            const headerRightDiv = header.querySelector('div:last-child');
            if (headerRightDiv) {
                headerRightDiv.insertBefore(container, profileIcon);
            } else {
                header.appendChild(container);
            }
        } else {
            // Fallback to fixed position
            container.style.cssText = `
                position: fixed;
                top: 12px;
                right: 70px;
                z-index: 30001;
            `;
            document.body.appendChild(container);
        }
    },
    
    buildDropdownElements(container) {
        // Create button
        const dropdownBtn = document.createElement('button');
        dropdownBtn.id = 'lang-dropdown-btn';
        dropdownBtn.innerHTML = `${this.languages[this.currentLang].flag} ${this.languages[this.currentLang].name}`;
        dropdownBtn.style.cssText = `
            background: rgba(30, 58, 95, 0.9);
            backdrop-filter: blur(4px);
            border: none;
            border-radius: 30px;
            padding: 6px 12px;
            font-size: 0.75rem;
            font-weight: 600;
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s ease;
            white-space: nowrap;
        `;
        
        dropdownBtn.onmouseenter = () => {
            dropdownBtn.style.background = 'rgba(30, 58, 95, 1)';
        };
        dropdownBtn.onmouseleave = () => {
            dropdownBtn.style.background = 'rgba(30, 58, 95, 0.9)';
        };
        
        // Create menu
        const dropdownMenu = document.createElement('div');
        dropdownMenu.id = 'lang-dropdown-menu';
        dropdownMenu.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 5px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            min-width: 140px;
            z-index: 30002;
            display: none;
            overflow: hidden;
        `;
        
        // Add language options
        for (const [code, lang] of Object.entries(this.languages)) {
            const option = document.createElement('div');
            option.className = 'lang-option';
            option.setAttribute('data-lang', code);
            option.innerHTML = `${lang.flag} ${lang.name}`;
            option.style.cssText = `
                padding: 10px 15px;
                cursor: pointer;
                font-size: 0.85rem;
                transition: background 0.15s;
                color: #333;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            
            option.onmouseenter = () => { option.style.backgroundColor = '#f0e7dc'; };
            option.onmouseleave = () => { option.style.backgroundColor = 'white'; };
            
            option.onclick = (e) => {
                e.stopPropagation();
                this.switchLanguage(code);
                dropdownMenu.style.display = 'none';
            };
            
            dropdownMenu.appendChild(option);
        }
        
        container.appendChild(dropdownBtn);
        container.appendChild(dropdownMenu);
        
        // Toggle dropdown
        dropdownBtn.onclick = (e) => {
            e.stopPropagation();
            const isVisible = dropdownMenu.style.display === 'block';
            dropdownMenu.style.display = isVisible ? 'none' : 'block';
        };
        
        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                dropdownMenu.style.display = 'none';
            }
        });
    },
    
    async switchLanguage(langCode) {
        if (!this.languages[langCode] || this.currentLang === langCode) return;
        
        console.log('🌐 Switching to:', langCode);
        this.currentLang = langCode;
        localStorage.setItem('preferred_language', langCode);
        
        // Update button
        const btn = document.getElementById('lang-dropdown-btn');
        if (btn) {
            btn.innerHTML = `${this.languages[langCode].flag} ${this.languages[langCode].name}`;
        }
        
        this.showToast(`Translating to ${this.languages[langCode].name}...`);
        
        if (langCode === 'my') {
            this.restoreOriginalContent();
            this.showToast(`✅ Language: ${this.languages[langCode].name}`);
        } else {
            await this.applyTranslations();
            this.showToast(`✅ Language: ${this.languages[langCode].name}`);
        }
    },
    
    async applyTranslations() {
        if (this.currentLang === 'my') return;
        
        const elements = this.getTranslatableElements();
        console.log(`Translating ${elements.length} elements...`);
        
        const batchSize = 8;
        for (let i = 0; i < elements.length; i += batchSize) {
            const batch = elements.slice(i, i + batchSize);
            await this.translateBatch(batch);
        }
    },
    
    getTranslatableElements() {
        const elements = [];
        const excludeSelectors = this.excludeSelectors.join(',');
        
        // Target specific content areas
        const contentSelectors = [
            '.page-content', '.page-header h2', '.page-header .page-number',
            '.counter-simple', '.menu-header span', '#toc-list li',
            '.title-section h1', '.title-section .eng-sub',
            '.page-indicator-compact', '.profile-modal h3', '.profile-name',
            '.profile-username', '.profile-info', '.logout-btn',
            '#close-profile', '.lang-option'
        ];
        
        const targetElements = document.querySelectorAll(contentSelectors.join(','));
        
        for (const el of targetElements) {
            if (el.closest(excludeSelectors)) continue;
            if (el.hasAttribute('data-translated')) continue;
            
            const text = this.getDirectText(el);
            if (text && text.trim().length > 0 && !this.isNumericOnly(text.trim())) {
                elements.push({
                    element: el,
                    originalText: text.trim(),
                    isSimple: true
                });
            }
        }
        
        // Also get paragraphs and list items in page content
        const pageContent = document.querySelectorAll('.page-content p, .page-content li, .page-content div:not(.page-image)');
        for (const el of pageContent) {
            if (el.closest(excludeSelectors)) continue;
            if (el.hasAttribute('data-translated')) continue;
            
            const text = this.getDirectText(el);
            if (text && text.trim().length > 0 && !this.isNumericOnly(text.trim())) {
                elements.push({
                    element: el,
                    originalText: text.trim(),
                    isSimple: true
                });
            }
        }
        
        return elements;
    },
    
    getDirectText(element) {
        let text = '';
        for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                text += node.textContent;
            }
        }
        return text;
    },
    
    isNumericOnly(str) {
        return /^[\d\s\/\.\-\[\]\(\)]+$/.test(str);
    },
    
    async translateBatch(batch) {
        const texts = batch.map(item => item.originalText);
        const cacheKey = `${this.currentLang}|${texts.join('|')}`;
        
        if (this.translationCache.has(cacheKey)) {
            const translations = this.translationCache.get(cacheKey);
            batch.forEach((item, idx) => {
                if (translations[idx] && translations[idx] !== item.originalText) {
                    this.setElementText(item.element, translations[idx]);
                }
            });
            return;
        }
        
        try {
            const translations = await this.translateTexts(texts);
            this.translationCache.set(cacheKey, translations);
            
            batch.forEach((item, idx) => {
                if (translations[idx] && translations[idx] !== item.originalText) {
                    this.setElementText(item.element, translations[idx]);
                }
            });
        } catch (error) {
            console.error('Batch error:', error);
        }
    },
    
    async translateTexts(texts) {
        if (texts.length === 0) return [];
        
        const targetLang = this.languages[this.currentLang].googleCode;
        const combined = texts.join('\n\n\n');
        
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=my&tl=${targetLang}&dt=t&q=${encodeURIComponent(combined)}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data[0]) {
                const translated = data[0].map(item => item[0]).join('');
                const results = translated.split('\n\n\n');
                while (results.length < texts.length) results.push(texts[results.length]);
                return results;
            }
            return texts;
        } catch (error) {
            console.error('API error:', error);
            return texts;
        }
    },
    
    setElementText(element, text) {
        if (!element || !text) return;
        
        if (!element.hasAttribute('data-original-text')) {
            element.setAttribute('data-original-text', this.getDirectText(element));
        }
        element.setAttribute('data-translated', this.currentLang);
        
        // Replace text nodes
        for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                node.textContent = text;
                break;
            }
        }
    },
    
    restoreOriginalContent() {
        const elements = document.querySelectorAll('[data-original-text]');
        for (const el of elements) {
            const original = el.getAttribute('data-original-text');
            if (original) {
                for (const node of el.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                        node.textContent = original;
                        break;
                    }
                }
            }
            el.removeAttribute('data-translated');
        }
        console.log('Restored original content');
    },
    
    showToast(message) {
        const existing = document.getElementById('translation-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.id = 'translation-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.85);
            color: white;
            padding: 8px 20px;
            border-radius: 30px;
            font-size: 0.8rem;
            z-index: 30003;
            white-space: nowrap;
            max-width: 90%;
            white-space: normal;
            text-align: center;
            pointer-events: none;
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
};

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TranslationManager.init());
} else {
    TranslationManager.init();
}