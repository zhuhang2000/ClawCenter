// 游戏常量
const GRID_SIZE = 20;
const TILE_COUNT = 20; // 400x400 canvas / 20px grid
let GAME_SPEED = 100; // ms per update
const BASE_SPEED = 100;

// 道具常量
const POWERUP_TYPES = ['ghost', 'speed', 'magnet', 'time'];
const POWERUP_ICONS = { 
    ghost: '👻', 
    speed: '⚡', 
    magnet: '🧲', 
    time: '⏱️' 
};
const POWERUP_DURATION = 10000; // 10s
const ITEM_LIFETIME = 10000; // 10s

// 游戏状态
let gameLoop;
let isPaused = false;
let isGameOver = false;
let score = 0;
let highScore = localStorage.getItem('snakeHighScore') || 0;
let foodsEaten = 0; // 记录吃掉的食物数量，用于生成道具

// 道具状态
let activePowerUp = { type: null, endTime: 0 };
let powerUpItem = { x: -1, y: -1, type: null, spawnTime: 0 };

// 视觉效果状态
let particles = [];
let shakeDuration = 0;
let shakeIntensity = 0;

// 蛇的状态
let snake = [
    {x: 10, y: 10}, // 头部
    {x: 9, y: 10},
    {x: 8, y: 10}
];
let velocity = {x: 1, y: 0}; // 初始向右移动
let nextVelocity = {x: 1, y: 0}; // 缓冲下一帧的方向

// 食物位置与类型
let food = {
    x: 15, 
    y: 15, 
    type: 'normal', // normal, gold, poison
    spawnTime: 0
};

// DOM 元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const gameOverModal = document.getElementById('game-over-modal');
const finalScoreEl = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');

// 初始化
function init() {
    highScoreEl.textContent = highScore;
    document.addEventListener('keydown', handleInput);
    restartBtn.addEventListener('click', resetGame);
    spawnFood();
    startGame();
}

// 游戏循环
function startGame() {
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, GAME_SPEED);
}

function update() {
    if (isPaused || isGameOver) return;

    moveSnake();
    checkCollisions();
    updatePowerUps();
    updateParticles();
    updateFood();
    draw();
}

function updatePowerUps() {
    const now = Date.now();

    // 1. 检查道具生成
    if (powerUpItem.type === null && activePowerUp.type === null) {
        // 条件：每吃掉3个食物，20%概率生成
        // 这个逻辑在 handleEatFood 里触发生成更合适，这里只负责清理过期道具
    }

    // 2. 检查道具是否过期消失
    if (powerUpItem.type !== null) {
        if (now - powerUpItem.spawnTime > ITEM_LIFETIME) {
            powerUpItem = { x: -1, y: -1, type: null, spawnTime: 0 };
        }
    }

    // 3. 检查激活的道具效果是否结束
    if (activePowerUp.type !== null) {
        if (now >= activePowerUp.endTime) {
            deactivatePowerUp();
        } else {
            // 持续性效果处理
            applyActivePowerUpEffect();
        }
    }
}

function applyActivePowerUpEffect() {
    const type = activePowerUp.type;
    
    // 🧲 磁力效果：食物向蛇头移动
    if (type === 'magnet') {
        const head = snake[0];
        const dx = head.x - food.x;
        const dy = head.y - food.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 5 && dist > 0) { // 5格范围内吸附
             // 每隔几帧移动一次，避免太快
             if (Math.random() < 0.3) {
                 if (Math.abs(dx) > Math.abs(dy)) {
                     food.x += Math.sign(dx);
                 } else {
                     food.y += Math.sign(dy);
                 }
             }
        }
    }
}

function deactivatePowerUp() {
    const type = activePowerUp.type;
    activePowerUp = { type: null, endTime: 0 };
    
    // 恢复状态
    if (type === 'speed') {
        GAME_SPEED = BASE_SPEED;
        restartGameLoop();
    } else if (type === 'time') {
        GAME_SPEED = BASE_SPEED;
        restartGameLoop();
    }
    // ghost 和 magnet 不需要特殊的恢复逻辑，状态改变即可
}

function activatePowerUp(type) {
    activePowerUp = {
        type: type,
        endTime: Date.now() + POWERUP_DURATION
    };
    
    if (type === 'speed') {
        GAME_SPEED = BASE_SPEED / 2; // 2倍速 (间隔减半)
        restartGameLoop();
    } else if (type === 'time') {
        GAME_SPEED = BASE_SPEED * 1.5; // 0.66倍速 (慢动作)
        restartGameLoop();
    }
    
    // 视觉提示
    createExplosion(
        snake[0].x * GRID_SIZE + GRID_SIZE/2, 
        snake[0].y * GRID_SIZE + GRID_SIZE/2, 
        '#00ffff', 
        20
    );
}

function restartGameLoop() {
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, GAME_SPEED);
}

// 粒子系统
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.color = color;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.05;
    }

    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.globalAlpha = 1.0;
    }
}

function createExplosion(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// 屏幕震动
function triggerShake(duration, intensity) {
    shakeDuration = duration;
    shakeIntensity = intensity;
}

function getShakeOffset() {
    if (shakeDuration > 0) {
        shakeDuration--;
        const dx = (Math.random() - 0.5) * shakeIntensity;
        const dy = (Math.random() - 0.5) * shakeIntensity;
        return {x: dx, y: dy};
    }
    return {x: 0, y: 0};
}

// 移动蛇
function moveSnake() {
    velocity = {...nextVelocity}; // 应用缓冲的方向

    const head = {x: snake[0].x + velocity.x, y: snake[0].y + velocity.y};
    
    // 检查是否吃道具
    if (powerUpItem.type !== null) {
        if (head.x === powerUpItem.x && head.y === powerUpItem.y) {
            handleEatPowerUp();
        }
    }
    
    snake.unshift(head); // 添加新头部

    // 检查是否吃到食物
    if (head.x === food.x && head.y === food.y) {
        handleEatFood();
    } else {
        snake.pop(); // 移除尾部，保持长度
    }
}

function handleEatPowerUp() {
    if (powerUpItem.type === null) return;
    
    // 激活道具
    activatePowerUp(powerUpItem.type);
    
    // 粒子效果
    const pixelX = powerUpItem.x * GRID_SIZE + GRID_SIZE / 2;
    const pixelY = powerUpItem.y * GRID_SIZE + GRID_SIZE / 2;
    createExplosion(pixelX, pixelY, '#00ffff', 20);
    
    // 清除道具
    powerUpItem = { x: -1, y: -1, type: null, spawnTime: 0 };
    
    // 提示信息 (可以加到UI)
    console.log(`PowerUp Activated: ${activePowerUp.type}`);
}

function handleEatFood() {
    // 播放音效 (暂略)
    
    // 粒子效果
    const pixelX = food.x * GRID_SIZE + GRID_SIZE / 2;
    const pixelY = food.y * GRID_SIZE + GRID_SIZE / 2;
    let particleColor = '#e74c3c'; // 默认红色
    
    if (food.type === 'gold') particleColor = '#f1c40f';
    else if (food.type === 'poison') particleColor = '#9b59b6';
    
    createExplosion(pixelX, pixelY, particleColor, 15);

    // 分数处理
    if (food.type === 'normal') {
        score += 10;
    } else if (food.type === 'gold') {
        score += 30;
    } else if (food.type === 'poison') {
        // 毒蘑菇吃到直接结束游戏
        endGame();
        return;
    }

    scoreEl.textContent = score;
    spawnFood();
    
    // 生成道具逻辑
    foodsEaten++;
    if (foodsEaten % 3 === 0) { // 每吃3个食物
        if (Math.random() < 0.2) { // 20% 概率
            spawnPowerUp();
        }
    }
}

function spawnPowerUp() {
    // 随机选择类型
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    
    // 随机位置
    let valid = false;
    let x, y;
    while (!valid) {
        x = Math.floor(Math.random() * TILE_COUNT);
        y = Math.floor(Math.random() * TILE_COUNT);
        
        // 不要在蛇身上，也不要在食物上
        valid = !snake.some(s => s.x === x && s.y === y) && (x !== food.x || y !== food.y);
    }
    
    powerUpItem = {
        x, y,
        type,
        spawnTime: Date.now()
    };
    
    // 提示音效（这里用文字代替）
    console.log(`PowerUp Spawned: ${type} at ${x},${y}`);
}

function updateFood() {
    // 检查金色食物是否过期
    if (food.type === 'gold') {
        const currentTime = Date.now();
        if (currentTime - food.spawnTime > 5000) { // 5秒消失
            spawnFood();
        }
    }
}

// 生成食物
function spawnFood() {
    let validPosition = false;
    while (!validPosition) {
        food.x = Math.floor(Math.random() * TILE_COUNT);
        food.y = Math.floor(Math.random() * TILE_COUNT);
        
        // 确保食物不在蛇身上
        validPosition = !snake.some(segment => segment.x === food.x && segment.y === food.y);
    }
    
    // 随机食物类型
    const rand = Math.random();
    if (rand < 0.1) {
        food.type = 'gold'; // 10% 概率
    } else if (rand < 0.2) {
        food.type = 'poison'; // 10% 概率 (0.1 - 0.2)
    } else {
        food.type = 'normal'; // 80% 概率
    }
    
    food.spawnTime = Date.now();
}

// 碰撞检测
function checkCollisions() {
    const head = snake[0];

    // 幽灵模式：穿墙和穿自己
    if (activePowerUp.type === 'ghost') {
        // 穿墙处理：从对面出来
        if (head.x < 0) head.x = TILE_COUNT - 1;
        else if (head.x >= TILE_COUNT) head.x = 0;
        
        if (head.y < 0) head.y = TILE_COUNT - 1;
        else if (head.y >= TILE_COUNT) head.y = 0;
        
        // 幽灵模式不检测自身碰撞
        return;
    }

    // 撞墙检测
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        triggerShake(10, 10);
        endGame();
        return;
    }

    // 撞自己检测 (从第4节开始检查，前3节不可能撞到头)
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            triggerShake(10, 10);
            endGame();
            return;
        }
    }
}

// 游戏结束
function endGame() {
    isGameOver = true;
    clearInterval(gameLoop);
    
    // 蛇身爆炸效果
    snake.forEach(segment => {
         createExplosion(
            segment.x * GRID_SIZE + GRID_SIZE / 2, 
            segment.y * GRID_SIZE + GRID_SIZE / 2, 
            '#2ecc71', 
            5
        );
    });
    // 重绘一次以显示爆炸
    draw();

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreEl.textContent = highScore;
    }

    // 延迟显示模态框，让玩家看到爆炸
    setTimeout(() => {
        finalScoreEl.textContent = score;
        gameOverModal.classList.remove('hidden');
    }, 500);
}

// 重置游戏
function resetGame() {
    isGameOver = false;
    isPaused = false;
    score = 0;
    scoreEl.textContent = 0;
    snake = [
        {x: 10, y: 10},
        {x: 9, y: 10},
        {x: 8, y: 10}
    ];
    velocity = {x: 1, y: 0};
    nextVelocity = {x: 1, y: 0};
    particles = [];
    shakeDuration = 0;
    
    // 重置道具
    foodsEaten = 0;
    activePowerUp = { type: null, endTime: 0 };
    powerUpItem = { x: -1, y: -1, type: null, spawnTime: 0 };
    GAME_SPEED = BASE_SPEED;
    
    gameOverModal.classList.add('hidden');
    spawnFood();
    startGame();
}

// 输入处理
function handleInput(e) {
    if (isGameOver) {
        if (e.key === 'r' || e.key === 'R') {
            resetGame();
        }
        return;
    }

    switch(e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            if (velocity.y === 0) nextVelocity = {x: 0, y: -1};
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            if (velocity.y === 0) nextVelocity = {x: 0, y: 1};
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            if (velocity.x === 0) nextVelocity = {x: -1, y: 0};
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            if (velocity.x === 0) nextVelocity = {x: 1, y: 0};
            break;
        case ' ':
            e.preventDefault(); // 防止空格键滚动页面
            togglePause();
            break;
        case 'r':
        case 'R':
            resetGame();
            break;
    }
}

function togglePause() {
    if (isGameOver) return;
    isPaused = !isPaused;
    if (isPaused) {
        // 可选：显示暂停文字
        draw(); // 重绘以显示暂停文字
    } else {
        // 恢复时立即重绘以清除暂停文字
        draw();
    }
}

// 绘制画面
function draw() {
    // 应用震动
    const offset = getShakeOffset();
    ctx.save();
    ctx.translate(offset.x, offset.y);

    // 清空画布
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制食物
    let foodColor = '#e74c3c'; // 默认红色 (Normal)
    
    if (food.type === 'gold') {
        foodColor = '#f1c40f'; // 金色
        // 闪烁效果
        if (Math.floor(Date.now() / 200) % 2 === 0) {
            foodColor = '#fff';
        }
    } else if (food.type === 'poison') {
        foodColor = '#9b59b6'; // 紫色
    }

    ctx.fillStyle = foodColor;
    ctx.beginPath();
    ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE/2, 
        food.y * GRID_SIZE + GRID_SIZE/2, 
        GRID_SIZE/2 - 2, 
        0, Math.PI * 2
    );
    ctx.fill();

    // 绘制道具
    if (powerUpItem.type !== null) {
        // 闪烁效果
        if (Math.floor(Date.now() / 300) % 2 === 0) {
            ctx.fillStyle = '#00ffff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                POWERUP_ICONS[powerUpItem.type], 
                powerUpItem.x * GRID_SIZE + GRID_SIZE/2, 
                powerUpItem.y * GRID_SIZE + GRID_SIZE/2
            );
        }
    }
    
    // 绘制蛇
    snake.forEach((segment, index) => {
        // 幽灵模式下半透明
        if (activePowerUp.type === 'ghost') {
            ctx.globalAlpha = 0.5;
        }

        // 蛇头颜色不同
        ctx.fillStyle = index === 0 ? '#2ecc71' : '#27ae60'; 
        ctx.fillRect(
            segment.x * GRID_SIZE + 1, 
            segment.y * GRID_SIZE + 1, 
            GRID_SIZE - 2, 
            GRID_SIZE - 2
        );
        
        // 可选：给蛇身加一点高光效果
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(
            segment.x * GRID_SIZE + 4, 
            segment.y * GRID_SIZE + 4, 
            GRID_SIZE/2, 
            GRID_SIZE/2
        );

        ctx.globalAlpha = 1.0; // 恢复透明度
    });

    // 绘制粒子
    particles.forEach(p => p.draw(ctx));

    // 绘制激活道具UI
    if (activePowerUp.type !== null) {
        const timeLeft = Math.ceil((activePowerUp.endTime - Date.now()) / 1000);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`${POWERUP_ICONS[activePowerUp.type]} ${timeLeft}s`, 10, 30);
    }

    if (isPaused) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText("暂停", canvas.width/2, canvas.height/2);
        ctx.font = '16px Arial';
        ctx.fillText("按空格键继续", canvas.width/2, canvas.height/2 + 30);
    }
    
    ctx.restore(); // 恢复震动前的状态
}

// 启动
init();