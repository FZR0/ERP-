const MODES = {
  normal: { label: "普通 50 題", size: 50 },
  exam: { label: "正式考試 70 題", size: 70 },
  all: { label: "全部題庫", size: null },
};

const els = {
  timer: document.querySelector("#timer"),
  startScreen: document.querySelector("#start-screen"),
  quizScreen: document.querySelector("#quiz-screen"),
  resultScreen: document.querySelector("#result-screen"),
  loadStatus: document.querySelector("#load-status"),
  allCount: document.querySelector("#all-count"),
  modeLabel: document.querySelector("#mode-label"),
  progressLabel: document.querySelector("#progress-label"),
  sourceLabel: document.querySelector("#source-label"),
  pageLabel: document.querySelector("#page-label"),
  questionText: document.querySelector("#question-text"),
  options: document.querySelector("#options"),
  feedback: document.querySelector("#feedback"),
  submitAnswer: document.querySelector("#submit-answer"),
  nextQuestion: document.querySelector("#next-question"),
  restartFromQuiz: document.querySelector("#restart-from-quiz"),
  restartFromResult: document.querySelector("#restart-from-result"),
  themeToggle: document.querySelector("#theme-toggle"),
  resultTitle: document.querySelector("#result-title"),
  scoreLabel: document.querySelector("#score-label"),
  accuracyLabel: document.querySelector("#accuracy-label"),
  elapsedLabel: document.querySelector("#elapsed-label"),
};

let bank = [];
let timerId = null;
let state = null;

function showScreen(screen) {
  for (const item of [els.startScreen, els.quizScreen, els.resultScreen]) {
    item.classList.toggle("is-active", item === screen);
  }
  document.body.classList.toggle("is-quiz-active", screen === els.quizScreen);
}

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function updateTimer() {
  if (!state) {
    els.timer.textContent = "00:00:00";
    return;
  }
  const seconds = Math.floor((Date.now() - state.startedAt) / 1000);
  els.timer.textContent = formatTime(seconds);
}

function startTimer() {
  stopTimer();
  updateTimer();
  timerId = window.setInterval(updateTimer, 1000);
}

function stopTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function startMode(modeKey) {
  const mode = MODES[modeKey];
  const shuffled = shuffle(bank);
  const questions = mode.size ? shuffled.slice(0, mode.size) : shuffled;

  state = {
    modeKey,
    modeLabel: mode.label,
    questions,
    currentIndex: 0,
    selectedAnswer: "",
    submitted: false,
    correctCount: 0,
    startedAt: Date.now(),
    finishedSeconds: 0,
  };

  showScreen(els.quizScreen);
  startTimer();
  renderQuestion();
}

function currentQuestion() {
  return state.questions[state.currentIndex];
}

function renderQuestion() {
  const question = currentQuestion();
  state.selectedAnswer = "";
  state.submitted = false;

  els.modeLabel.textContent = state.modeLabel;
  els.progressLabel.textContent = `第 ${state.currentIndex + 1} / ${state.questions.length} 題`;
  els.sourceLabel.textContent = `原題號 ${question.sourceNumber}${question.occurrence > 1 ? `（重複 ${question.occurrence}）` : ""}`;
  els.pageLabel.textContent = `PDF 第 ${question.sourcePage} 頁`;
  els.questionText.textContent = question.question;
  els.feedback.hidden = true;
  els.feedback.className = "feedback";
  els.feedback.textContent = "";
  els.submitAnswer.hidden = false;
  els.submitAnswer.disabled = true;
  els.nextQuestion.hidden = true;

  els.options.replaceChildren();
  for (const option of question.options) {
    const label = document.createElement("label");
    label.className = "option";
    label.dataset.key = option.key;

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "answer";
    input.value = option.key;
    input.addEventListener("change", () => {
      state.selectedAnswer = option.key;
      els.submitAnswer.disabled = false;
    });

    const text = document.createElement("span");
    text.textContent = `${option.key}. ${option.text}`;

    label.append(input, text);
    els.options.append(label);
  }
}

function submitAnswer() {
  if (!state.selectedAnswer || state.submitted) return;

  const question = currentQuestion();
  const isCorrect = state.selectedAnswer === question.answer;
  state.submitted = true;
  if (isCorrect) state.correctCount += 1;

  for (const option of els.options.querySelectorAll(".option")) {
    const input = option.querySelector("input");
    input.disabled = true;
    if (option.dataset.key === question.answer) {
      option.classList.add("is-correct");
    }
    if (!isCorrect && option.dataset.key === state.selectedAnswer) {
      option.classList.add("is-wrong");
    }
  }

  els.feedback.hidden = false;
  els.feedback.classList.add(isCorrect ? "good" : "bad");
  els.feedback.textContent = isCorrect ? "回答正確" : `回答錯誤，正確答案是 ${question.answer}`;
  els.submitAnswer.hidden = true;
  els.nextQuestion.hidden = false;
}

function nextQuestion() {
  if (state.currentIndex + 1 >= state.questions.length) {
    finishQuiz();
    return;
  }
  state.currentIndex += 1;
  renderQuestion();
}

function finishQuiz() {
  stopTimer();
  state.finishedSeconds = Math.floor((Date.now() - state.startedAt) / 1000);
  const total = state.questions.length;
  const accuracy = total ? Math.round((state.correctCount / total) * 100) : 0;

  els.timer.textContent = formatTime(state.finishedSeconds);
  els.resultTitle.textContent = state.modeLabel;
  els.scoreLabel.textContent = `${state.correctCount} / ${total}`;
  els.accuracyLabel.textContent = `${accuracy}%`;
  els.elapsedLabel.textContent = formatTime(state.finishedSeconds);
  showScreen(els.resultScreen);
}

function resetToStart() {
  stopTimer();
  state = null;
  updateTimer();
  showScreen(els.startScreen);
}

function applyTheme(theme) {
  const nextTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = nextTheme;
  els.themeToggle.textContent = nextTheme === "dark" ? "淺色" : "深色";
  els.themeToggle.setAttribute("aria-pressed", String(nextTheme === "dark"));
  try {
    localStorage.setItem("erp-theme", nextTheme);
  } catch {
    // Local files can run in restricted browser contexts; the visual state still applies.
  }
}

function setupThemeToggle() {
  const currentTheme = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  applyTheme(currentTheme);
  els.themeToggle.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
}

function loadQuestions() {
  try {
    const payload = window.ERP_QUESTION_BANK;
    bank = payload?.questions ?? [];
    if (!bank.length) throw new Error("empty bank");

    els.allCount.textContent = `${bank.length} 題`;
    els.loadStatus.textContent = `題庫 ${bank.length} 題`;
    for (const button of document.querySelectorAll("[data-mode]")) {
      button.disabled = false;
    }
  } catch (error) {
    els.loadStatus.textContent = "題庫讀取失敗，請確認 questions-data.js 與 index.html 在同一資料夾";
    for (const button of document.querySelectorAll("[data-mode]")) {
      button.disabled = true;
    }
  }
}

for (const button of document.querySelectorAll("[data-mode]")) {
  button.disabled = true;
  button.addEventListener("click", () => startMode(button.dataset.mode));
}

els.submitAnswer.addEventListener("click", submitAnswer);
els.nextQuestion.addEventListener("click", nextQuestion);
els.restartFromQuiz.addEventListener("click", resetToStart);
els.restartFromResult.addEventListener("click", resetToStart);

setupThemeToggle();
loadQuestions();
