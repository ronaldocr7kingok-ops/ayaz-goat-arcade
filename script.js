const STORAGE_KEY = 'ayazArcadeStats';
const PROFILE_KEY = 'ayazArcadeProfile';
const defaults = {
  memoryBest: 0,
  reactionBest: null,
  totalWins: 0,
  bestStreak: 0,
  combo: 1,
  playerName: 'Ayaz Rider',
};

const state = {
  ...defaults,
  memoryCards: [],
  flipped: [],
  matched: 0,
  score: 0,
  guessNumber: null,
  guessTries: 0,
  reactionTimer: null,
  reactionReady: false,
  reactionStart: 0,
  sound: true,
};

const $ = (id) => document.getElementById(id);
const els = {
  board: $('memoryBoard'),
  memoryScore: $('memoryScore'),
  memoryStatus: $('memoryStatus'),
  reaction: $('reactionBtn'),
  reactionStatus: $('reactionStatus'),
  reactionScore: $('reactionScore'),
  guessInput: $('guessInput'),
  guessBtn: $('guessBtn'),
  guessStatus: $('guessStatus'),
  guessScore: $('guessScore'),
  streak: $('bestStreak'),
  topScore: $('topScore'),
  playerNameInput: $('playerNameInput'),
  playerNameLabel: $('playerNameLabel'),
  comboMeter: $('comboMeter'),
  toast: $('toast'),
  soundBtn: $('soundBtn'),
  themeBtn: $('themeBtn'),
  saveNameBtn: $('saveNameBtn'),
  logList: $('gameLogList'),
};

let toastTimer = null;
const logEntries = [];

function safeStorageRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveState() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        memoryBest: state.memoryBest,
        reactionBest: state.reactionBest,
        totalWins: state.totalWins,
        bestStreak: state.bestStreak,
        combo: state.combo,
      })
    );
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ playerName: state.playerName }));
  } catch (error) {
    // ignore localStorage errors silently in privacy-restricted browsers
  }
}

function loadState() {
  const saved = safeStorageRead(STORAGE_KEY, {});
  const profile = safeStorageRead(PROFILE_KEY, {});

  state.memoryBest = saved.memoryBest ?? defaults.memoryBest;
  state.reactionBest = saved.reactionBest ?? defaults.reactionBest;
  state.totalWins = saved.totalWins ?? defaults.totalWins;
  state.bestStreak = saved.bestStreak ?? defaults.bestStreak;
  state.combo = saved.combo ?? defaults.combo;
  state.playerName = profile.playerName || defaults.playerName;
  state.sound = localStorage.getItem('ayazSound') !== 'off';
}

function renderProfile() {
  els.playerNameInput.value = state.playerName;
  els.playerNameLabel.textContent = state.playerName;
  els.comboMeter.textContent = `x${state.combo}`;
  els.streak.textContent = String(state.bestStreak);
  els.topScore.textContent = String(state.memoryBest);
  els.soundBtn.textContent = state.sound ? '🔊' : '🔇';
  document.body.classList.toggle('light-mode', localStorage.getItem('ayazTheme') === 'light');
  els.themeBtn.textContent = document.body.classList.contains('light-mode') ? '🌙' : '☀️';
}

function renderLeaderboard() {
  const memoryLine = `Memory master — ${state.memoryBest} pts`;
  const reactionLine = `Reflex king — ${state.reactionBest ?? 0} ms`;
  const guessLine = `Lucky guesser — ${state.totalWins} wins`;
  els.leaderboardList.innerHTML = `<li>${memoryLine}</li><li>${reactionLine}</li><li>${guessLine}</li>`;
}

function renderLog() {
  els.logList.innerHTML = logEntries
    .slice(0, 8)
    .map(
      (entry) =>
        `<li data-tone="${entry.tone}"><strong>${entry.message}</strong><span>${entry.time}</span></li>`
    )
    .join('');
}

function logEvent(message, tone = 'good') {
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  logEntries.unshift({ message, tone, time });
  if (logEntries.length > 8) logEntries.pop();
  renderLog();
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2000);
}

function beep(frequency = 540, duration = 0.08) {
  if (!state.sound) return;

  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = frequency;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (error) {
    // ignore audio errors for unsupported browsers
  }
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildMemoryBoard() {
  const cards = shuffle([...['🎮', '🎲', '🕹️', '👾', '🚀', '⭐', '🎯', '💎'], ...['🎮', '🎲', '🕹️', '👾', '🚀', '⭐', '🎯', '💎']]);
  state.memoryCards = cards.map((symbol, index) => ({ id: `${symbol}-${index}`, symbol, matched: false }));
  state.flipped = [];
  state.matched = 0;
  state.score = 0;
  els.memoryScore.textContent = '0 pts';
  els.memoryStatus.textContent = 'Find all 8 pairs with as few flips as possible.';
  els.memoryStatus.className = 'status-text';
  els.board.innerHTML = '';

  state.memoryCards.forEach((card) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'memory-card';
    button.textContent = '?';
    button.setAttribute('aria-label', 'Hidden memory card');
    button.addEventListener('click', () => handleMemoryClick(card, button));
    els.board.appendChild(button);
  });
}

function handleMemoryClick(card, button) {
  if (state.flipped.length >= 2 || state.flipped.some((item) => item.id === card.id) || card.matched) {
    return;
  }

  button.classList.add('is-flipped');
  button.textContent = card.symbol;
  state.flipped.push(card);
  beep(420);

  if (state.flipped.length < 2) return;

  const [first, second] = state.flipped;

  if (first.symbol === second.symbol) {
    first.matched = true;
    second.matched = true;
    state.matched += 1;
    state.score += 100 * state.combo;
    state.combo = Math.min(state.combo + 1, 5);
    els.memoryScore.textContent = `${state.score} pts`;
    els.comboMeter.textContent = `x${state.combo}`;
    els.memoryStatus.textContent = 'Nice match! Keep the streak alive.';
    state.flipped = [];

    [...els.board.children].filter((item) => item.textContent === first.symbol).forEach((item) => {
      item.classList.add('is-matched');
    });

    if (state.matched === 8) {
      state.memoryBest = Math.max(state.memoryBest, state.score);
      state.bestStreak += 1;
      state.totalWins += 1;
      toast('Memory board cleared!');
      logEvent('Memory board cleared for 700+ points.', 'good');
      els.memoryStatus.textContent = 'Board cleared! Epic memory run.';
      els.memoryStatus.className = 'status-text success';
      saveState();
      renderLeaderboard();
      renderProfile();
      return;
    }

    logEvent('Memory match found. Combo rising.', 'good');
    beep(680);
    saveState();
    renderProfile();
    return;
  }

  state.combo = 1;
  els.comboMeter.textContent = `x${state.combo}`;
  els.memoryStatus.textContent = 'Not a match — reset and try again.';
  logEvent('Memory miss. Reset and try the board again.', 'alert');
  setTimeout(() => {
    [...els.board.children].forEach((item) => {
      if (!item.classList.contains('is-matched')) {
        item.textContent = '?';
        item.classList.remove('is-flipped');
      }
    });
    state.flipped = [];
  }, 600);

  beep(220, 0.1);
  saveState();
  renderProfile();
}

function startReactionGame() {
  els.reaction.disabled = true;
  els.reaction.classList.add('waiting');
  els.reaction.classList.remove('ready');
  els.reaction.textContent = 'Wait for green...';
  els.reactionStatus.textContent = 'Stay focused — do not click early.';
  els.reactionStatus.className = 'status-text';
  state.reactionReady = false;

  const delay = 1000 + Math.random() * 2500;
  state.reactionTimer = setTimeout(() => {
    state.reactionReady = true;
    state.reactionStart = performance.now();
    els.reaction.disabled = false;
    els.reaction.classList.remove('waiting');
    els.reaction.classList.add('ready');
    els.reaction.textContent = 'CLICK!';
    els.reactionStatus.textContent = 'Now!';
    beep(820, 0.08);
  }, delay);
}

function endReactionGame() {
  if (!state.reactionReady || !state.reactionStart) {
    clearTimeout(state.reactionTimer);
    els.reaction.disabled = false;
    els.reaction.classList.remove('waiting', 'ready');
    els.reaction.textContent = 'Press to start';
    els.reactionStatus.textContent = 'Too soon. Try again.';
    els.reactionStatus.className = 'status-text danger';
    logEvent('Reaction test was too early. Reset and try again.', 'alert');
    state.reactionReady = false;
    return;
  }

  const elapsed = Math.round(performance.now() - state.reactionStart);
  state.reactionBest = state.reactionBest === null ? elapsed : Math.min(state.reactionBest, elapsed);
  state.combo = Math.max(1, Math.min(5, Math.ceil(1000 / Math.max(elapsed, 80))));
  els.reactionScore.textContent = `${elapsed} ms`;
  els.comboMeter.textContent = `x${state.combo}`;
  els.reactionStatus.textContent = `${elapsed} ms — ${elapsed < 300 ? 'Lightning fast!' : 'Good reflexes!'}`;
  els.reactionStatus.className = 'status-text success';
  els.reaction.classList.remove('waiting', 'ready');
  els.reaction.textContent = 'Press to start';
  logEvent(`Reaction time logged: ${elapsed} ms.`, 'good');
  state.reactionReady = false;
  state.reactionStart = 0;
  saveState();
  renderProfile();
  renderLeaderboard();
  beep(760, 0.12);
}

function setupGuessGame() {
  state.guessNumber = Math.floor(Math.random() * 100) + 1;
  state.guessTries = 0;
  els.guessStatus.textContent = 'A mystery number is waiting.';
  els.guessStatus.className = 'status-text';
  els.guessInput.value = '';
  els.guessScore.textContent = '0 tries';
}

function handleGuess() {
  if (state.guessNumber === null) {
    setupGuessGame();
  }

  const value = Number(els.guessInput.value);
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    els.guessStatus.textContent = 'Enter a whole number between 1 and 100.';
    els.guessStatus.className = 'status-text danger';
    logEvent('Guess input invalid. Enter a number from 1 to 100.', 'alert');
    return;
  }

  state.guessTries += 1;
  els.guessScore.textContent = `${state.guessTries} tries`;

  if (value === state.guessNumber) {
    state.totalWins += 1;
    state.bestStreak += 1;
    state.combo = Math.min(state.combo + 1, 5);
    els.comboMeter.textContent = `x${state.combo}`;
    els.guessStatus.textContent = `Correct! ${state.guessNumber} was the secret number.`;
    els.guessStatus.className = 'status-text success';
    logEvent(`Secret number cracked: ${state.guessNumber}.`, 'good');
    toast('Secret number solved!');
    beep(900, 0.14);
    saveState();
    renderProfile();
    renderLeaderboard();
    setTimeout(setupGuessGame, 1200);
    return;
  }

  els.guessStatus.textContent = value < state.guessNumber ? 'Too low. Try higher.' : 'Too high. Try lower.';
  els.guessStatus.className = 'status-text';
  els.guessInput.value = '';
  els.guessInput.focus();
  logEvent('Guess attempt missed. New clue loaded.', 'alert');
  beep(250, 0.07);
}

function updatePlayerName() {
  const name = els.playerNameInput.value.trim() || defaults.playerName;
  state.playerName = name;
  els.playerNameLabel.textContent = state.playerName;
  saveState();
  renderProfile();
  logEvent(`${state.playerName} saved to the arcade profile.`, 'good');
  toast(`Profile saved for ${state.playerName}`);
}

function resetSession() {
  clearTimeout(state.reactionTimer);
  state.memoryBest = 0;
  state.reactionBest = null;
  state.totalWins = 0;
  state.bestStreak = 0;
  state.combo = 1;
  state.score = 0;
  state.guessNumber = null;
  state.guessTries = 0;
  state.reactionReady = false;
  state.reactionStart = 0;
  buildMemoryBoard();
  setupGuessGame();
  els.reaction.disabled = false;
  els.reaction.classList.remove('waiting', 'ready');
  els.reaction.textContent = 'Press to start';
  els.reactionStatus.textContent = 'Wait for the green signal.';
  els.reactionStatus.className = 'status-text';
  logEvent('Session reset. Fresh run started.', 'alert');
  saveState();
  renderProfile();
  renderLeaderboard();
  toast('Session reset');
}

els.reaction.addEventListener('click', () => {
  if (state.reactionReady) {
    endReactionGame();
    return;
  }
  startReactionGame();
});

els.guessBtn.addEventListener('click', handleGuess);
els.guessInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') handleGuess();
});

$('memoryResetBtn').addEventListener('click', () => {
  buildMemoryBoard();
  logEvent('Memory board reshuffled.', 'good');
});
$('resetAllBtn').addEventListener('click', resetSession);
els.saveNameBtn.addEventListener('click', updatePlayerName);
els.playerNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') updatePlayerName();
});

els.soundBtn.addEventListener('click', () => {
  state.sound = !state.sound;
  localStorage.setItem('ayazSound', state.sound ? 'on' : 'off');
  els.soundBtn.textContent = state.sound ? '🔊' : '🔇';
  logEvent(state.sound ? 'Sound enabled.' : 'Sound muted.', 'good');
  toast(state.sound ? 'Sound on' : 'Sound off');
});

els.themeBtn.addEventListener('click', () => {
  const nextMode = !document.body.classList.contains('light-mode');
  document.body.classList.toggle('light-mode', nextMode);
  localStorage.setItem('ayazTheme', nextMode ? 'light' : 'dark');
  els.themeBtn.textContent = nextMode ? '🌙' : '☀️';
  logEvent(nextMode ? 'Light mode enabled.' : 'Dark mode enabled.', 'good');
});

loadState();
renderProfile();
renderLeaderboard();
logEvent('Arcade booted. Ready for the next run.', 'good');
buildMemoryBoard();
setupGuessGame();
