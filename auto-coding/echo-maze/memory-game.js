/** Echo Maze: Memory Challenge Mode
 *  - 单人记忆挑战玩法
 *  - 3秒光明期（可见迷宫） / 2秒黑暗期（仅见玩家光点）
 *  - 60秒时间限制，无步数限制
 */

const GRID = 15;
const MAX_TIME = 60;
const STUN_MS = 2000;

// 视野周期配置
const VISIBILITY = {
  VISIBLE: 3000,  // 光明期 3秒
  DARK: 2000      // 黑暗期 2秒
};

const $ = id => document.getElementById(id);

// 迷宫方向常量
const N=1, E=2, S=4, W=8;
const DX = {[N]:0,[E]:1,[S]:0,[W]:-1};
const DY = {[N]:-1,[E]:0,[S]:1,[W]:0};
const OPP = {[N]:S,[E]:W,[S]:N,[W]:E};

// 游戏状态
let state = null;

// 生成迷宫
function makeMaze(w=GRID, h=GRID) {
  const cells = Array.from({length:h}, () => Array.from({length:w}, () => N|E|S|W));
  const visited = Array.from({length:h}, () => Array.from({length:w}, () => false));
  
  function shuffle(arr) {
    for (let i=arr.length-1; i>0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  
  const stack = [{x:0, y:0}];
  visited[0][0] = true;
  
  while (stack.length) {
    const cur = stack[stack.length-1];
    const dirs = shuffle([N,E,S,W]);
    let carved = false;
    
    for (const dir of dirs) {
      const nx = cur.x + DX[dir];
      const ny = cur.y + DY[dir];
      if (nx<0 || ny<0 || nx>=w || ny>=h) continue;
      if (visited[ny][nx]) continue;
      
      cells[cur.y][cur.x] &= ~dir;
      cells[ny][nx] &= ~OPP[dir];
      visited[ny][nx] = true;
      stack.push({x:nx, y:ny});
      carved = true;
      break;
    }
    
    if (!carved) stack.pop();
  }
  
  return {w, h, cells};
}

// 初始化游戏状态
function initState() {
  const maze = makeMaze(GRID, GRID);
  
  const now = performance.now();
  state = {
    maze,
    start: {x:0, y:0},
    exit: {x:GRID-1, y:GRID-1},

    player: {
      x: 0,
      y: 0,
      steps: 0
    },

    debugAssist: false,

    visibility: {
      mode: 'VISIBLE',
      nextSwitchAt: now + VISIBILITY.VISIBLE
    },

    gameTime: 0,
    stunnedUntil: 0,
    won: false,
    lost: false,

    lastTick: now
  };

  window.__echoMaze = { state };
  updateStatus('READY', 'neutral');
}

// 检查能否移动
function canMove(x, y, dir) {
  const cell = state.maze.cells[y][x];
  return (cell & dir) === 0;
}

// 尝试移动
function tryMove(dir) {
  const p = state.player;
  const t = performance.now();
  
  // 检查游戏状态
  if (state.won || state.lost) return;
  if (t < state.stunnedUntil) return;
  if (state.gameTime >= MAX_TIME * 1000) return;
  
  // 尝试移动
  if (!canMove(p.x, p.y, dir)) {
    state.stunnedUntil = t + STUN_MS;
    updateStatus('STUNNED', 'danger');
    return;
  }
  
  // 执行移动
  const dx = DX[dir], dy = DY[dir];
  p.x = Math.max(0, Math.min(GRID-1, p.x + dx));
  p.y = Math.max(0, Math.min(GRID-1, p.y + dy));
  p.steps++;
  
  // 检查胜利
  if (p.x === state.exit.x && p.y === state.exit.y) {
    state.won = true;
    updateStatus('WIN', 'success');
  }
}

// 更新视野周期
function updateVisibility() {
  const t = performance.now();
  const vis = state.visibility;
  
  if (state.debugAssist) {
    vis.mode = 'VISIBLE';
    vis.nextSwitchAt = t + VISIBILITY.VISIBLE;
    updateCanvasWrapClass();
    return;
  }
  
  if (t >= vis.nextSwitchAt) {
    if (vis.mode === 'VISIBLE') {
      vis.mode = 'DARK';
      vis.nextSwitchAt = t + VISIBILITY.DARK;
    } else {
      vis.mode = 'VISIBLE';
      vis.nextSwitchAt = t + VISIBILITY.VISIBLE;
    }
  }

  updateCanvasWrapClass();
}

// 背景：根据光明/黑暗模式切换 canvasWrap 的 class
function updateCanvasWrapClass() {
  const wrap = document.querySelector('.canvasWrap');
  if (!wrap) return;

  wrap.classList.remove('light-mode', 'dark-mode');
  if (state.visibility.mode === 'VISIBLE' || state.debugAssist) {
    wrap.classList.add('light-mode');
  } else {
    wrap.classList.add('dark-mode');
  }
}

// 渲染迷宫完整版（光明期）
function drawMazeFull(ctx) {
  const size = ctx.canvas.width;
  const pad = 18;
  const cell = (size - pad*2) / GRID;
  
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, size, size);
  
  ctx.save();
  ctx.translate(pad, pad);
  
  // 墙壁
  ctx.strokeStyle = '#7c3aed';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#7c3aed';
  ctx.shadowBlur = 10;
  
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const cellWalls = state.maze.cells[y][x];
      const x0 = x * cell;
      const y0 = y * cell;
      
      ctx.beginPath();
      if (cellWalls & N) { ctx.moveTo(x0, y0); ctx.lineTo(x0 + cell, y0); }
      if (cellWalls & E) { ctx.moveTo(x0 + cell, y0); ctx.lineTo(x0 + cell, y0 + cell); }
      if (cellWalls & S) { ctx.moveTo(x0, y0 + cell); ctx.lineTo(x0 + cell, y0 + cell); }
      if (cellWalls & W) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y0 + cell); }
      ctx.stroke();
    }
  }
  
  // 起点
  ctx.fillStyle = '#79ffa8';
  ctx.shadowColor = '#79ffa8';
  ctx.shadowBlur = 15;
  ctx.fillRect(state.start.x * cell + 4, state.start.y * cell + 4, cell - 8, cell - 8);
  
  // 出口
  ctx.fillStyle = '#ffd66e';
  ctx.shadowColor = '#ffd66e';
  ctx.shadowBlur = 15;
  ctx.fillRect(state.exit.x * cell + 4, state.exit.y * cell + 4, cell - 8, cell - 8);
  
  // 玩家
  const p = state.player;
  ctx.fillStyle = '#78b7ff';
  ctx.shadowColor = '#78b7ff';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(p.x * cell + cell / 2, p.y * cell + cell / 2, cell * 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

// 渲染黑暗期（仅玩家光点）
function drawMazeDark(ctx) {
  const size = ctx.canvas.width;
  const pad = 18;
  const cell = (size - pad*2) / GRID;
  
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  
  ctx.save();
  ctx.translate(pad, pad);
  
  const p = state.player;
  
  ctx.fillStyle = 'rgba(120, 183, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(p.x * cell + cell / 2, p.y * cell + cell / 2, cell * 0.6, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = 'rgba(120, 183, 255, 0.9)';
  ctx.beginPath();
  ctx.arc(p.x * cell + cell / 2, p.y * cell + cell / 2, cell * 0.25, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.restore();
}

// 更新HUD
function updateHUD() {
  const p = state.player;
  const vis = state.visibility;
  const t = performance.now();
  
  state.gameTime += t - state.lastTick;
  state.lastTick = t;
  
  if (state.gameTime >= MAX_TIME * 1000 && !state.won && !state.lost) {
    state.lost = true;
    updateStatus('TIME UP', 'danger');
  }
  
  const timeLeftEl = document.getElementById('timeLeft');
  if (timeLeftEl) timeLeftEl.textContent = Math.max(0, Math.ceil((MAX_TIME * 1000 - state.gameTime) / 1000));
  
  const stepsEl = document.getElementById('steps');
  if (stepsEl) stepsEl.textContent = p.steps;
  
  const stunLeft = Math.max(0, state.stunnedUntil - t);
  const stunEl = document.getElementById('stun');
  if (stunEl) stunEl.textContent = (stunLeft/1000).toFixed(1) + 's';
  
  const visMode = document.getElementById('visMode');
  const visBar = document.getElementById('visBar');
  if (visMode && visBar) {
    const timeLeft = vis.nextSwitchAt - t;
    const pct = Math.max(0, Math.min(100, (timeLeft / (vis.mode === 'VISIBLE' ? VISIBILITY.VISIBLE : VISIBILITY.DARK)) * 100));
    
    if (vis.mode === 'VISIBLE') {
      visMode.textContent = '光明期';
      visMode.className = 'vis-mode visible';
      visBar.style.background = 'linear-gradient(90deg, var(--accent), var(--info))';
    } else {
      visMode.textContent = '黑暗期';
      visMode.className = 'vis-mode dark';
      visBar.style.background = 'linear-gradient(90deg, var(--cta), var(--warn))';
    }
    visBar.style.width = pct + '%';
  }
}

function updateStatus(text, type) {
  const status = document.getElementById('runnerStatus');
  if (status) {
    status.textContent = text;
    status.className = 'badge ' + type;
  }
}

// 游戏主循环
function gameLoop() {
  updateVisibility();
  updateHUD();
  
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  if (state.visibility.mode === 'VISIBLE' || state.debugAssist) {
    drawMazeFull(ctx);
  } else {
    drawMazeDark(ctx);
  }
  
  requestAnimationFrame(gameLoop);
}

// 启动游戏
document.addEventListener('DOMContentLoaded', () => {
  initState();
  
  // 键盘控制 - 修复：确保事件监听正常工作
  document.addEventListener('keydown', (e) => {
    if (!state) return;
    if (state.won || state.lost) return;
    
    const key = e.key;
    let moved = false;
    
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      e.preventDefault();
      tryMove(N);
      moved = true;
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
      e.preventDefault();
      tryMove(E);
      moved = true;
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
      e.preventDefault();
      tryMove(S);
      moved = true;
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      e.preventDefault();
      tryMove(W);
      moved = true;
    } else if (key === 'r' || key === 'R') {
      initState();
    }
    
    // debug log
    if (moved) {
      console.log('Move attempted, player now at:', state.player.x, state.player.y);
    }
  });
  
  // UI绑定
  const btnNew = document.getElementById('btnNew');
  const btnReset = document.getElementById('btnReset');
  const chkAssist = document.getElementById('chkAssist');
  
  if (btnNew) btnNew.addEventListener('click', () => initState());
  if (btnReset) btnReset.addEventListener('click', () => initState());
  
  if (chkAssist) {
    chkAssist.checked = false;
    chkAssist.addEventListener('change', (e) => {
      if (state) state.debugAssist = e.target.checked;
    });
  }
  
  // 初始化音乐系统（如果可用）
  if (typeof MusicSystem !== 'undefined') {
    MusicSystem.init();
    
    // 监听视野模式变化，自动切换音乐风格
    const originalUpdateCanvasWrapClass = updateCanvasWrapClass;
    updateCanvasWrapClass = function() {
      originalUpdateCanvasWrapClass();
      
      // 同步音乐模式
      if (state && MusicSystem.state) {
        const newMode = state.visibility.mode === 'VISIBLE' ? 'light' : 'dark';
        MusicSystem.setMode(newMode);
      }
    };
  }
  
  // 初始状态
  updateStatus('READY', 'neutral');
  
  // 启动游戏循环
  gameLoop();
  
  console.log('Game initialized! Use WASD or Arrow keys to move.');
});
