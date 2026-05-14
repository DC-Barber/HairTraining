// translate.js - Simple Version

(function() {
    console.log('🌐 Translation script loading...');
    
    let currentLang = 'my';
    
    const languages = {
        'my': { name: 'မြန်မာ', flag: '🇲🇲' },
        'en': { name: 'English', flag: '🇬🇧' },
        'vi': { name: 'Tiếng Việt', flag: '🇻🇳' },
        'ja': { name: '日本語', flag: '🇯🇵' },
        'th': { name: 'ภาษาไทย', flag: '🇹🇭' }
    };
    
    // စာသားတွေ သိမ်းမယ်
    const originalTexts = new Map();
    
    // Button တည်ဆောက်မယ်
    function createDropdown() {
        console.log('🔧 Creating language dropdown...');
        
        // ရှိပြီးသားကို ဖျက်မယ်
        const existing = document.getElementById('lang-dropdown-container');
        if (existing) existing.remove();
        
        // Container ဆောက်မယ်
        const container = document.createElement('div');
        container.id = 'lang-dropdown-container';
        container.style.cssText = `
            position: fixed;
            top: 12px;
            right: 70px;
            z-index: 30001;
        `;
        
        // Button ဆောက်မယ်
        const btn = document.createElement('button');
        btn.id = 'lang-dropdown-btn';
        btn.innerHTML = '🇲🇲 မြန်မာ ▼';
        btn.style.cssText = `
            background: #1e3a5f;
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
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        
        // Menu ဆောက်မယ်
        const menu = document.createElement('div');
        menu.id = 'lang-dropdown-menu';
        menu.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            margin-top: 5px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            min-width: 140px;
            z-index: 30002;
            display: none;
            overflow: hidden;
        `;
        
        // Language options တွေထည့်မယ်
        for (const [code, lang] of Object.entries(languages)) {
            const option = document.createElement('div');
            option.innerHTML = `${lang.flag} ${lang.name}`;
            option.style.cssText = `
                padding: 10px 15px;
                cursor: pointer;
                font-size: 0.85rem;
                color: #333;
                display: flex;
                align-items: center;
                gap: 10px;
                transition: background 0.15s;
            `;
            option.onmouseenter = () => option.style.background = '#f0e7dc';
            option.onmouseleave = () => option.style.background = 'white';
            option.onclick = () => switchLanguage(code);
            menu.appendChild(option);
        }
        
        container.appendChild(btn);
        container.appendChild(menu);
        document.body.appendChild(container);
        
        // Toggle menu
        btn.onclick = (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        };
        
        document.addEventListener('click', () => {
            menu.style.display = 'none';
        });
        
        console.log('✅ Language dropdown created!');
    }
    
    // စာသားတွေကို သိမ်းမယ်
    function saveOriginalTexts() {
        const elements = document.querySelectorAll('.page-content p, .page-content li, .page-content h2, .page-header h2, .counter-simple, #toc-list li, .title-section h1, .title-section .eng-sub');
        
        elements.forEach(el => {
            const text = el.innerText;
            if (text && text.trim() && !originalTexts.has(el)) {
                originalTexts.set(el, text);
            }
        });
        
        console.log('📝 Saved', originalTexts.size, 'original texts');
    }
    
    // ဘာသာပြန်မယ်
    async function translateText(text, targetLang) {
        if (!text || text.trim() === '') return text;
        if (targetLang === 'my') return text;
        
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=my&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
            const response = await fetch(url);
            const data = await response.json();
            return data[0][0][0] || text;
        } catch (error) {
            console.error('Translation error:', error);
            return text;
        }
    }
    
    // စာမျက်နှာတစ်ခုလုံးကို ဘာသာပြန်မယ်
    async function translatePage(targetLang) {
        if (targetLang === 'my') {
            // မူရင်းအတိုင်း ပြန်ထားမယ်
            for (const [el, original] of originalTexts) {
                if (el && el.innerText !== original) {
                    el.innerText = original;
                }
            }
            return;
        }
        
        const elements = document.querySelectorAll('.page-content p, .page-content li, .page-content h2, .page-header h2, .counter-simple, #toc-list li, .title-section h1, .title-section .eng-sub');
        
        for (const el of elements) {
            const original = originalTexts.get(el);
            if (original && el.innerText === original) {
                const translated = await translateText(original, targetLang);
                if (translated && translated !== original) {
                    el.innerText = translated;
                }
                // Rate limit မကျော်အောင် နည်းနည်းစောင့်မယ်
                await new Promise(r => setTimeout(r, 100));
            }
        }
        
        console.log('🌐 Translation to', targetLang, 'completed');
    }
    
    // Language ပြောင်းမယ်
    async function switchLanguage(langCode) {
        if (currentLang === langCode) return;
        
        console.log('Switching to:', langCode);
        currentLang = langCode;
        localStorage.setItem('preferred_language', langCode);
        
        // Button text ပြောင်းမယ်
        const btn = document.getElementById('lang-dropdown-btn');
        if (btn) {
            btn.innerHTML = `${languages[langCode].flag} ${languages[langCode].name} ▼`;
        }
        
        // Toast ပြမယ်
        showToast(`Translating to ${languages[langCode].name}...`);
        
        await translatePage(langCode);
        
        showToast(`✅ ${languages[langCode].name}`);
    }
    
    // Toast အကြောင်းကြားချက်
    function showToast(msg) {
        const existing = document.getElementById('translation-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.id = 'translation-toast';
        toast.textContent = msg;
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
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
    
    // Page change ကို စောင့်မယ် (page navigation လုပ်ရင် ပြန်ဘာသာပြန်ဖို့)
    function observePageChanges() {
        const observer = new MutationObserver(() => {
            if (currentLang !== 'my') {
                setTimeout(() => {
                    translatePage(currentLang);
                }, 500);
            }
        });
        
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
            subtree: true
        });
        
        // Next/prev buttons ကို နားဆင်မယ်
        const nextBtn = document.getElementById('next-arrow');
        const prevBtn = document.getElementById('prev-arrow');
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                setTimeout(() => {
                    if (currentLang !== 'my') translatePage(currentLang);
                }, 300);
            });
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                setTimeout(() => {
                    if (currentLang !== 'my') translatePage(currentLang);
                }, 300);
            });
        }
    }
    
    // Main - DOM ready ဖြစ်ရင် run မယ်
    function init() {
        console.log('🌐 Translation manager initializing...');
        
        // Button ကို 1 စက္ကန့်စောင့်ပြီးမှ တည်ဆောက်မယ် (auth modal ရှိနေလို့)
        setTimeout(() => {
            createDropdown();
            saveOriginalTexts();
            observePageChanges();
            
            // Saved language ရှိရင် ပြန်ဘာသာပြန်မယ်
            const savedLang = localStorage.getItem('preferred_language');
            if (savedLang && savedLang !== 'my' && languages[savedLang]) {
                setTimeout(() => {
                    switchLanguage(savedLang);
                }, 500);
            }
        }, 1000);
        
        // DOM အပြည့်အဝ load ရင် ထပ်သိမ်းမယ်
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
