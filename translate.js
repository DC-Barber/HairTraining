// translate.js - Google Translate Integration
// Supports: Myanmar (my), English (en), Vietnamese (vi), Japanese (ja), Thai (th)

const TranslationManager = {
    // Default language is Myanmar
    currentLang: 'my',
    
    // Google Translate API base URL
    googleTranslateBase: 'https://translate.googleapis.com/translate_a/single',
    
    // Supported languages
    languages: {
        'my': { name: 'မြန်မာ', flag: '🇲🇲', code: 'my', googleCode: 'my' },
        'en': { name: 'English', flag: '🇬🇧', code: 'en', googleCode: 'en' },
        'vi': { name: 'Tiếng Việt', flag: '🇻🇳', code: 'vi', googleCode: 'vi' },
        'ja': { name: '日本語', flag: '🇯🇵', code: 'ja', googleCode: 'ja' },
        'th': { name: 'ภาษาไทย', flag: '🇹🇭', code: 'th', googleCode: 'th' }
    },
    
    // Elements that should NOT be translated (keep original)
    excludeSelectors: [
        'input', 'textarea', 'code', 'pre',
        '.no-translate', '#auth-modal-overlay input',
        '#login-username', '#login-password', '#register-phone', '#register-fullname',
        '[type="password"]', '[type="text"]', '[type="tel"]'
    ],
    
    // Cache for translated content
    translationCache: new Map(),
    
    init() {
        // Load saved language preference
        const savedLang = localStorage.getItem('preferred_language');
        if (savedLang && this.languages[savedLang]) {
            this.currentLang = savedLang;
        } else {
            this.currentLang = 'my';
        }
        
        this.createLanguageDropdown();
        this.applyTranslations();
        this.observeDynamicContent();
        
        console.log('🌐 Translation manager initialized, current language:', this.currentLang);
    },
    
    createLanguageDropdown() {
        // Check if dropdown already exists
        if (document.getElementById('lang-dropdown')) return;
        
        // Find the header container
        const header = document.querySelector('.clean-header');
        const profileIcon = document.getElementById('profile-icon-btn');
        
        if (!header || !profileIcon) {
            setTimeout(() => this.createLanguageDropdown(), 100);
            return;
        }
        
        // Create dropdown container
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'lang-dropdown-container';
        dropdownContainer.id = 'lang-dropdown';
        dropdownContainer.style.cssText = `
            position: relative;
            display: inline-block;
            margin-right: 8px;
        `;
        
        // Create dropdown button
        const dropdownBtn = document.createElement('button');
        dropdownBtn.className = 'lang-dropdown-btn';
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
        
        // Create dropdown menu
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'lang-dropdown-menu';
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
            z-index: 1000;
            display: none;
            overflow: hidden;
        `;
        
        // Create language options
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
            
            option.addEventListener('mouseenter', () => {
                option.style.backgroundColor = '#f0e7dc';
            });
            option.addEventListener('mouseleave', () => {
                option.style.backgroundColor = 'white';
            });
            
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                this.switchLanguage(code);
                dropdownMenu.style.display = 'none';
            });
            
            dropdownMenu.appendChild(option);
        }
        
        dropdownContainer.appendChild(dropdownBtn);
        dropdownContainer.appendChild(dropdownMenu);
        
        // Toggle dropdown
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = dropdownMenu.style.display === 'block';
            dropdownMenu.style.display = isVisible ? 'none' : 'block';
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target)) {
                dropdownMenu.style.display = 'none';
            }
        });
        
        // Insert before profile icon
        const headerRightDiv = header.querySelector('div:last-child');
        if (headerRightDiv) {
            headerRightDiv.insertBefore(dropdownContainer, profileIcon);
        } else {
            header.appendChild(dropdownContainer);
        }
    },
    
    async switchLanguage(langCode) {
        if (!this.languages[langCode]) return;
        if (this.currentLang === langCode) return;
        
        console.log('🌐 Switching language to:', langCode);
        this.currentLang = langCode;
        localStorage.setItem('preferred_language', langCode);
        
        // Update button text
        const dropdownBtn = document.getElementById('lang-dropdown-btn');
        if (dropdownBtn) {
            dropdownBtn.innerHTML = `${this.languages[langCode].flag} ${this.languages[langCode].name}`;
        }
        
        // Show loading indicator
        this.showToast(`🔄 Translating to ${this.languages[langCode].name}...`);
        
        // Apply translations to all content
        await this.applyTranslations();
        
        this.showToast(`✅ Language changed to ${this.languages[langCode].name}`);
    },
    
    async applyTranslations() {
        // If translating back to Myanmar, just restore original content
        if (this.currentLang === 'my') {
            this.restoreOriginalContent();
            return;
        }
        
        // Get all translatable elements
        const translatableElements = this.getTranslatableElements();
        
        console.log(`🌐 Translating ${translatableElements.length} elements to ${this.currentLang}...`);
        
        // Process in batches to avoid rate limiting
        const batchSize = 10;
        for (let i = 0; i < translatableElements.length; i += batchSize) {
            const batch = translatableElements.slice(i, i + batchSize);
            await this.translateBatch(batch);
        }
        
        console.log('🌐 Translation completed');
    },
    
    getTranslatableElements() {
        const elements = [];
        const excludeSelectors = this.excludeSelectors.join(',');
        
        // Get all text-containing elements
        const allElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span, div, button, a, .page-content, .page-header, .counter-simple, .menu-header, #toc-list li');
        
        for (const el of allElements) {
            // Skip excluded elements
            if (el.closest(excludeSelectors)) continue;
            
            // Skip elements that are inside auth modal inputs
            if (el.closest('#auth-modal-overlay input')) continue;
            if (el.closest('#auth-modal-overlay select')) continue;
            
            // Skip elements that have already been translated
            if (el.hasAttribute('data-translated')) continue;
            
            // Get original text (excluding child elements)
            const originalText = this.getDirectText(el);
            if (originalText && originalText.trim().length > 0 && !this.isNumericOnly(originalText.trim())) {
                elements.push({
                    element: el,
                    originalText: originalText.trim(),
                    isLeaf: this.isLeafElement(el)
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
    
    isLeafElement(element) {
        // Check if element has no child elements that also contain text
        const childElements = element.querySelectorAll('*');
        for (const child of childElements) {
            if (this.getDirectText(child).trim()) {
                return false;
            }
        }
        return true;
    },
    
    isNumericOnly(str) {
        return /^[\d\s\/\.\-]+$/.test(str);
    },
    
    async translateBatch(batch) {
        const texts = batch.map(item => item.originalText);
        const cacheKey = `${this.currentLang}|${texts.join('|')}`;
        
        // Check cache
        if (this.translationCache.has(cacheKey)) {
            const translations = this.translationCache.get(cacheKey);
            batch.forEach((item, index) => {
                this.setElementTranslation(item.element, item.originalText, translations[index]);
            });
            return;
        }
        
        try {
            const translations = await this.translateTexts(texts);
            
            // Cache results
            this.translationCache.set(cacheKey, translations);
            
            // Apply translations
            batch.forEach((item, index) => {
                if (translations[index] && translations[index] !== item.originalText) {
                    this.setElementTranslation(item.element, item.originalText, translations[index]);
                }
            });
            
        } catch (error) {
            console.error('Translation batch error:', error);
        }
    },
    
    async translateTexts(texts) {
        if (texts.length === 0) return [];
        
        const targetLang = this.languages[this.currentLang].googleCode;
        const sourceLang = 'my'; // Source is Myanmar
        
        // Combine texts for single request (Google Translate can handle multiple sentences)
        const combinedText = texts.join('\n\n\n');
        
        try {
            const url = `${this.googleTranslateBase}?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(combinedText)}`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data[0]) {
                // Parse the response
                const translatedCombined = data[0].map(item => item[0]).join('');
                
                // Split back into individual translations
                const translatedTexts = translatedCombined.split('\n\n\n');
                
                // Ensure we have the same number of translations
                while (translatedTexts.length < texts.length) {
                    translatedTexts.push(texts[translatedTexts.length]);
                }
                
                return translatedTexts;
            }
            
            return texts;
            
        } catch (error) {
            console.error('Google Translate API error:', error);
            return texts;
        }
    },
    
    setElementTranslation(element, originalText, translatedText) {
        if (!translatedText || translatedText === originalText) return;
        
        // Store original text if not already stored
        if (!element.hasAttribute('data-original-text')) {
            element.setAttribute('data-original-text', originalText);
        }
        
        // Store the translated text
        element.setAttribute('data-translated', this.currentLang);
        
        // Update the text content (preserve HTML structure)
        if (this.isLeafElement(element)) {
            // For leaf elements, replace all text nodes
            for (const node of element.childNodes) {
                if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                    node.textContent = translatedText;
                }
            }
        }
    },
    
    restoreOriginalContent() {
        // Restore all elements that have original text stored
        const translatedElements = document.querySelectorAll('[data-original-text]');
        
        for (const el of translatedElements) {
            const originalText = el.getAttribute('data-original-text');
            if (originalText) {
                // Restore text nodes
                for (const node of el.childNodes) {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                        node.textContent = originalText;
                    }
                }
            }
            el.removeAttribute('data-translated');
        }
        
        console.log('🌐 Restored original Myanmar content');
    },
    
    observeDynamicContent() {
        // Watch for dynamically added content (like page changes)
        const observer = new MutationObserver((mutations) => {
            if (this.currentLang !== 'my') {
                // Check if new content was added
                let hasNewContent = false;
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) {
                        hasNewContent = true;
                        break;
                    }
                }
                
                if (hasNewContent) {
                    // Debounce to avoid excessive translations
                    clearTimeout(this.translateTimeout);
                    this.translateTimeout = setTimeout(() => {
                        this.applyTranslations();
                    }, 500);
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },
    
    showToast(message) {
        // Remove existing toast
        const existingToast = document.getElementById('translation-toast');
        if (existingToast) existingToast.remove();
        
        // Create toast
        const toast = document.createElement('div');
        toast.id = 'translation-toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 8px 20px;
            border-radius: 30px;
            font-size: 0.8rem;
            z-index: 30001;
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => TranslationManager.init());
} else {
    TranslationManager.init();
}
