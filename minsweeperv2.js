// Tavus Minesweeper - External JS
// Drop-in for Webflow sites (handles ajax navigation + SPA reloads)

(function () {
  function initAll(root) {
    if (!root || root.dataset.msInit === "1") return;
    root.dataset.msInit = "1";

    // -------------------- Config --------------------
    const TARGET_CELL = 14;
    const MIN_CELL = 10;
    const MAX_CELL = 22;
    const MIN_COLS = 18;
    const MAX_COLS = 80;
    const MIN_ROWS = 6;
    const MINE_DENSITY = 0.09;

    // -------------------- State --------------------
    let COLS = 80, ROWS = 11, DECOR_ROWS = 12, CELL_PX = 14;
    let board = [];
    let MINES = 80, mineCount = MINES;
    let gameOver = false, gameWon = false;
    let isExpanded = false, isFirstClick = true, firstEnterGame = true;
    let decorativeGrid = [];
    let gutters, gutterRight, gutterBottom;

    // -------------------- Responsive sizing --------------------
    function computeGrid() {
      const rect = root.getBoundingClientRect();
      const containerW = Math.max(0, rect.width || 0);
      const containerH = Math.max(0, rect.height || 0);
      if (containerW === 0 || containerH === 0) {
        setTimeout(computeGrid, 50);
        return;
      }
      let cols = Math.floor(containerW / TARGET_CELL);
      cols = Math.max(MIN_COLS, Math.min(MAX_COLS, cols || MIN_COLS));
      let cell = Math.floor(containerW / cols);
      cell = Math.max(MIN_CELL, Math.min(MAX_CELL, cell));
      while (cols * cell > containerW && cols > MIN_COLS) cols--;
      const headerH = cell;
      let playableRows = Math.floor((containerH - headerH) / cell);
      playableRows = Math.max(MIN_ROWS, playableRows);
      let decorRows = playableRows + 1;
      root.style.setProperty("--cell", cell + "px");
      CELL_PX = cell;
      COLS = cols;
      ROWS = playableRows;
      DECOR_ROWS = decorRows;
      MINES = Math.max(1, Math.round(ROWS * COLS * MINE_DENSITY));
      updateGutters();
    }

    // -------------------- Gutters --------------------
    function ensureGutters() {
      gutters = root.querySelector(".ms-gutters");
      if (!gutters) {
        gutters = document.createElement("div");
        gutters.className = "ms-gutters";
        gutterRight = document.createElement("div");
        gutterRight.className = "ms-gutter ms-gutter-right";
        gutterBottom = document.createElement("div");
        gutterBottom.className = "ms-gutter ms-gutter-bottom";
        gutters.appendChild(gutterRight);
        gutters.appendChild(gutterBottom);
        root.appendChild(gutters);
      } else {
        gutterRight = gutters.querySelector(".ms-gutter-right");
        gutterBottom = gutters.querySelector(".ms-gutter-bottom");
      }
    }
    function setGuttersVisible(visible) {
      ensureGutters();
      if (visible) gutters.classList.add("visible");
      else gutters.classList.remove("visible");
    }
    function updateGutters() {
      ensureGutters();
      const rect = root.getBoundingClientRect();
      const usedWidth = COLS * CELL_PX;
      const usedHeight = (ROWS * CELL_PX) + CELL_PX;
      const rightWidth = Math.max(0, Math.round(rect.width - usedWidth));
      const bottomHeight = Math.max(0, Math.round(rect.height - usedHeight));
      gutterRight.style.width = rightWidth + "px";
      gutterRight.style.height = Math.max(0, Math.min(usedHeight, rect.height)) + "px";
      gutterRight.style.top = "0px";
      gutterBottom.style.height = bottomHeight + "px";
      gutterBottom.style.width = "100%";
    }

    // -------------------- Decorative + Board --------------------
    function initializeDecorativeGrid() {
      decorativeGrid = Array(DECOR_ROWS).fill(null).map(() =>
        Array(COLS).fill(null).map(() => Math.random() < 0.15)
      );
    }
    function initializeBoard() {
      board = Array(ROWS).fill(null).map(() =>
        Array(COLS).fill(null).map(() => ({
          isMine: false, isRevealed: false, isFlagged: false, neighborMines: 0
        }))
      );
      let minesPlaced = 0;
      while (minesPlaced < MINES) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        if (!board[r][c].isMine) {
          board[r][c].isMine = true;
          minesPlaced++;
        }
      }
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!board[r][c].isMine) {
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].isMine) count++;
              }
            }
            board[r][c].neighborMines = count;
          }
        }
      }
      gameOver = false; gameWon = false; isFirstClick = true;
      mineCount = MINES;
    }

    // -------------------- Reveal / Flag --------------------
    function recomputeNeighbors() {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!board[r][c].isMine) {
            let cnt = 0;
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].isMine) cnt++;
              }
            }
            board[r][c].neighborMines = cnt;
          }
        }
      }
    }
    function revealCell(r, c) {
      if (gameOver || gameWon || board[r][c].isRevealed || board[r][c].isFlagged) return;
      if (isFirstClick && board[r][c].isMine) {
        board[r][c].isMine = false;
        outer: for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            if ((y !== r || x !== c) && !board[y][x].isMine) {
              board[y][x].isMine = true; break outer;
            }
          }
        }
        recomputeNeighbors();
      }
      isFirstClick = false;
      if (board[r][c].isMine) {
        for (let i = 0; i < ROWS; i++) {
          for (let j = 0; j < COLS; j++) {
            if (board[i][j].isMine) board[i][j].isRevealed = true;
          }
        }
        gameOver = true; render(); return;
      }
      function flood(y, x) {
        if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return;
        if (board[y][x].isRevealed || board[y][x].isFlagged) return;
        board[y][x].isRevealed = true;
        if (board[y][x].neighborMines === 0) {
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) flood(y + dy, x + dx);
          }
        }
      }
      flood(r, c); checkWin(); render();
    }
    function toggleFlag(r, c, e) {
      if (e) e.preventDefault();
      if (gameOver || gameWon || board[r][c].isRevealed) return;
      board[r][c].isFlagged = !board[r][c].isFlagged;
      mineCount += board[r][c].isFlagged ? -1 : 1;
      render();
    }
    function addLongPressFlag(btn, r, c) {
      let timer = null;
      const start = (ev) => {
        if (ev.type === "pointerdown" && ev.pointerType !== "touch") return;
        clearTimeout(timer);
        timer = setTimeout(() => toggleFlag(r, c, ev), 600);
      };
      const cancel = () => { clearTimeout(timer); };
      btn.addEventListener("pointerdown", start, { passive: true });
      btn.addEventListener("pointerup", cancel, { passive: true });
      btn.addEventListener("pointercancel", cancel, { passive: true });
      btn.addEventListener("pointermove", cancel, { passive: true });
      btn.addEventListener("contextmenu", (e) => e.preventDefault(), { passive: false });
    }

    // -------------------- Win --------------------
    function checkWin() {
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (!board[r][c].isMine && !board[r][c].isRevealed) return;
        }
      }
      gameWon = true;
    }

    // -------------------- Render --------------------
    function render() {
      const mineCountEl = root.querySelector(".mine-count");
      if (mineCountEl) mineCountEl.textContent = "Mines: " + mineCount;
      const statusEl = root.querySelector(".game-status");
      if (statusEl) statusEl.textContent = gameOver ? "💥 GAME OVER" : (gameWon ? "🎉 YOU WIN" : "");
      const rows = root.querySelectorAll(".minesweeper-row");
      board.forEach((row, r) => {
        const rowEl = rows[r]; if (!rowEl) return;
        const cells = rowEl.querySelectorAll(".minesweeper-cell");
        row.forEach((cell, c) => {
          const el = cells[c]; if (!el) return;
          el.className = "minesweeper-cell";
          if (cell.isRevealed) el.classList.add("revealed");
          el.disabled = gameOver || gameWon;
          if (cell.isFlagged && !cell.isRevealed) el.textContent = "🚩";
          else if (cell.isRevealed && cell.isMine) el.textContent = "💣";
          else if (cell.isRevealed && cell.neighborMines > 0) {
            el.textContent = String(cell.neighborMines);
            el.classList.add("minesweeper-cell-number");
          } else el.textContent = "";
        });
      });
      updateGutters();
    }

    // -------------------- Build UI --------------------
    function buildUI() {
      root.innerHTML = "";
      const decorative = document.createElement("div");
      decorative.className = "ms-layer minesweeper-decorative";
      decorativeGrid.forEach((row) => {
        const rowEl = document.createElement("div");
        rowEl.className = "minesweeper-decorative-row";
        row.forEach((hasSquare) => {
          const cell = document.createElement("div");
          cell.className = "minesweeper-decorative-cell";
          if (hasSquare) {
            cell.classList.add("fade-pixel");
            cell.style.animationDelay = (Math.random() * 6) + "s";
          }
          rowEl.appendChild(cell);
        });
        decorative.appendChild(rowEl);
      });
      const hoverBomb = document.createElement("div");
      hoverBomb.className = "ms-hover-bomb";
      const bombSpan = document.createElement("span");
      bombSpan.textContent = "💣"; hoverBomb.appendChild(bombSpan);

      const game = document.createElement("div");
      game.className = "ms-layer minesweeper-game hidden";
      const header = document.createElement("div");
      header.className = "minesweeper-header";
      const left = document.createElement("div");
      left.className = "minesweeper-header-section minesweeper-header-left";
      const mineCountSpan = document.createElement("span");
      mineCountSpan.className = "minesweeper-header-text mine-count";
      mineCountSpan.textContent = "Mines: " + mineCount;
      left.appendChild(mineCountSpan);
      const statusSpan = document.createElement("span");
      statusSpan.className = "minesweeper-header-text game-status";
      left.appendChild(statusSpan);
      const newGameBtn = document.createElement("button");
      newGameBtn.className = "minesweeper-new-game";
      newGameBtn.textContent = "New Game";
      newGameBtn.addEventListener("click", function (e) {
        e.stopPropagation(); initializeBoard(); render();
      }, { passive: false });
      const center = document.createElement("div");
      center.className = "minesweeper-header-section minesweeper-header-center";
      const help = document.createElement("span");
      help.className = "minesweeper-header-text";
      help.textContent = "Left click: reveal • Right click / long-press: flag";
      center.appendChild(help);
      header.appendChild(left); header.appendChild(newGameBtn); header.appendChild(center);
      game.appendChild(header);

      for (let r = 0; r < ROWS; r++) {
        const rowEl = document.createElement("div");
        rowEl.className = "minesweeper-row";
        for (let c = 0; c < COLS; c++) {
          const btn = document.createElement("button");
          btn.className = "minesweeper-cell";
          btn.addEventListener("click", (e) => { e.stopPropagation(); revealCell(r, c); }, { passive: false });
          btn.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); toggleFlag(r, c, e); }, { passive: false });
          addLongPressFlag(btn, r, c);
          rowEl.appendChild(btn);
        }
        game.appendChild(rowEl);
      }

      const title = document.createElement("div");
      title.className = "ms-title";
      title.textContent = "Tavus Minesweeper";

      const logo = document.createElement("img");
      logo.src = "https://cdn.prod.website-files.com/68c8e57d6e512b9573db146f/68c8e57e6e512b9573db1af9_Frame%202147228894.png";
      logo.className = "ms-logo";

      ensureGutters(); setGuttersVisible(false);

      root.addEventListener("click", function (e) {
        if (e.target.closest(".minesweeper-cell") || e.target.closest(".minesweeper-new-game")) return;
        isExpanded = !isExpanded;
        if (isExpanded) {
          decorative.classList.add("hidden"); game.classList.remove("hidden");
          hoverBomb.classList.remove("visible"); logo.classList.add("hidden");
          setGuttersVisible(true);
          if (firstEnterGame) {
            firstEnterGame = false;
            title.classList.remove("show"); void title.offsetWidth;
            title.classList.add("show");
            title.addEventListener("animationend", () => title.classList.remove("show"), { once: true });
          }
        } else {
          decorative.classList.remove("hidden"); game.classList.add("hidden");
          logo.classList.remove("hidden"); setGuttersVisible(false);
        }
      }, { passive: true });

      function updateHoverBombFromEvent(ev) {
        if (isExpanded) return;
        const rect = root.getBoundingClientRect();
        const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
          hoverBomb.classList.remove("visible"); return;
        }
        const cell = CELL_PX;
        const col = Math.max(0, Math.min(COLS - 1, Math.floor(x / cell)));
        const row = Math.max(0, Math.min(DECOR_ROWS - 1, Math.floor(y / cell)));
        hoverBomb.style.width = cell + "px"; hoverBomb.style.height = cell + "px";
        hoverBomb.style.transform = "translate(" + (col * cell) + "px, " + (row * cell) + "px)";
        hoverBomb.firstChild.style.fontSize = Math.floor(cell * 0.8) + "px";
        hoverBomb.classList.add("visible");
      }
      root.addEventListener("mousemove", updateHoverBombFromEvent, { passive: true });
      root.addEventListener("mouseleave", () => hoverBomb.classList.remove("visible"), { passive: true });

      root.appendChild(decorative); root.appendChild(hoverBomb); root.appendChild(logo); root.appendChild(title); root.appendChild(game);
      updateGutters();
    }

    // -------------------- Init + Resize --------------------
    function fullRebuild() { computeGrid(); initializeDecorativeGrid(); initializeBoard(); buildUI(); render(); }
    fullRebuild();

    let resizeRaf = null, resizeTimeout = null;
    function scheduleResize() {
      if (resizeRaf) cancelAnimationFrame(resizeRaf);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      if ("requestAnimationFrame" in window) {
        resizeRaf = requestAnimationFrame(() => { fullRebuild(); resizeRaf = null; });
      } else {
        resizeTimeout = setTimeout(() => { fullRebuild(); resizeTimeout = null; }, 100);
      }
    }
    window.addEventListener("resize", scheduleResize, { passive: true });
    window.addEventListener("orientationchange", scheduleResize, { passive: true });
  }

  function minesweeperInit() {
    document.querySelectorAll(".minesweeper-embed").forEach(root => initAll(root));
  }

  // Run on first load
  document.addEventListener("DOMContentLoaded", minesweeperInit);

  // Run again after Webflow ajax nav
  document.addEventListener("page:load", minesweeperInit);
})();