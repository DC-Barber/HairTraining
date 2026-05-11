// chat.js - Hair Training Hub with Category ID + Language Toggle (Menu Only)
// Google Sheet columns: Category ID | Title | Link

// ========== CONFIGURATION ==========
// ⬇️ Replace with your published Google Sheet CSV URL
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRhL9KUWNqFcwYjeiYoxlS3l_7Ox8T3MQer4EcctvRnKqDuLLqs5AiRrQdxJeSBYW5rhjIbgNBEz0YS/pub?gid=0&single=true&output=csv";

// ========== CATEGORY DEFINITIONS (ID Based) ==========
const CATEGORIES = [
    { id: "all", emoji: "📺" },
    { id: "haircut", emoji: "✂️" },
    { id: "fadecut", emoji: "⚡" },
    { id: "curl", emoji: "🌀" },
    { id: "straight", emoji: "📏" },
    { id: "color", emoji: "🎨" },
    { id: "styling", emoji: "💇" },
    { id: "treatment", emoji: "🧴" },
    { id: "shampoo", emoji: "🧼" },
    { id: "facial", emoji: "🧖‍♀️" }
];

// ========== LANGUAGE TRANSLATIONS (FAB Menu Only) ==========
const TRANSLATIONS = {
    en: {
        menuTitle: "Training Categories",
        searchPlaceholder: "🔍 Search categories...",
        footerText: "Video tutorials library",
        cat_all: "All Videos",
        cat_haircut: "Haircut Basics",
        cat_fadecut: "Fade Cut",
        cat_curl: "Curly / Perm",
        cat_straight: "Straight / Smooth",
        cat_color: "Color Theory",
        cat_styling: "Styling Tips",
        cat_treatment: "Hair Treatment",
        cat_shampoo: "Shampoo & Scalp Care",
        cat_facial: "Face Detox & Cleansing"
    },
    my: {
        menuTitle: "သင်တန်းအမျိုးအစားများ",
        searchPlaceholder: "🔍 အမျိုးအစားရှာရန်...",
        footerText: "ဗီဒီယို သင်ခန်းစာများ",
        cat_all: "ဗီဒီယိုအားလုံး",
        cat_haircut: "ဆံပင်ညှပ် အခြေခံ",
        cat_fadecut: "Fade ဆံပင်ညှပ်",
        cat_curl: "ဆံပင်အကောက် ပိုင်း",
        cat_straight: "ဆံပင်အဖြောင့် ပိုင်း",
        cat_color: "ဆံပင် ဆေးဆိုးခြင်း",
        cat_styling: "ဆံပင် ပုံသွင်း",
        cat_treatment: "ဆံသား ပြုပြင်ထိန်းသိမ်းခြင်း",
        cat_shampoo: "ခေါင်းလျှော် ခြင်း",
        cat_facial: "မျက်နှာ အဆိပ်ထုတ်"
    }
};

// Global state
let allVideos = [];
let activeCategoryId = "all";
let currentLang = "en";

// ========== HELPER FUNCTIONS ==========
function getYoutubeEmbedUrl(url) {
    if (!url) return null;
    let videoId = null;
    
    if (url.includes("youtu.be")) {
        const parts = url.split("/");
        let last = parts.pop();
        if (last.includes("?")) last = last.split("?")[0];
        videoId = last;
    } else if (url.includes("youtube.com/watch")) {
        try {
            const urlParams = new URL(url);
            videoId = urlParams.searchParams.get("v");
        } catch(e) {
            const match = url.match(/[?&]v=([^&]+)/);
            if (match) videoId = match[1];
        }
    } else if (url.includes("youtube.com/embed/")) {
        const parts = url.split("/embed/");
        if (parts[1]) videoId = parts[1].split("?")[0];
    } else if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
        videoId = url;
    }
    
    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`;
    }
    return null;
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

// Parse CSV from Google Sheets (Category ID | Title | Link)
function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    // FIXED: Looking for 'category', 'id', or 'category id' (case insensitive)
    const categoryIndex = headers.findIndex(h => h === "category id" || h.includes("category") || h.includes("id"));
    const titleIndex = headers.findIndex(h => h === "title" || h.includes("title"));
    const linkIndex = headers.findIndex(h => h === "link" || h.includes("link") || h.includes("url"));
    
    console.log("CSV Headers found:", headers);
    console.log("Category Index:", categoryIndex, "Title Index:", titleIndex, "Link Index:", linkIndex);
    
    if (titleIndex === -1 || linkIndex === -1) {
        console.warn("CSV headers missing 'Title' or 'Link' column");
        return null;
    }
    
    const validIds = CATEGORIES.map(c => c.id);
    const results = [];
    
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        let row = [];
        let inQuote = false;
        let current = "";
        for (let ch of lines[i]) {
            if (ch === '"') {
                inQuote = !inQuote;
            } else if (ch === ',' && !inQuote) {
                row.push(current.trim());
                current = "";
            } else {
                current += ch;
            }
        }
        row.push(current.trim());
        
        let categoryId = categoryIndex !== -1 ? (row[categoryIndex] || "").replace(/^"|"$/g, '').trim().toLowerCase() : "";
        let rawTitle = titleIndex !== -1 ? (row[titleIndex] || "").replace(/^"|"$/g, '').trim() : "";
        let rawLink = linkIndex !== -1 ? (row[linkIndex] || "").replace(/^"|"$/g, '').trim() : "";
        
        if (rawTitle && rawLink && rawLink.startsWith("http")) {
            if (!validIds.includes(categoryId) || categoryId === "") {
                console.warn(`Invalid category ID "${categoryId}" for "${rawTitle}", defaulting to "styling"`);
                categoryId = "styling";
            }
            results.push({ title: rawTitle, link: rawLink, category: categoryId });
        }
    }
    
    console.log(`Parsed ${results.length} valid videos from CSV`);
    return results;
}

function getCategoryName(categoryId) {
    const t = TRANSLATIONS[currentLang];
    const keyMap = {
        "all": "cat_all",
        "haircut": "cat_haircut",
        "fadecut": "cat_fadecut",
        "curl": "cat_curl",
        "straight": "cat_straight",
        "color": "cat_color",
        "styling": "cat_styling",
        "treatment": "cat_treatment",
        "shampoo": "cat_shampoo",
        "facial": "cat_facial"
    };
    return t[keyMap[categoryId]] || categoryId;
}

function updateMenuLanguage() {
    const t = TRANSLATIONS[currentLang];
    
    const menuTitle = document.getElementById("menuTitle");
    const footerText = document.getElementById("footerText");
    const searchInput = document.getElementById("categorySearchInput");
    const langBtn = document.getElementById("langToggleBtn");
    
    if (menuTitle) menuTitle.textContent = t.menuTitle;
    if (footerText) footerText.textContent = t.footerText;
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;
    
    if (langBtn) {
        if (currentLang === "en") {
            langBtn.classList.add("active-eng");
            langBtn.classList.remove("active-my");
        } else {
            langBtn.classList.add("active-my");
            langBtn.classList.remove("active-eng");
        }
    }
    
    buildCategoryMenu();
    updateActiveCategoryBadge();
}

function updateActiveCategoryBadge() {
    let displayName;
    if (activeCategoryId === "all") {
        displayName = "All Videos";
    } else {
        const cat = CATEGORIES.find(c => c.id === activeCategoryId);
        const englishNames = {
            "haircut": "Haircut", "fadecut": "Fade", "curl": "Curly",
            "straight": "Straight", "color": "Color", "styling": "Styling",
            "treatment": "Treatment", "shampoo": "Shampoo", "facial": "Facial"
        };
        displayName = englishNames[activeCategoryId] || activeCategoryId;
        if (cat) displayName = cat.emoji + " " + displayName;
    }
    const badge = document.getElementById("activeCategoryBadge");
    if (badge) badge.textContent = displayName;
}

function renderVideos(videoList, categoryId) {
    const grid = document.getElementById("videoGrid");
    if (!grid) return;
    
    let filteredVideos = videoList;
    if (categoryId !== "all") {
        filteredVideos = videoList.filter(v => v.category === categoryId);
    }
    
    if (!filteredVideos || filteredVideos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <span style="font-size: 48px;">🎬</span>
                <p>No videos found</p>
                <small>Try selecting a different category or check back later</small>
                <button id="clearFilterBtn" class="refresh-btn">📺 View All Videos</button>
            </div>
        `;
        const clearBtn = document.getElementById("clearFilterBtn");
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                setActiveCategory("all");
                renderVideos(allVideos, "all");
                updateActiveCategoryBadge();
            });
        }
        return;
    }
    
    let cardsHtml = "";
    for (let idx = 0; idx < filteredVideos.length; idx++) {
        const v = filteredVideos[idx];
        const embedUrl = getYoutubeEmbedUrl(v.link);
        if (!embedUrl) continue;
        
        const categoryEmoji = CATEGORIES.find(c => c.id === v.category)?.emoji || "📹";
        const englishNames = {
            "haircut": "Haircut", "fadecut": "Fade", "curl": "Curly",
            "straight": "Straight", "color": "Color", "styling": "Styling",
            "treatment": "Treatment", "shampoo": "Shampoo", "facial": "Facial"
        };
        const categoryName = englishNames[v.category] || v.category;
        
        cardsHtml += `
            <div class="video-card" data-category="${v.category}">
                <div class="video-wrapper">
                    <iframe 
                        src="${embedUrl}" 
                        title="${escapeHtml(v.title)}"
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerpolicy="strict-origin-when-cross-origin"
                        allowfullscreen>
                    </iframe>
                </div>
                <div class="video-info">
                    <div class="video-title">
                        <span>${escapeHtml(v.title)}</span>
                        <span class="category-tag">${categoryEmoji} ${categoryName}</span>
                    </div>
                    <div class="video-desc">
                        🎯 Professional training tutorial
                    </div>
                </div>
            </div>
        `;
    }
    
    if (cardsHtml === "") {
        grid.innerHTML = `<div class="empty-state"><p>⚠️ No valid videos to display</p><button id="refreshDataBtn" class="refresh-btn">⟳ Refresh</button></div>`;
        const refreshBtn = document.getElementById("refreshDataBtn");
        if (refreshBtn) refreshBtn.addEventListener("click", () => loadVideosFromSheet());
        return;
    }
    
    grid.innerHTML = cardsHtml;
}

function buildCategoryMenu() {
    const categoryList = document.getElementById("categoryList");
    if (!categoryList) return;
    
    const t = TRANSLATIONS[currentLang];
    
    let html = "";
    for (const cat of CATEGORIES) {
        const count = allVideos.filter(v => v.category === cat.id).length;
        const activeClass = (activeCategoryId === cat.id) ? "active" : "";
        const displayName = cat.id === "all" ? t.cat_all : getCategoryName(cat.id);
        
        html += `
            <li data-category-id="${cat.id}" class="${activeClass}">
                <span class="cat-emoji">${cat.emoji}</span>
                <span class="cat-name">${displayName}</span>
                <span class="cat-count">${cat.id === "all" ? allVideos.length : count}</span>
            </li>
        `;
    }
    
    categoryList.innerHTML = html;
    
    document.querySelectorAll(".category-list li").forEach(li => {
        li.addEventListener("click", () => {
            const categoryId = li.getAttribute("data-category-id");
            setActiveCategory(categoryId);
            renderVideos(allVideos, categoryId);
            closeFabMenu();
        });
    });
    
    const searchInput = document.getElementById("categorySearchInput");
    if (searchInput) {
        searchInput.value = "";
        searchInput.placeholder = t.searchPlaceholder;
        searchInput.oninput = (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const items = document.querySelectorAll(".category-list li");
            items.forEach(item => {
                const catName = item.querySelector(".cat-name")?.textContent.toLowerCase() || "";
                if (catName.includes(searchTerm) || searchTerm === "") {
                    item.style.display = "flex";
                } else {
                    item.style.display = "none";
                }
            });
        };
    }
}

function setActiveCategory(categoryId) {
    activeCategoryId = categoryId;
    updateActiveCategoryBadge();
    
    document.querySelectorAll(".category-list li").forEach(li => {
        const id = li.getAttribute("data-category-id");
        if (id === categoryId) {
            li.classList.add("active");
        } else {
            li.classList.remove("active");
        }
    });
}

function openFabMenu() {
    const menu = document.getElementById("fabMenu");
    const overlay = document.getElementById("fabOverlay");
    if (menu) menu.classList.add("active");
    if (overlay) overlay.classList.add("active");
}

function closeFabMenu() {
    const menu = document.getElementById("fabMenu");
    const overlay = document.getElementById("fabOverlay");
    if (menu) menu.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
}

function toggleFabMenu() {
    const menu = document.getElementById("fabMenu");
    if (menu && menu.classList.contains("active")) {
        closeFabMenu();
    } else {
        openFabMenu();
    }
}

function toggleLanguage() {
    currentLang = currentLang === "en" ? "my" : "en";
    updateMenuLanguage();
}

async function loadVideosFromSheet() {
    const grid = document.getElementById("videoGrid");
    
    if (grid) {
        grid.innerHTML = `
            <div class="loader-container">
                <div class="loader-spinner"></div>
                <p>Loading video library...</p>
            </div>
        `;
    }
    
    try {
        const response = await fetch(`${SHEET_CSV_URL}&t=${Date.now()}`, {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const csvText = await response.text();
        console.log("CSV fetched, length:", csvText.length);
        
        const videos = parseCSV(csvText);
        
        if (videos && videos.length > 0) {
            allVideos = videos;
            buildCategoryMenu();
            renderVideos(allVideos, activeCategoryId);
        } else {
            console.log("No videos from sheet");
            allVideos = [];
            buildCategoryMenu();
            renderVideos(allVideos, activeCategoryId);
        }
    } catch (err) {
        console.error("Failed to fetch sheet:", err);
        allVideos = [];
        buildCategoryMenu();
        renderVideos(allVideos, activeCategoryId);
    }
}

function init() {
    const fabBtn = document.getElementById("fabBtn");
    const closeMenuBtn = document.getElementById("closeMenuBtn");
    const fabOverlay = document.getElementById("fabOverlay");
    const langToggleBtn = document.getElementById("langToggleBtn");
    
    if (fabBtn) fabBtn.addEventListener("click", toggleFabMenu);
    if (closeMenuBtn) closeMenuBtn.addEventListener("click", closeFabMenu);
    if (fabOverlay) fabOverlay.addEventListener("click", closeFabMenu);
    if (langToggleBtn) langToggleBtn.addEventListener("click", toggleLanguage);
    
    currentLang = "my";
    updateMenuLanguage();
    
    loadVideosFromSheet();
}

document.addEventListener("DOMContentLoaded", init);