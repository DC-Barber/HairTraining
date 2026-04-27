  // exam-logger.js - Submit exam results to Google Sheets

const EXAM_CONFIG = {
    WEB_APP_URL: "https://script.google.com/macros/s/AKfycbzgABl3jJU3n1KZTkAnqW61xe9BG9x6D9PkI9yghh1if-8JDUOc0WcSCb_Q65Si8Ul1/exec",
    
    getUserData: function() {
        try {
            return JSON.parse(localStorage.getItem('hair_user_data') || '{}');
        } catch(e) {
            return null;
        }
    }
};

let hasSubmitted = false;

async function submitExamResult(score, totalQuestions) {
    totalQuestions = totalQuestions || 20;
    
    if (hasSubmitted) {
        console.log("Already submitted, skipping...");
        return { status: "already_submitted", message: "Result already sent" };
    }
    
    const userData = EXAM_CONFIG.getUserData();
    
    if (!userData || !userData.username) {
        console.log("No user data found");
        return { status: "error", message: "No user data" };
    }
    
    const payload = {
        username: userData.username || "Unknown",
        fullname: userData.fullname || "Unknown",
        phone: userData.phone || "Unknown",
        score: score,
        total: totalQuestions,
        timestamp: new Date().toISOString()
    };
    
    try {
        const cacheBuster = "cb=" + Date.now() + "_" + Math.random();
        const url = EXAM_CONFIG.WEB_APP_URL + "?" + cacheBuster;
        
        await fetch(url, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        console.log("Result submitted once");
        hasSubmitted = true;
        return { status: "success" };
        
    } catch(e) {
        console.error("Submit failed:", e);
        return { status: "error", message: e.message };
    }
}

function resetExamSubmissionFlag() {
    hasSubmitted = false;
    console.log("Submission flag reset");
}