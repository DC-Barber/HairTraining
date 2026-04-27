// exam.js - Core Exam Engine with Custom Alert & Export Support

// Global variables
let allQuestions = [];
let currentExamQuestions = [];
let userAnswers = [];
let currentIndex = 0;

// Custom Alert Function
function showCustomAlert(message, type = "warning") {
    return new Promise((resolve) => {
        const overlay = document.getElementById('customAlertOverlay');
        const icon = document.getElementById('customAlertIcon');
        const title = document.getElementById('customAlertTitle');
        const msgEl = document.getElementById('customAlertMessage');
        const btn = document.getElementById('customAlertBtn');
        
        // Set icon and styling
        if (type === "warning") {
            icon.textContent = "⚠️";
            icon.className = "custom-alert-icon warning";
            title.textContent = "သတိပြုရန်";
        } else if (type === "error") {
            icon.textContent = "❌";
            icon.className = "custom-alert-icon error";
            title.textContent = "အမှား";
        } else if (type === "success") {
            icon.textContent = "✅";
            icon.className = "custom-alert-icon success";
            title.textContent = "အောင်မြင်ပါသည်";
        } else {
            icon.textContent = "ℹ️";
            icon.className = "custom-alert-icon";
            title.textContent = "အကြောင်းကြားချက်";
        }
        
        msgEl.textContent = message;
        overlay.classList.add('active');
        
        const closeHandler = () => {
            overlay.classList.remove('active');
            btn.removeEventListener('click', closeHandler);
            resolve();
        };
        
        btn.addEventListener('click', closeHandler, { once: true });
    });
}

// Function to collect all questions
function collectAllQuestions() {
    const topicArrays = [
        window.topic1, window.topic2, window.topic3, window.topic4,
        window.topic5, window.topic6, window.topic7, window.topic8,
        window.topic9, window.topic10, window.topic11, window.topic12,
        window.topic13, window.topic14, window.topic15, window.topic16,
        window.topic17, window.topic18, window.topic19, window.topic20
    ];
    
    allQuestions = [];
    for (let i = 0; i < topicArrays.length; i++) {
        if (topicArrays[i] && Array.isArray(topicArrays[i])) {
            allQuestions.push(...topicArrays[i]);
        }
    }
    
    if (allQuestions.length === 0) {
        document.getElementById('questionText').innerHTML = "❌ မေးခွန်းများ မတွေ့ရှိပါ။";
        return false;
    }
    return true;
}

// Shuffle array
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Select 20 random questions
function selectExamQuestions() {
    const shuffled = shuffleArray([...allQuestions]);
    currentExamQuestions = shuffled.slice(0, 20);
    userAnswers = new Array(20).fill(null);
    currentIndex = 0;
}

// Check all answered
function isAllAnswered() {
    return userAnswers.every(a => a !== null);
}

// Export to Excel/CSV
function exportToExcel() {
    let csvRows = [];
    csvRows.push(['အပုဒ်အမှတ်', 'မေးခွန်း', 'သင့်အဖြေ', 'မှန်ကန်သောအဖြေ', 'ရလဒ်']);
    
    for (let i = 0; i < currentExamQuestions.length; i++) {
        const q = currentExamQuestions[i];
        const userAnswer = userAnswers[i];
        const isCorrect = (userAnswer === q.correct);
        const userAnswerText = userAnswer !== null ? q.options[userAnswer] : 'မဖြေရသေးပါ';
        const correctAnswerText = q.options[q.correct];
        const result = isCorrect ? '✓ မှန်' : '✗ မှား';
        
        csvRows.push([
            i + 1,
            q.text,
            userAnswerText,
            correctAnswerText,
            result
        ]);
    }
    
    // Add score summary
    const correctCount = userAnswers.filter((a, idx) => a === currentExamQuestions[idx].correct).length;
    csvRows.push([]);
    csvRows.push(['စုစုပေါင်းရမှတ်', `${correctCount} / 20`, '', '', '']);
    
    const csvContent = csvRows.map(row => {
        return row.map(cell => {
            if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
                return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
        }).join(',');
    }).join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `exam_results_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showCustomAlert('Excel ဖိုင်သို့ ထုတ်ယူပြီးပါပြီ။', 'success');
}

// Show result
function showResult() {
    let correct = 0;
    const mistakes = [];
    
    for (let i = 0; i < currentExamQuestions.length; i++) {
        const q = currentExamQuestions[i];
        const userAnswer = userAnswers[i];
        if (userAnswer !== null && userAnswer === q.correct) {
            correct++;
        } else {
            mistakes.push({
                question: q.text,
                correctAnswer: q.options[q.correct],
                userAnswer: userAnswer !== null ? q.options[userAnswer] : "မဖြေရသေးပါ"
            });
        }
    }
    
    document.getElementById('scoreDisplay').innerHTML = `${correct} / 20`;
    
    const mistakeList = document.getElementById('mistakeList');
    if (mistakes.length === 0) {
        mistakeList.innerHTML = '<p style="text-align:center; color:#2e7d32; background:#e8f5e9; padding:15px; border-radius:12px;">🎉 ဂုဏ်ယူပါတယ်။ အမှားမရှိပါ။ 🎉</p>';
    } else {
        let html = '<h3>❌ မှားသောအပုဒ်များ</h3><ul class="mistake-list">';
        mistakes.forEach((m, idx) => {
            html += `<li><strong>${idx+1}.</strong> ${m.question}<br>
                     <span style="color:#2e7d32;">✓ မှန်ကန်သောအဖြေ: ${m.correctAnswer}</span><br>
                     <span style="color:#c62828;">✗ သင့်အဖြေ: ${m.userAnswer}</span></li>`;
        });
        html += '</ul>';
        mistakeList.innerHTML = html;
    }
    
    document.getElementById('resultModal').classList.add('active');
}

// Update progress
function updateProgress() {
    const answeredCount = userAnswers.filter(a => a !== null).length;
    const progressPercent = (answeredCount / 20) * 100;
    document.getElementById('progressFill').style.width = `${progressPercent}%`;
}

// Select answer
function selectAnswer(questionIndex, optionIndex) {
    userAnswers[questionIndex] = optionIndex;
    updateProgress();
    renderCurrentQuestion();
}

// Render current question
function renderCurrentQuestion() {
    if (!currentExamQuestions.length || currentIndex >= currentExamQuestions.length) return;
    
    const q = currentExamQuestions[currentIndex];
    const currentAnswer = userAnswers[currentIndex];
    
    document.getElementById('questionText').innerHTML = `${currentIndex + 1}. ${q.text}`;
    document.getElementById('counter').innerText = `အပုဒ် ${currentIndex + 1} / 20`;
    
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    
    q.options.forEach((opt, idx) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        if (currentAnswer === idx) {
            optionDiv.classList.add('selected');
        }
        
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'question';
        radio.value = idx;
        radio.checked = (currentAnswer === idx);
        
        radio.addEventListener('change', (function(optIdx) {
            return function() {
                selectAnswer(currentIndex, optIdx);
            };
        })(idx));
        
        const label = document.createElement('label');
        label.textContent = `${String.fromCharCode(65+idx)}. ${opt}`;
        
        optionDiv.addEventListener('click', (function(optIdx) {
            return function(e) {
                if (e.target.type !== 'radio') {
                    const radioInput = optionDiv.querySelector('input');
                    if (radioInput) {
                        radioInput.checked = true;
                        selectAnswer(currentIndex, optIdx);
                    }
                }
            };
        })(idx));
        
        optionDiv.appendChild(radio);
        optionDiv.appendChild(label);
        optionsContainer.appendChild(optionDiv);
    });
    
    updateProgress();
}

// Next question
async function nextQuestion() {
    if (userAnswers[currentIndex] === null) {
        await showCustomAlert("ကျေးဇူးပြု၍ လက်ရှိမေးခွန်းကို ဖြေဆိုပါ။", "warning");
        return;
    }
    
    if (currentIndex < 19) {
        currentIndex++;
        renderCurrentQuestion();
        return;
    }
    
    if (currentIndex === 19) {
        if (isAllAnswered()) {
            showResult();
        } else {
            await showCustomAlert("ကျေးဇူးပြု၍ မေးခွန်းအားလုံးကို ဖြေဆိုပါ။", "warning");
        }
    }
}

// Prev question
function prevQuestion() {
    if (currentIndex > 0) {
        currentIndex--;
        renderCurrentQuestion();
    }
}

// Restart exam
function restartExam() {
    document.getElementById('resultModal').classList.remove('active');
    selectExamQuestions();
    currentIndex = 0;
    renderCurrentQuestion();
}

// Initialize
function initExam() {
    if (!collectAllQuestions()) return;
    
    selectExamQuestions();
    renderCurrentQuestion();
    
    document.getElementById('nextBtn').addEventListener('click', nextQuestion);
    document.getElementById('prevBtn').addEventListener('click', prevQuestion);
    document.getElementById('restartBtn').addEventListener('click', restartExam);
    document.getElementById('exportBtn').addEventListener('click', exportToExcel);
}

document.addEventListener('DOMContentLoaded', initExam);