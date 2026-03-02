/** Echo Maze: Memory Challenge Mode
 *  - 单人记忆挑战玩法
 *  - 3秒光明期（可见迷宫） / 2秒黑暗期（仅见玩家光点）
 *  - 60秒时间限制，60步步数限制
 */

const GRID = 15;
const MAX_STEPS = 60;
const MAX_TIME = 60;
const STUN_MS = 2000;

// 视野周期配置
const VISIBILITY = {
  VISIBLE: 3000,  // 光明期 3秒
  DARK: 2000      // 黑暗期 2秒
};

const $ = id => document.getElementById(id);

// 游戏状态
let state = null;

// 迷宫方向常量
const N=1, E=2, S=4, W=8;
const DX = {[N]:0,[E]:1,[S]:0,[W]:-1};
const DY = {[N]:-1,[E]:0,[S]:1,[W]:0};
const OPP = {[N]:S,[E]:W,[S]:N,[W]:E};

// 生成迷宫（递归回溯算法）
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
      mode: 'VISIBLE',  // 'VISIBLE' | 'DARK'
      nextSwitchAt: performance.now() + VISIBILITY.VISIBLE
    },

    gameTime: 0,      // 已用时间（毫秒）
    stunnedUntil: 0,  // 眩晕结束时间
    won: false,
    lost: false,

    lastTick: performance.now()
  };

  // expose for debugging
  window.__echoMaze = { state };
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
  if (t < state.stunnedUntil) return; // 眩晕中
  if (p.steps >= MAX_STEPS) return; // 步数耗尽
  if (state.gameTime >= MAX_TIME * 1000) return; // 时间耗尽
  
  // 尝试移动
  if (!canMove(p.x, p.y, dir)) {
    // 撞墙！眩晕
    state.stunnedUntil = t + STUN_MS;
    updateStatus('STUNNED', 'danger');
    return;
  }
  
  // 执行移动
  const dx = DX[dir], dy = DY[dir];
  p.x = Math.max(0, Math.min(GRID-1, p.x + dx));
  p.y = Math.max(0, Math.min(GRID-1, p.y + dy));
  p.steps++;
  
  // 检查胜利条件
  if (p.x === state.exit.x && p.y === state.exit.y) {
    state.won = true;
    updateStatus('WIN', 'success');
  }
}

// 更新视野周期
function updateVisibility() {
  const t = performance.now();
  const vis = state.visibility;
  if(state.debugAssist) {
    vis.mode = 'VISIBLE';
    vis.nextSwitchAt = t + VISIBILITY.VISIBLE;
    return;
  }

  if (t >= vis.nextSwitchAt) {
    // 切换模式
    if (vis.mode === 'VISIBLE') {
      vis.mode = 'DARK';
      vis.nextSwitchAt = t + VISIBILITY.DARK;
    } else {
      vis.mode = 'VISIBLE';
      vis.nextSwitchAt = t + VISIBILITY.VISIBLE;
    }
  }
}

// 渲染迷宫（完整版 - 光明期）
function drawMazeFull(ctx) {
  const size = ctx.canvas.width;
  const pad = 18;
  const cell = (size - pad*2) / GRID;
  
  // 清空画布
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 0, size, size);
  
  ctx.save();
  ctx.translate(pad, pad);
  
  // 绘制墙壁
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
  
  // 绘制起点
  ctx.fillStyle = '#79ffa8';
  ctx.shadowColor = '#79ffa8';
  ctx.shadowBlur = 15;
  ctx.fillRect(state.start.x * cell + 4, state.start.y * cell + 4, cell - 8, cell - 8);
  
  // 绘制出口
  ctx.fillStyle = '#ffd66e';
  ctx.shadowColor = '#ffd66e';
  ctx.shadowBlur = 15;
  ctx.fillRect(state.exit.x * cell + 4, state.exit.y * cell + 4, cell - 8, cell - 8);
  
  // 绘制玩家
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
  
  // 纯黑背景
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);
  
  ctx.save();
  ctx.translate(pad, pad);
  
  // 仅绘制玩家光点（发光效果）
  const p = state.player;
  
  // 外层光晕
  ctx.fillStyle = 'rgba(120, 183, 255, 0.3)';
  ctx.beginPath();
  ctx.arc(p.x * cell + cell / 2, p.y * cell + cell / 2, cell * 0.6, 0, Math.PI * 2);
  ctx.fill();
  
  // 内层核心
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
  
  // 更新时间
  state.gameTime += t - state.lastTick;
  state.lastTick = t;
  
  // 检查游戏结束（时间）
  if (state.gameTime >= MAX_TIME * 1000 && !state.won && !state.lost) {
    state.lost = true;
    updateStatus('TIME UP', 'danger');
  }
  
  // 更新显示
  document.getElementById('steps').textContent = p.steps;
  document.getElementById('timeLeft').textContent = Math.max(0, Math.ceil((MAX_TIME * 1000 - state.gameTime) / 1000));

  // stun display
  const stunLeft = Math.max(0, state.stunnedUntil - t);
  document.getElementById('stun').textContent = (stunLeft/1000).toFixed(1) + 's';
  
  // 视野状态
  const visMode = document.getElementById('visMode');
  const visBar = document.getElementById('visBar');
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

function updateStatus(text, type) {
  const status = document.getElementById('runnerStatus');
  status.textContent = text;
  status.className = 'badge ' + type;
}

// 游戏主循环
function gameLoop() {
  updateVisibility();
  updateHUD();
  
  // 渲染
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  
  if (state.visibility.mode === 'VISIBLE') {
    drawMazeFull(ctx);
  } else {
    drawMazeDark(ctx);
  }
  
  requestAnimationFrame(gameLoop);
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initState();
  
  // 键盘控制
  document.addEventListener('keydown', (e) => {
    if (state.won || state.lost) return;
    
    const dir = dirFromKey(e.key);
    if (dir) {
      e.preventDefault();
      tryMove(dir);
    }
    
    // R键重置
    if (e.key === 'r' || e.key === 'R') {
      initState();
    }
  });
  
  // UI bindings
  document.getElementById('btnNew').addEventListener('click', () => initState());
  document.getElementById('btnReset').addEventListener('click', () => initState());

  const chk = document.getElementById('chkAssist');
  chk.checked = false;
  chk.addEventListener('change', (e) => {
    state.debugAssist = e.target.checked;
  });

  // initial status
  updateStatus('READY', 'neutral');

  // start loop
  gameLoop();
});
