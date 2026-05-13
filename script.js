// script.js - Professional Hair Training Manual with Multi-Language + Caching

// ===================== CONFIGURATION =====================
const SHEET_ID = '2PACX-1vT3BkGwOrAihDIEyToF8ZvS6MNdCzHvOv707uvUd1nxhCnI5oN-yYeJmw0srdTHDZQd7S1-4wi4LaM9';

// ✅ YOUR GIDs
const TAB_GIDS = {
    myanmar: 0,
    english: 269015819,
    japan: 489982442,
    thailand: 210398600,
    vietnam: 1934607971
};

// Language display names
const LANGUAGE_NAMES = {
    myanmar: 'မြန်မာ',
    english: 'English',
    japan: '日本語',
    thailand: 'ไทย',
    vietnam: 'Việt'
};

// Language titles
const LANGUAGE_TITLES = {
    myanmar: { main: 'ဆံသား လေ့ကျင့်ရေး လမ်းညွှန်', sub: 'Professional Hair Training Manual' },
    english: { main: 'Hair Training Manual', sub: 'Professional Hair Training Guide' },
    japan: { main: 'ヘアトレーニングマニュアル', sub: 'プロフェッショナルヘアトレーニング' },
    thailand: { main: 'คู่มือการฝึกอบรมเส้นผม', sub: 'Professional Hair Training Manual' },
    vietnam: { main: 'Sổ Tay Đào Tạo Tóc', sub: 'Professional Hair Training Manual' }
};

// ========== CACHE CONFIGURATION ==========
const PAGE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const PAGE_CACHE_KEY_PREFIX = 'page_data_';
const PAGE_CACHE_TIME_PREFIX = 'page_data_time_';

// =========================================================

let currentPage = 1;
let totalPages = 1;
let currentLang = 'myanmar';
let pagesData = [];
let isLoading = false;

// Parse CSV line (handles quotes)
function parseCSVLine(line) {
    const result = [];
    let inQuotes = false;
    let current = '';
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current.trim());
    return result;
}

// Parse CSV to pages array (with HTML preservation)
function parseCSVToPages(csvText) {
    if (!csvText || csvText.trim().length === 0) return [];

    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]);
    const idIdx = headers.findIndex(h => h.toLowerCase() === 'id');
    const titleIdx = headers.findIndex(h => h.toLowerCase() === 'title');
    const contentIdx = headers.findIndex(h => h.toLowerCase() === 'content');
    const imgIdx = headers.findIndex(h => h.toLowerCase() === 'img');

    const pages = [];
    for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        const id = (idIdx !== -1 && cols[idIdx]) ? parseInt(cols[idIdx]) : i;
        const title = (titleIdx !== -1 && cols[titleIdx]) ? cols[titleIdx] : `Page ${id}`;
        let content = (contentIdx !== -1 && cols[contentIdx]) ? cols[contentIdx] : '';
        const img = (imgIdx !== -1 && cols[imgIdx]) ? cols[imgIdx] : '';

        content = content.replace(/\\n/g, '<br>').replace(/\\t/g, '&nbsp;&nbsp;');
        
        if (content.startsWith('"') && content.endsWith('"')) {
            content = content.slice(1, -1);
        }
        content = content.replace(/""/g, '"');

        pages.push({ id, title, content, img });
    }
    return pages.sort((a, b) => a.id - b.id);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Fetch CSV using fetch()
async function fetchSheetData(langCode) {
    const gid = TAB_GIDS[langCode];
    if (gid === undefined || gid === null) {
        throw new Error(`No GID configured for ${langCode}`);
    }

    const url = `https://docs.google.com/spreadsheets/d/e/${SHEET_ID}/pub?gid=${gid}&single=true&output=csv&t=${Date.now()}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
}

// Update header titles based on language
function updateHeaderTitles(langCode) {
    const titles = LANGUAGE_TITLES[langCode] || LANGUAGE_TITLES.myanmar;
    const mainTitle = document.getElementById('main-title');
    const subTitle = document.getElementById('sub-title');
    if (mainTitle) mainTitle.innerText = titles.main;
    if (subTitle) subTitle.innerText = titles.sub;
}

// ========== UI VISIBILITY CONTROL (For Page 42) ==========
function updateUIVisibility(pageNum) {
    const header = document.querySelector('.clean-header');
    const nav = document.querySelector('.nav-simple');
    const fab = document.querySelector('.fab');
    
    if (pageNum === 42) {
        if (header) header.style.display = 'none';
        if (nav) nav.style.display = 'none';
        if (fab) fab.style.display = 'none';
        
        const adContainers = document.querySelectorAll('div[style*="text-align: center"]');
        adContainers.forEach(ad => {
            if (ad.innerHTML.includes('adsbygoogle')) {
                ad.style.display = 'none';
            }
        });
    } else {
        if (header) header.style.display = '';
        if (nav) nav.style.display = '';
        if (fab) fab.style.display = '';
        
        const adContainers = document.querySelectorAll('div[style*="text-align: center"]');
        adContainers.forEach(ad => {
            if (ad.innerHTML.includes('adsbygoogle')) {
                ad.style.display = '';
            }
        });
    }
}

// ========== RENDER ALL PAGES (with special handling for page 42) ==========
function renderAllPages() {
    const wrapper = document.getElementById('pages-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = '';

    if (!pagesData || pagesData.length === 0) {
        wrapper.innerHTML = '<div class="page active" style="text-align:center; padding:60px;">⚠️ No data available. Please check GIDs and sheet publication.</div>';
        totalPages = 1;
        updateCounterDisplay();
        return;
    }

    pagesData.forEach(page => {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        if (page.id === currentPage) pageDiv.classList.add('active');
        pageDiv.id = `page-${page.id}`;
        
        if (page.id === 42) {
            pageDiv.innerHTML = `
                <div class="page-header" style="display: none !important;">
                    <span class="page-number">${page.id}</span>
                    <h2>${escapeHtml(page.title)}</h2>
                </div>
                <div class="page-content" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white; z-index: 9999; overflow: hidden;">
                    <iframe 
                        src="vlibrary/vlibrary.html" 
                        style="width: 100%; height: 100%; border: none; display: block;">
                    </iframe>
                    <button id="exit-video-library" style="position: fixed; bottom: 20px; left: 20px; z-index: 10000; background: rgba(0,0,0,0.7); color: white; border: none; border-radius: 50%; width: 50px; height: 50px; font-size: 24px; cursor: pointer; backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center;">←</button>
                </div>
            `;
        } else {
            pageDiv.innerHTML = `
                <div class="page-header">
                    <span class="page-number">${page.id}</span>
                    <h2>${escapeHtml(page.title)}</h2>
                </div>
                ${page.img ? `<img src="${page.img}" class="page-image" alt="diagram" onerror="this.src='https://picsum.photos/id/30/800/400'">` : ''}
                <div class="page-content">${page.content || '<p>No content available</p>'}</div>
            `;
        }
        wrapper.appendChild(pageDiv);
    });

    totalPages = pagesData.length;
    
    setTimeout(() => {
        const exitBtn = document.getElementById('exit-video-library');
        if (exitBtn) {
            exitBtn.onclick = () => {
                updatePageUI(41);
            };
        }
    }, 100);
    
    updateUIVisibility(currentPage);
    updatePageUI(currentPage);
}

function updatePageUI(pageNum) {
    const allPages = document.querySelectorAll('.page');
    allPages.forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${pageNum}`);
    if (target) target.classList.add('active');
    currentPage = pageNum;
    updateCounterDisplay();
    updateUIVisibility(pageNum);
    
    if (pageNum === 42) {
        setTimeout(() => {
            const iframe = document.querySelector('#page-42 iframe');
            if (iframe && iframe.src) {
                const currentSrc = iframe.src;
                iframe.src = '';
                setTimeout(() => {
                    iframe.src = currentSrc;
                }, 50);
            }
        }, 50);
    }
}

function updateCounterDisplay() {
    const centerCounter = document.getElementById('center-counter');
    const headerPageNum = document.getElementById('header-page-num');
    if (centerCounter) centerCounter.innerText = `${currentPage} / ${totalPages}`;
    if (headerPageNum) headerPageNum.innerText = `${currentPage} / ${totalPages}`;
}

// Build Table of Contents
function buildTOC() {
    const tocList = document.getElementById('toc-list');
    if (!tocList) return;
    
    tocList.innerHTML = '';
    pagesData.forEach(p => {
        const li = document.createElement('li');
        li.textContent = `${p.id} - ${p.title.length > 28 ? p.title.slice(0, 26) + '...' : p.title}`;
        li.addEventListener('click', () => {
            updatePageUI(p.id);
            const fabMenu = document.getElementById('fab-menu');
            if (fabMenu) fabMenu.classList.remove('active');
        });
        tocList.appendChild(li);
    });
}

// ========== LOAD LANGUAGE WITH CACHING (FASTER) ==========
async function loadLanguage(langCode, skipCache = false) {
    if (isLoading) return;
    isLoading = true;

    const cacheKey = PAGE_CACHE_KEY_PREFIX + langCode;
    const cacheTimeKey = PAGE_CACHE_TIME_PREFIX + langCode;
    
    // ✅ Check cache first
    if (!skipCache) {
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(cacheTimeKey);
        
        if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime)) < PAGE_CACHE_DURATION) {
            console.log(`📦 Using cached data for ${langCode} (${Math.round((Date.now() - parseInt(cachedTime)) / 1000)}s old)`);
            pagesData = JSON.parse(cachedData);
            currentLang = langCode;
            currentPage = 1;
            renderAllPages();
            buildTOC();
            updateHeaderTitles(langCode);
            isLoading = false;
            return;
        }
    }

    const wrapper = document.getElementById('pages-wrapper');
    if (wrapper) {
        wrapper.innerHTML = '<div class="loading" style="text-align:center; padding:60px;">📖 Loading ' + LANGUAGE_NAMES[langCode] + ' manual...</div>';
    }

    try {
        const csvData = await fetchSheetData(langCode);
        const newPages = parseCSVToPages(csvData);

        if (newPages.length === 0) {
            throw new Error('No valid pages found in sheet');
        }

        pagesData = newPages;
        
        // ✅ Save to cache
        localStorage.setItem(cacheKey, JSON.stringify(pagesData));
        localStorage.setItem(cacheTimeKey, Date.now().toString());
        
        currentLang = langCode;
        currentPage = 1;
        renderAllPages();
        buildTOC();
        updateHeaderTitles(langCode);
        
        localStorage.setItem('preferred_language', langCode);
        
        console.log(`✅ Loaded ${langCode}: ${pagesData.length} pages (cached for 30 min)`);
    } catch (error) {
        console.error(`❌ Error loading ${langCode}:`, error);
        
        // ✅ Try to use expired cache as fallback
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
            console.log(`⚠️ Using expired cache for ${langCode}`);
            pagesData = JSON.parse(cachedData);
            renderAllPages();
            buildTOC();
            updateHeaderTitles(langCode);
        } else {
            let errorMsg = error.message;
            if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
                errorMsg = '⚠️ Network error. Please check your connection.';
            }
            if (wrapper) {
                wrapper.innerHTML = `<div class="page active" style="text-align:center; padding:40px;"><h3>${errorMsg}</h3></div>`;
            }
            pagesData = [];
            totalPages = 1;
            updatePageUI(1);
        }
    } finally {
        isLoading = false;
    }
}

// Setup Language Dropdown
function setupLanguageDropdown() {
    const toggleBtn = document.getElementById('lang-toggle-btn');
    const langMenu = document.getElementById('lang-menu');
    const menuItems = document.querySelectorAll('.lang-menu-item');
    
    if (!toggleBtn || !langMenu) return;
    
    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        langMenu.classList.toggle('active');
    });
    
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const lang = item.getAttribute('data-lang');
            if (lang && !isLoading) {
                loadLanguage(lang);
                langMenu.classList.remove('active');
            }
        });
    });
    
    document.addEventListener('click', (e) => {
        if (!toggleBtn.contains(e.target) && !langMenu.contains(e.target)) {
            langMenu.classList.remove('active');
        }
    });
}

// Navigation setup
function setupNavigation() {
    const prevBtn = document.getElementById('prev-arrow');
    const nextBtn = document.getElementById('next-arrow');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) updatePageUI(currentPage - 1);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentPage < totalPages) updatePageUI(currentPage + 1);
        });
    }

    let touchStartX = 0;
    const container = document.querySelector('.book-container');
    if (container) {
        container.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        container.addEventListener('touchend', (e) => {
            const diff = e.changedTouches[0].screenX - touchStartX;
            if (diff < -50 && currentPage < totalPages) updatePageUI(currentPage + 1);
            if (diff > 50 && currentPage > 1) updatePageUI(currentPage - 1);
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') prevBtn?.click();
        if (e.key === 'ArrowRight') nextBtn?.click();
    });
}

// Setup FAB Menu
function setupFabMenu() {
    const fabBtn = document.getElementById('fab-btn');
    const fabMenu = document.getElementById('fab-menu');
    const closeMenu = document.getElementById('close-menu');
    
    if (fabBtn && fabMenu) {
        fabBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            fabMenu.classList.toggle('active');
        });
        
        if (closeMenu) {
            closeMenu.addEventListener('click', () => {
                fabMenu.classList.remove('active');
            });
        }
        
        document.addEventListener('click', (e) => {
            if (!fabMenu.contains(e.target) && !fabBtn.contains(e.target)) {
                fabMenu.classList.remove('active');
            }
        });
    }
}

// Initialize
function init() {
    setupNavigation();
    setupFabMenu();
    setupLanguageDropdown();
    
    const savedLang = localStorage.getItem('preferred_language');
    const initialLang = (savedLang && TAB_GIDS[savedLang] !== undefined) ? savedLang : 'myanmar';
    loadLanguage(initialLang);
}

document.addEventListener('DOMContentLoaded', init);