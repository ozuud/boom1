const firebaseConfig = {
  apiKey: "AIza....",
  authDomain: "fawaz-211f3.firebaseapp.com",
  databaseURL: "https://fawaz-211f3-default-rtdb.firebaseio.com",
  projectId: "fawaz-211f3",
  storageBucket: "fawaz-211f3.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdefgh"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const urlParams = new URLSearchParams(window.location.search),
      userKey = urlParams.get("key"),
      masterKey = "ABCD1234",
      isLeader = userKey === masterKey;

let teams = [], scores = [], currentTeamIndex = 0,
    opened = new Array(50).fill(false), lockedIndexes = new Set(),
    itemPool = [], currentRoundScore = 0,
    turnData = { numbers: new Set(), colors: new Set() },
    gameColors = ["#e74c3c", "#2ecc71", "#3498db", "#f1c40f", "#8d6e63"],
    revealedValues = [];

const qs = id => document.getElementById(id);

qs("go-home").onclick =
qs("in-game-home").onclick =
qs("back-to-home").onclick = goToHome;

qs("next-button").onclick = () => {
  qs("team-count-section").style.display = "none";
  generateTeamInputs();
  qs("back-to-home").style.display = "inline-block";
};

function generateTeamInputs() {
  const count = parseInt(qs("team-count").value), container = qs("team-inputs");
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const input = document.createElement("input");
    input.placeholder = `اسم الفريق ${i + 1}`;
    input.id = `team-name-${i}`;
    input.style.margin = "5px";
    container.appendChild(input);
  }
  if (isLeader) qs("start-game").style.display = "inline-block";
}

qs("start-game")?.addEventListener("click", () => {
  if (!isLeader) return;
  const count = parseInt(qs("team-count").value);
  teams = []; scores = [];
  for (let i = 0; i < count; i++) {
    const name = qs(`team-name-${i}`).value.trim();
    teams.push(name || `فريق ${i + 1}`);
    scores.push(0);
  }
  startGame();
});

function startGame() {
  qs("setup-screen").style.display = "none";
  qs("game-screen").style.display = "block";
  qs("in-game-home").style.display = "inline-block";
  createItemPool();
  setupBoard();
  updateScoreBoard();
  resetTurnData();
  currentRoundScore = 0;
  syncToFirebase();
}

function createItemPool() {
  itemPool = [];
  for (let i = 0; i < 3; i++) itemPool.push("💣");
  for (let i = 0; i < 2; i++) itemPool.push("x2", "x3");
  for (let i = 0; i < 43; i++) itemPool.push(Math.floor(Math.random() * 9 + 1));
  itemPool.sort(() => Math.random() - 0.5);
}

function setupBoard() {
  const board = qs("board");
  board.innerHTML = "";
  for (let i = 0; i < 50; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.textContent = i + 1;
    cell.dataset.index = i;
    board.appendChild(cell);
  }
  board.addEventListener("click", onCellClick);
  qs("nextTurn").onclick = () => {
    if (!isLeader) return;
    lockOpenedCells();
    scores[currentTeamIndex] += currentRoundScore;
    currentRoundScore = 0;
    currentTeamIndex = (currentTeamIndex + 1) % teams.length;
    resetTurnData();
    updateScoreBoard();
    syncToFirebase();
  };
}

function onCellClick(e) {
  const cell = e.target;
  if (!cell.classList.contains("cell") || !isLeader) return;
  const index = +cell.dataset.index;
  if (opened[index] || lockedIndexes.has(index)) return;

  opened[index] = true;
  const item = itemPool.shift();
  let number = null, color = null, reset = false;

  revealedValues[index] = item;

  if (item === "💣") {
    cell.textContent = item;
    cell.style.backgroundColor = "#fff";
    cell.style.color = "#000";
    currentRoundScore = 0;
    reset = true;
  } else if (item === "x2" || item === "x3") {
    cell.textContent = item;
    cell.style.backgroundColor = "#fff";
    cell.style.color = "#000";
    currentRoundScore *= item === "x2" ? 2 : 3;
  } else {
    number = item;
    color = gameColors[Math.floor(Math.random() * gameColors.length)];
    cell.textContent = item;
    cell.style.backgroundColor = color;
    cell.style.color = "#1f1f3a";
    currentRoundScore += +item;
  }

  if (number !== null && turnData.numbers.has(number)) reset = true;
  if (color !== null && turnData.colors.has(color)) reset = true;

  if (number !== null) turnData.numbers.add(number);
  if (color !== null) turnData.colors.add(color);

  updateScoreBoard();

  if (opened.every(Boolean)) {
    showResults();
  } else if (reset) {
    disableBoardTemporarily();
    setTimeout(() => {
      lockOpenedCells();
      scores[currentTeamIndex] += currentRoundScore;
      currentRoundScore = 0;
      currentTeamIndex = (currentTeamIndex + 1) % teams.length;
      resetTurnData();
      updateScoreBoard();
      syncToFirebase();
    }, 1000);
  }

  syncToFirebase();
}

function renderBoardState() {
  document.querySelectorAll(".cell").forEach((cell, index) => {
    if (opened[index]) {
      const value = revealedValues?.[index] ?? index + 1;
      cell.textContent = value;
      cell.style.backgroundColor = lockedIndexes.has(index) ? "#2b2b4d" : "#ccc";
      cell.style.color = "#e2e2e2";
      cell.style.opacity = lockedIndexes.has(index) ? "0.55" : "1";
      cell.style.pointerEvents = "none";
    } else {
      cell.textContent = index + 1;
      cell.style.backgroundColor = "#3b3b5d";
      cell.style.color = "#e2e2e2";
      cell.style.opacity = "1";
      cell.style.pointerEvents = "auto";
    }
  });
}

function syncToFirebase() {
  const gameData = {
    teams,
    scores,
    currentTeamIndex,
    currentRoundScore,
    opened,
    locked: Array.from(lockedIndexes),
    revealedValues: revealedValues
  };
  db.ref("boom_live_game").set(gameData);
}

function disableBoardTemporarily() {
  document.querySelectorAll(".cell").forEach(cell => cell.style.pointerEvents = "none");
}

function lockOpenedCells() {
  document.querySelectorAll(".cell").forEach((cell, index) => {
    if (opened[index] && !lockedIndexes.has(index)) {
      lockedIndexes.add(index);
      setTimeout(() => {
        cell.textContent = index + 1;
        cell.style.backgroundColor = "#2b2b4d";
        cell.style.color = "#e2e2e2";
        cell.style.opacity = "0.55";
        cell.style.pointerEvents = "none";
      }, 700);
    }
  });

  setTimeout(() => {
    document.querySelectorAll(".cell").forEach((cell, index) => {
      if (!lockedIndexes.has(index)) cell.style.pointerEvents = "auto";
    });
  }, 710);
}

function resetTurnData() {
  turnData = { numbers: new Set(), colors: new Set() };
}

function updateScoreBoard() {
  const board = qs("score-board");
  board.innerHTML = "";
  teams.forEach((team, i) => {
    const div = document.createElement("div");
    div.className = "team" + (i === currentTeamIndex ? " active" : "");
    div.innerHTML = `${team}<br> 🔴 السكور: ${scores[i]}`;
    if (i === currentTeamIndex) div.innerHTML += `<br> 🔵 سكور الجولة: ${currentRoundScore}`;
    board.appendChild(div);
  });
}

function showResults() {
  qs("game-screen").style.display = "none";
  qs("result-screen").style.display = "block";
  const sorted = teams.map((name, i) => ({ name, score: scores[i] }))
                      .sort((a, b) => b.score - a.score);
  const results = qs("final-results");
  results.innerHTML = "";
  sorted.forEach((team, i) => {
    const div = document.createElement("div");
    div.textContent = `${i + 1}. ${team.name} - ${team.score} نقطة`;
    results.appendChild(div);
  });
}

function goToHome() {
  teams = []; scores = [];
  opened = new Array(50).fill(false); lockedIndexes.clear();
  itemPool = []; currentRoundScore = 0;
  resetTurnData();
  revealedValues = [];

  qs("setup-screen").style.display = "block";
  qs("game-screen").style.display = "none";
  qs("result-screen").style.display = "none";
  qs("team-count").value = 2;
  qs("team-inputs").innerHTML = "";
  qs("start-game").style.display = "none";
  qs("board").innerHTML = "";
  qs("final-results").innerHTML = "";
  qs("in-game-home").style.display = "none";
  qs("back-to-home").style.display = "none";
  qs("team-count-section").style.display = "block";
}

// بث مباشر للمشاهد
if (!isLeader) {
  db.ref("boom_live_game").on("value", snapshot => {
    const data = snapshot.val();
    if (!data) return;
    teams = data.teams;
    scores = data.scores;
    currentTeamIndex = data.currentTeamIndex;
    currentRoundScore = data.currentRoundScore;
    opened = data.opened;
    lockedIndexes = new Set(data.locked);
    revealedValues = data.revealedValues || [];

    if (!qs("game-screen").style.display || qs("setup-screen").style.display !== "none") {
      qs("setup-screen").style.display = "none";
      qs("game-screen").style.display = "block";
    }

    renderBoardState();
    updateScoreBoard();
  });
}
