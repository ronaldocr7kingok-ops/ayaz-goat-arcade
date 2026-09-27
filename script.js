const memorySymbols = ["🎮", "🎲", "🕹️", "👾", "🚀", "⭐", "🎯", "💎"];

const state = {
  memoryCards: [],
  memoryFlipped: [],
  memoryMatched: 0,
  memoryScore: 0,
  reactionTimer: null,
  reactionReady: false,
  reactionStart: 0,
  reactionBest: null,
  guessNumber: null,
  guessTries: 0,
  totalWins: 0,
  bestStreak: 0,
  currentStreak: 0,
};

const memoryBoard = document.getElementById("memoryBoard");
const memoryScoreEl = document.getElementById("memoryScore");
const reactionBtn = document.getElementById("reactionBtn");
const reactionStatus = document.getElementById("reactionStatus");
const reactionScoreEl = document.getElementById("reactionScore");
const guessInput = document.getElementById("guessInput");
const guessBtn = document.getElementById("guessBtn");
const guessStatus = document.getElementById("guessStatus");
const guessScoreEl = document.getElementById("guessScore");
const bestStreakEl = document.getElementById("bestStreak");
const fastestReactionEl = document.getElementById("fastestReaction");
const totalWinsEl = document.getElementById("totalWins");
const leaderboardList = document.getElementById("leaderboardList");

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildMemoryBoard() {
  const symbols = shuffle([...memorySymbols, ...memorySymbols]);
  state.memoryCards = symbols.map((symbol, index) => ({
    id: `${symbol}-${index}`,
    symbol,
    matched: false,
  }));
  state.memoryFlipped = [];
  state.memoryMatched = 0;
  state.memoryScore = 0;
  memoryScoreEl.textContent = "0 pts";

  memoryBoard.innerHTML = "";

  state.memoryCards.forEach((card) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "memory-card";
    button.dataset.symbol = card.symbol;
    button.dataset.id = card.id;
    button.setAttribute("aria-label", "Hidden memory card");
    button.textContent = "?";
    button.addEventListener("click", () => handleMemoryClick(button, card));
    memoryBoard.appendChild(button);
  });
}

function handleMemoryClick(button, card) {
  if (
    state.memoryFlipped.length >= 2 ||
    state.memoryFlipped.some((entry) => entry.id === card.id) ||
    card.matched
  ) {
    return;
  }

  button.classList.add("is-flipped");
  button.textContent = card.symbol;
  state.memoryFlipped.push(card);

  if (state.memoryFlipped.length === 2) {
    const [first, second] = state.memoryFlipped;
    if (first.symbol === second.symbol) {
      first.matched = true;
      second.matched = true;
      state.memoryMatched += 1;
      state.memoryScore += 100;
      memoryScoreEl.textContent = `${state.memoryScore} pts`;
      state.memoryFlipped = [];

      const matchedButtons = [...memoryBoard.querySelectorAll(".memory-card")].filter(
        (node) => node.dataset.symbol === first.symbol
      );

      matchedButtons.forEach((node) => node.classList.add("is-matched"));

      if (state.memoryMatched === memorySymbols.length) {
        state.currentStreak += 1;
        state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
        bestStreakEl.textContent = String(state.bestStreak);
        updateLeaderboard();
      }
    } else {
      setTimeout(() => {
        const allCards = [...memoryBoard.querySelectorAll(".memory-card")];
        allCards.forEach((node) => {
          if (!node.classList.contains("is-matched")) {
            node.textContent = "?";
            node.classList.remove("is-flipped");
          }
        });
        state.memoryFlipped = [];
      }, 600);
    }
  }
}

function updateLeaderboard() {
  const memoryEntry = `Memory master — ${state.memoryScore} pts`;
  const reactionEntry = `Reflex king — ${state.reactionBest ? `${state.reactionBest} ms` : "0 ms"}`;
  const guessEntry = `Lucky guesser — ${state.totalWins} wins`;

  leaderboardList.innerHTML = `
    <li>${memoryEntry}</li>
    <li>${reactionEntry}</li>
    <li>${guessEntry}</li>
  `;
}

function startReactionGame() {
  reactionBtn.disabled = true;
  reactionBtn.classList.add("waiting");
  reactionBtn.classList.remove("ready");
  reactionBtn.textContent = "Wait for green...";
  reactionStatus.textContent = "Keep calm. The signal will appear soon.";
  state.reactionReady = false;

  const delay = 1200 + Math.random() * 2800;
  state.reactionTimer = setTimeout(() => {
    state.reactionReady = true;
    state.reactionStart = performance.now();
    reactionBtn.classList.remove("waiting");
    reactionBtn.classList.add("ready");
    reactionBtn.textContent = "CLICK!";
    reactionStatus.textContent = "Now!";
    reactionBtn.disabled = false;
  }, delay);
}

function endReactionGame() {
  if (!state.reactionReady || !state.reactionStart) {
    clearTimeout(state.reactionTimer);
    reactionBtn.disabled = false;
    reactionBtn.classList.remove("waiting", "ready");
    reactionBtn.textContent = "Press to start";
    reactionStatus.textContent = "Too soon. Try again.";
    state.reactionReady = false;
    return;
  }

  const elapsed = Math.round(performance.now() - state.reactionStart);
  state.reactionBest = state.reactionBest === null ? elapsed : Math.min(state.reactionBest, elapsed);
  reactionScoreEl.textContent = `${elapsed} ms`;
  fastestReactionEl.textContent = `${state.reactionBest} ms`;
  reactionStatus.textContent = `You reacted in ${elapsed} milliseconds.`;
  reactionBtn.classList.remove("waiting", "ready");
  reactionBtn.textContent = "Press to start";
  state.reactionReady = false;
  state.reactionStart = 0;
  updateLeaderboard();
}

function setupGuessGame() {
  state.guessNumber = Math.floor(Math.random() * 100) + 1;
  state.guessTries = 0;
  guessStatus.textContent = "A mystery number is waiting.";
  guessInput.value = "";
  guessInput.focus();
}

function handleGuess() {
  if (state.guessNumber === null) {
    setupGuessGame();
  }

  const value = Number(guessInput.value);
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    guessStatus.textContent = "Enter a whole number between 1 and 100.";
    return;
  }

  state.guessTries += 1;
  guessScoreEl.textContent = `${state.guessTries} tries`;

  if (value === state.guessNumber) {
    state.totalWins += 1;
    totalWinsEl.textContent = String(state.totalWins);
    guessStatus.textContent = `Correct! ${state.guessNumber} was the secret number. You solved it in ${state.guessTries} tries.`;
    updateLeaderboard();
    setupGuessGame();
    return;
  }

  guessStatus.textContent = value < state.guessNumber ? "Too low. Try higher." : "Too high. Try lower.";
  guessInput.value = "";
  guessInput.focus();
}

reactionBtn.addEventListener("click", () => {
  if (state.reactionReady) {
    endReactionGame();
    return;
  }
  startReactionGame();
});

guessBtn.addEventListener("click", handleGuess);
guessInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleGuess();
  }
});

document.getElementById("memoryResetBtn").addEventListener("click", buildMemoryBoard);
document.getElementById("resetAllBtn").addEventListener("click", () => {
  buildMemoryBoard();
  reactionBtn.classList.remove("waiting", "ready");
  reactionBtn.textContent = "Press to start";
  reactionStatus.textContent = "Wait for the green signal.";
  reactionBtn.disabled = false;
  state.reactionReady = false;
  state.reactionStart = 0;
  setupGuessGame();
  state.currentStreak = 0;
  bestStreakEl.textContent = String(state.bestStreak);
  updateLeaderboard();
});

buildMemoryBoard();
setupGuessGame();
updateLeaderboard();
bestStreakEl.textContent = "0";
totalWinsEl.textContent = "0";
fastestReactionEl.textContent = "--";
guessScoreEl.textContent = "0 tries";
memoryScoreEl.textContent = "0 pts";
reactionScoreEl.textContent = "0 ms";

