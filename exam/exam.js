// exam.js - Core Exam Engine with Loading State

let allQuestions = [];
let currentExamQuestions = [];
let userAnswers = [];
let currentIndex = 0;
let isSubmitting = false;

function showCustomAlert(message, type) {
    type = type || "warning";
    return new Promise(function(resolve) {
        const overlay = document.getElementById('customAlertOverlay');
        const icon = document.getElementById('customAlertIcon');
        const title = document.getElementById('customAlertTitle');
        const msgEl = document.getElementById('customAlertMessage');
        const btn = document.getElementById('customAlertBtn');
        
        if (type === "warning") {
            icon.textContent = "⚠️";
            icon.className = "custom-alert-icon warning";
            title.textContent = "Warning";
        } else if (type === "error") {
            icon.textContent = "❌";
            icon.className = "custom-alert-icon error";
            title.textContent = "Error";
        } else if (type === "success") {
            icon.textContent = "✅";
            icon.className = "custom-alert-icon success";
            title.textContent = "Success";
        } else {
            icon.textContent = "ℹ️";
            icon.className = "custom-alert-icon";
            title.textContent = "Notice";
        }
        
        msgEl.textContent = message;
        overlay.classList.add('active');
        
        var closeHandler = function() {
            overlay.classList.remove('active');
            btn.removeEventListener('click', closeHandler);
            resolve();
        };
        
        btn.addEventListener('click', closeHandler, { once: true });
    });
}

function showLoading(show, buttonElement) {
    if (buttonElement) {
        if (show) {
            buttonElement.disabled = true;
            buttonElement.style.opacity = "0.6";
            buttonElement.style.cursor = "not-allowed";
            buttonElement.innerHTML = "⏳ Processing...";
        } else {
            buttonElement.disabled = false;
            buttonElement.style.opacity = "1";
            buttonElement.style.cursor = "pointer";
            buttonElement.innerHTML = "Next ▶";
        }
    }
}

function disableAllNavButtons(disabled) {
    var nextBtn = document.getElementById('nextBtn');
    var prevBtn = document.getElementById('prevBtn');
    var restartBtn = document.getElementById('restartBtn');
    var exportBtn = document.getElementById('exportBtn');
    
    if (nextBtn) {
        nextBtn.disabled = disabled;
        nextBtn.style.opacity = disabled ? "0.6" : "1";
        nextBtn.style.cursor = disabled ? "not-allowed" : "pointer";
        if (disabled) nextBtn.innerHTML = "⏳ Submitting...";
        else nextBtn.innerHTML = "Next ▶";
    }
    if (prevBtn) {
        prevBtn.disabled = disabled;
        prevBtn.style.opacity = disabled ? "0.6" : "1";
        prevBtn.style.cursor = disabled ? "not-allowed" : "pointer";
    }
    if (restartBtn) {
        restartBtn.disabled = disabled;
        restartBtn.style.opacity = disabled ? "0.6" : "1";
        restartBtn.style.cursor = disabled ? "not-allowed" : "pointer";
    }
    if (exportBtn) {
        exportBtn.disabled = disabled;
        exportBtn.style.opacity = disabled ? "0.6" : "1";
        exportBtn.style.cursor = disabled ? "not-allowed" : "pointer";
    }
}

function collectAllQuestions() {
    var topicArrays = [
        window.topic1, window.topic2, window.topic3, window.topic4,
        window.topic5, window.topic6, window.topic7, window.topic8,
        window.topic9, window.topic10, window.topic11, window.topic12,
        window.topic13, window.topic14, window.topic15, window.topic16,
        window.topic17, window.topic18, window.topic19, window.topic20
    ];
    
    allQuestions = [];
    for (var i = 0; i < topicArrays.length; i++) {
        if (topicArrays[i] && Array.isArray(topicArrays[i])) {
            allQuestions.push.apply(allQuestions, topicArrays[i]);
        }
    }
    
    if (allQuestions.length === 0) {
        document.getElementById('questionText').innerHTML = "No questions found";
        return false;
    }
    return true;
}

function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }
    return arr;
}

function selectExamQuestions() {
    var shuffled = shuffleArray(allQuestions.slice());
    currentExamQuestions = shuffled.slice(0, 20);
    userAnswers = new Array(20).fill(null);
    currentIndex = 0;
    isSubmitting = false;
}

function isAllAnswered() {
    return userAnswers.every(function(a) { return a !== null; });
}

function updateProgress() {
    var answeredCount = userAnswers.filter(function(a) { return a !== null; }).length;
    var progressPercent = (answeredCount / 20) * 100;
    var progressFill = document.getElementById('progressFill');
    if (progressFill) {
        progressFill.style.width = progressPercent + "%";
    }
}

function selectAnswer(questionIndex, optionIndex) {
    if (isSubmitting) return;
    userAnswers[questionIndex] = optionIndex;
    updateProgress();
    renderCurrentQuestion();
}

async function showResult() {
    var correct = 0;
    var mistakes = [];
    
    for (var i = 0; i < currentExamQuestions.length; i++) {
        var q = currentExamQuestions[i];
        var userAnswer = userAnswers[i];
        if (userAnswer !== null && userAnswer === q.correct) {
            correct++;
        } else {
            mistakes.push({
                question: q.text,
                correctAnswer: q.options[q.correct],
                userAnswer: userAnswer !== null ? q.options[userAnswer] : "Not answered"
            });
        }
    }
    
    var submitResult = await submitExamResult(correct, 20);
    if (submitResult.status === 'success') {
        console.log("Result saved to Google Sheet");
    } else {
        console.warn("Could not save to Google Sheet:", submitResult.message);
    }
    
    var scoreDisplay = document.getElementById('scoreDisplay');
    if (scoreDisplay) {
        scoreDisplay.innerHTML = correct + " / 20";
    }
    
    var mistakeList = document.getElementById('mistakeList');
    if (mistakeList) {
        if (mistakes.length === 0) {
            mistakeList.innerHTML = '<p style="text-align:center; color:#2e7d32; background:#e8f5e9; padding:15px; border-radius:12px;">🎉 Congratulations! You passed the exam with 100% score. 🎉</p>';
        } else {
            var html = '<h3>Wrong Answers</h3><ul class="mistake-list">';
            for (var m = 0; m < mistakes.length; m++) {
                html += '<li><strong>' + (m+1) + '.</strong> ' + mistakes[m].question + '<br>' +
                         '<span style="color:#2e7d32;">✓ Correct: ' + mistakes[m].correctAnswer + '</span><br>' +
                         '<span style="color:#c62828;">✗ Your answer: ' + mistakes[m].userAnswer + '</span></li>';
            }
            html += '</ul>';
            mistakeList.innerHTML = html;
        }
    }
    
    var resultModal = document.getElementById('resultModal');
    if (resultModal) {
        resultModal.classList.add('active');
    }
    
    isSubmitting = false;
    disableAllNavButtons(false);
}

function renderCurrentQuestion() {
    if (!currentExamQuestions.length || currentIndex >= currentExamQuestions.length) return;
    
    var q = currentExamQuestions[currentIndex];
    var currentAnswer = userAnswers[currentIndex];
    
    var questionText = document.getElementById('questionText');
    if (questionText) {
        questionText.innerHTML = (currentIndex + 1) + ". " + q.text;
    }
    
    var counter = document.getElementById('counter');
    if (counter) {
        counter.innerText = "Question " + (currentIndex + 1) + " / 20";
    }
    
    var optionsContainer = document.getElementById('optionsContainer');
    if (!optionsContainer) return;
    optionsContainer.innerHTML = '';
    
    for (var idx = 0; idx < q.options.length; idx++) {
        var opt = q.options[idx];
        var optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        if (currentAnswer === idx) {
            optionDiv.classList.add('selected');
        }
        
        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'question';
        radio.value = idx;
        radio.checked = (currentAnswer === idx);
        
        radio.addEventListener('change', (function(optIdx) {
            return function() {
                if (!isSubmitting) selectAnswer(currentIndex, optIdx);
            };
        })(idx));
        
        var label = document.createElement('label');
        var letter = String.fromCharCode(65 + idx);
        label.textContent = letter + ". " + opt;
        
        optionDiv.addEventListener('click', (function(optIdx) {
            return function(e) {
                if (e.target.type !== 'radio' && !isSubmitting) {
                    var radioInput = optionDiv.querySelector('input');
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
    }
    
    updateProgress();
}

async function nextQuestion() {
    if (isSubmitting) {
        return;
    }
    
    if (userAnswers[currentIndex] === null) {
        await showCustomAlert("Please answer the current question before proceeding.", "warning");
        return;
    }
    
    if (currentIndex < 18) {
        currentIndex++;
        renderCurrentQuestion();
        return;
    }
    
    if (currentIndex === 18) {
        if (userAnswers[18] !== null) {
            currentIndex = 19;
            renderCurrentQuestion();
        } else {
            await showCustomAlert("Please answer question 19 before proceeding.", "warning");
        }
        return;
    }
    
    if (currentIndex === 19) {
        if (isAllAnswered()) {
            isSubmitting = true;
            disableAllNavButtons(true);
            await showResult();
        } else {
            await showCustomAlert("Please answer all questions before submitting.", "warning");
        }
    }
}

function prevQuestion() {
    if (isSubmitting) return;
    if (currentIndex > 0) {
        currentIndex--;
        renderCurrentQuestion();
    }
}

function restartExam() {
    if (isSubmitting) return;
    
    var resultModal = document.getElementById('resultModal');
    if (resultModal) {
        resultModal.classList.remove('active');
    }
    
    if (typeof resetExamSubmissionFlag === 'function') {
        resetExamSubmissionFlag();
    }
    
    selectExamQuestions();
    currentIndex = 0;
    isSubmitting = false;
    disableAllNavButtons(false);
    renderCurrentQuestion();
}

function exportToExcel() {
    if (isSubmitting) return;
    
    var csvRows = [];
    csvRows.push(['Question', 'Your Answer', 'Correct Answer', 'Result']);
    
    for (var i = 0; i < currentExamQuestions.length; i++) {
        var q = currentExamQuestions[i];
        var userAnswer = userAnswers[i];
        var isCorrect = (userAnswer === q.correct);
        var userAnswerText = userAnswer !== null ? q.options[userAnswer] : 'Not answered';
        var correctAnswerText = q.options[q.correct];
        var result = isCorrect ? 'Correct' : 'Wrong';
        
        csvRows.push([q.text, userAnswerText, correctAnswerText, result]);
    }
    
    var correctCount = 0;
    for (var j = 0; j < currentExamQuestions.length; j++) {
        if (userAnswers[j] === currentExamQuestions[j].correct) correctCount++;
    }
    csvRows.push([]);
    csvRows.push(['Total Score', correctCount + ' / 20', '', '']);
    
    var csvContent = "";
    for (var r = 0; r < csvRows.length; r++) {
        csvContent += csvRows[r].join(',') + "\n";
    }
    
    var blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    var url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', 'exam_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function initExam() {
    if (!collectAllQuestions()) return;
    
    selectExamQuestions();
    renderCurrentQuestion();
    
    var nextBtn = document.getElementById('nextBtn');
    var prevBtn = document.getElementById('prevBtn');
    var restartBtn = document.getElementById('restartBtn');
    var exportBtn = document.getElementById('exportBtn');
    
    if (nextBtn) nextBtn.addEventListener('click', nextQuestion);
    if (prevBtn) prevBtn.addEventListener('click', prevQuestion);
    if (restartBtn) restartBtn.addEventListener('click', restartExam);
    if (exportBtn) exportBtn.addEventListener('click', exportToExcel);
}

document.addEventListener('DOMContentLoaded', initExam);