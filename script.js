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
    opened = Array(50).fill(false),
    locked = new Set(),
    revealedValues = Array(50).fill(""),
    itemPool = [],
    currentRoundScore = 0,
    gameColors = ["#e74c3c", "#2ecc71", "#3498db", "#f1c40f", "#8d6e63"],
    turnData = { numbers: new Set(), colors: new Set() };

const qs = id => document.getElementById(id);

qs("go-home").onclick = qs("in-game-home").onclick = qs("back-to-home").onclick = goToHome;
qs("next-button").onclick = () => {
  qs("team-count-section").style.display = "none";
  generateTeamInputs();
  qs("back-to-home").style.display = "inline-block";
};

function generateTeamInputs() {
  const count = parseInt(qs("team-count").value);
  const container = qs("team-inputs");
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const input = document.createElement("input");
    input.placeholder = `اسم الفريق ${i + 1}`;
    input.id = `team-name-${i}`;
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
  generateItems();
  renderBoard();
  updateScoreBoard();
  syncGame();
}

function generateItems() {
  itemPool = [];
  for (let i = 0; i < 3; i++) itemPool.push("💣");
  itemPool.push("x2", "x3");
  for (let i = 0; i < 45; i++) itemPool.push(Math.floor(Math.random() * 9 + 1));
  itemPool.sort(() => Math.random() - 0.5);
}

function renderBoard() {
  const board = qs("board");
  board.innerHTML = "";
  for (let i = 0; i < 50; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.index = i;
    cell.textContent = i + 1;
    board.appendChild(cell);
  }
  board.onclick = onCellClick;
  qs("nextTurn").onclick = nextTurn;
}

function onCellClick(e) {
  if (!isLeader) return;
  const cell = e.target;
  if (!cell.classList.contains("cell")) return;
  const index = +cell.dataset.index;
  if (opened[index] || locked.has(index)) return;

  const item = itemPool.shift();
  opened[index] = true;
  revealedValues[index] = item;

  let number = null, color = null, reset = false;

  if (item === "💣") {
    cell.textContent = "💣";
    cell.style.backgroundColor = "#fff";
    cell.style.color = "#000";
    currentRoundScore = 0;
    reset = true;
  } else if (item === "x2" || item === "x3") {
    cell.textContent = item;
    cell.style.backgroundColor = "#fff";
    cell.style.color = "#000";
    currentRoundScore *= (item === "x2") ? 2 : 3;
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

  if (number) turnData.numbers.add(number);
  if (color) turnData.colors.add(color);

  updateScoreBoard();
  syncGame();

  if (reset) {
    setTimeout(nextTurn, 1000);
  }
}

function nextTurn() {
  if (!isLeader) return;
  lockOpenedCells();
  scores[currentTeamIndex] += currentRoundScore;
  currentRoundScore = 0;
  currentTeamIndex = (currentTeamIndex + 1) % teams.length;
  turnData = { numbers: new Set(), colors: new Set() };
  updateScoreBoard();
  syncGame();
}

function lockOpenedCells() {
  document.querySelectorAll(".cell").forEach((cell, i) => {
    if (opened[i] && !locked.has(i)) {
      locked.add(i);
      cell.style.opacity = "0.55";
      cell.style.pointerEvents = "none";
    }
  });
}

function updateScoreBoard() {
  const board = qs("score-board");
  board.innerHTML = "";
  teams.forEach((team, i) => {
    const div = document.createElement("div");
    div.className = "team" + (i === currentTeamIndex ? " active" : "");
    div.innerHTML = `${team}<br> 🔴 السكور: ${scores[i]}`;
    if (i === currentTeamIndex) div.innerHTML += `<br> 🔵 جولة: ${currentRoundScore}`;
    board.appendChild(div);
  });
}

function syncGame() {
  db.ref("boom_live_game").set({
    teams,
    scores,
    currentTeamIndex,
    currentRoundScore,
    opened,
    locked: Array.from(locked),
    revealedValues
  });
}

function goToHome() {
  teams = []; scores = [];
  currentTeamIndex = 0;
  opened = Array(50).fill(false);
  locked.clear();
  revealedValues = Array(50).fill("");
  currentRoundScore = 0;
  turnData = { numbers: new Set(), colors: new Set() };
  qs("setup-screen").style.display = "block";
  qs("game-screen").style.display = "none";
  qs("result-screen").style.display = "none";
  qs("team-count").value = 2;
  qs("team-inputs").innerHTML = "";
  qs("start-game").style.display = "none";
}

// بث حي للمشاهدين
if (!isLeader) {
  db.ref("boom_live_game").on("value", snapshot => {
    const data = snapshot.val();
    if (!data) return;
    teams = data.teams;
    scores = data.scores;
    currentTeamIndex = data.currentTeamIndex;
    currentRoundScore = data.currentRoundScore;
    opened = data.opened;
    locked = new Set(data.locked);
    revealedValues = data.revealedValues;

    if (!qs("game-screen").style.display || qs("setup-screen").style.display !== "none") {
      qs("setup-screen").style.display = "none";
      qs("game-screen").style.display = "block";
    }

    const board = qs("board");
    if (board.children.length !== 50) {
      board.innerHTML = "";
      for (let i = 0; i < 50; i++) {
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.index = i;
        board.appendChild(cell);
      }
    }

    document.querySelectorAll(".cell").forEach((cell, i) => {
      if (opened[i]) {
        const item = revealedValues[i];
        cell.textContent = item || (i + 1);
        cell.style.backgroundColor = locked.has(i) ? "#2b2b4d" : "#ccc";
        cell.style.color = locked.has(i) ? "#aaa" : "#000";
        cell.style.opacity = locked.has(i) ? "0.55" : "1";
        cell.style.pointerEvents = "none";
      } else {
        cell.textContent = i + 1;
        cell.style.backgroundColor = "#1f1f3a";
        cell.style.color = "#fff";
        cell.style.pointerEvents = "none";
      }
    });

    updateScoreBoard();
  });
}
                                                                                                                                                                                                                                                                                              board.appendChild(div);
                                                                                                                                                                                                                                                                                                                                                        });
                                                                                                                                                                                                                                                                                                                                                        }

                                                                                                                                                                                                                                                                                                                                                        function syncGame() {
                                                                                                                                                                                                                                                                                                                                                          db.ref("boom_live_game").set({
                                                                                                                                                                                                                                                                                                                                                              teams,
                                                                                                                                                                                                                                                                                                                                                                  scores,
                                                                                                                                                                                                                                                                                                                                                                      currentTeamIndex,
                                                                                                                                                                                                                                                                                                                                                                          currentRoundScore,
                                                                                                                                                                                                                                                                                                                                                                              opened,
                                                                                                                                                                                                                                                                                                                                                                                  locked: Array.from(locked),
                                                                                                                                                                                                                                                                                                                                                                                      revealedValues
                                                                                                                                                                                                                                                                                                                                                                                        });
                                                                                                                                                                                                                                                                                                                                                                                        }

                                                                                                                                                                                                                                                                                                                                                                                        function goToHome() {
                                                                                                                                                                                                                                                                                                                                                                                          teams = []; scores = [];
                                                                                                                                                                                                                                                                                                                                                                                            currentTeamIndex = 0;
                                                                                                                                                                                                                                                                                                                                                                                              opened = Array(50).fill(false);
                                                                                                                                                                                                                                                                                                                                                                                                locked.clear();
                                                                                                                                                                                                                                                                                                                                                                                                  revealedValues = Array(50).fill("");
                                                                                                                                                                                                                                                                                                                                                                                                    currentRoundScore = 0;
                                                                                                                                                                                                                                                                                                                                                                                                      turnData = { numbers: new Set(), colors: new Set() };
                                                                                                                                                                                                                                                                                                                                                                                                        qs("setup-screen").style.display = "block";
                                                                                                                                                                                                                                                                                                                                                                                                          qs("game-screen").style.display = "none";
                                                                                                                                                                                                                                                                                                                                                                                                            qs("result-screen").style.display = "none";
                                                                                                                                                                                                                                                                                                                                                                                                              qs("team-count").value = 2;
                                                                                                                                                                                                                                                                                                                                                                                                                qs("team-inputs").innerHTML = "";
                                                                                                                                                                                                                                                                                                                                                                                                                  qs("start-game").style.display = "none";
                                                                                                                                                                                                                                                                                                                                                                                                                  }
}

