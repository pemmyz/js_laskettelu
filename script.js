document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreDisplay = document.getElementById('score-display');
    const distanceDisplay = document.getElementById('distance-display');
    const highScoreDisplay = document.getElementById('high-score-display');
    const modeIndicator = document.getElementById('mode-indicator');
    const startMenu = document.getElementById('start-menu');
    const gameOverMenu = document.getElementById('game-over-menu');
    const hud = document.getElementById('hud');
    const finalScoreEl = document.getElementById('final-score');
    const finalHighScoreEl = document.getElementById('final-high-score');
    const startButton = document.getElementById('start-button');
    const retryButton = document.getElementById('retry-button');
    const mainMenuButton = document.getElementById('main-menu-button');
    const customizeButton = document.getElementById('customize-button');
    const leaderboardButton = document.getElementById('leaderboard-button');
    const customizeModal = document.getElementById('customize-modal');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const closeModalButtons = document.querySelectorAll('.close-button');
    const skierOptionsContainer = document.getElementById('skier-options');
    const leaderboardList = document.getElementById('leaderboard-list');

    // --- Mobile DOM Elements ---
    const mobileToggleBtn = document.getElementById('mobile-btn');
    const mobileControls = document.getElementById('mobile-controls');
    const mobileLeftBtn = document.getElementById('mobile-left');
    const mobileRightBtn = document.getElementById('mobile-right');
    const mobileDownBtn = document.getElementById('mobile-down');
    const screenElement = document.getElementById("game-container");

    // --- Game Configuration ---
    const SKIER_OPTIONS = ['⛷️', '🏂', '🏃‍♂️', '🚴‍♀️', '🛹'];
    const OBSTACLE_TYPES = {
        TREE: { char: '🌲', points: -1, type: 'crash' },
        ROCK: { char: '🪨', points: -1, type: 'crash' },
        MOGUL: { char: '〰️', points: 100, type: 'jump' },
        GATE: { char: '🚩', points: 50, type: 'gate' }
    };
    const YETI_CHAR = '👹';
    const PLAYER_SPEED_X = 4;
    const GAME_INITIAL_SPEED_Y = 4;
    const GAME_SPEED_INCREMENT = 0.0005;
    const YETI_TRIGGER_DISTANCE = 2000;
    const YETI_SPEED_MULTIPLIER = 1.05;
    const PLAYER_FONT_SIZE = 40;
    const PLAYER_JUMP_FONT_SIZE = 47;
    const JUMP_DURATION = 60;
    const HITBOX_INSET = 4;
    const HITBOX_Y_OFFSET = -8;
    const AUTOBOT_DETECTION_RANGE = 280;
    const AUTOBOT_DECISION_INTERVAL = 10;

    // --- Game State ---
    let gameRunning = false;
    let gameSpeedY, score, distance, highScore;
    let player, obstacles = [], yeti, yetiActive = false;
    let currentSkierChar = localStorage.getItem('skierChar') || SKIER_OPTIONS[0];
    let autobotEnabled = false;
    let devModeEnabled = false;
    let autobotDecisionCooldown = 0;
    
    // --- State for Bot Algorithm Management ---
    let currentBotAlgorithmIndex = 0;
    let botDebugData = {}; 

    // --- FULLSCREEN & MOBILE LOGIC ---
    function scaleGame() {
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
        
        if (isFullscreen) {
            const baseWidth = 800; 
            const baseHeight = 600; 
            
            const scale = Math.min(
                window.innerWidth / baseWidth,
                window.innerHeight / baseHeight
            );
            
            screenElement.style.transform = `scale(${scale})`;
            document.body.classList.add('mobile-mode');
        } else {
            screenElement.style.transform = 'none'; 
            document.body.classList.remove('mobile-mode');
        }
    }

    function goFull() {
        const el = document.documentElement;
        if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    }

    window.addEventListener("resize", scaleGame);
    window.addEventListener("fullscreenchange", scaleGame);
    window.addEventListener("webkitfullscreenchange", scaleGame);
    scaleGame();

    if (mobileToggleBtn) mobileToggleBtn.addEventListener('click', goFull);

    function setupMobileControls() {
        if (!mobileControls) return;
        
        const addControlListener = (element, action) => {
            const pressBtn = (e) => {
                if (e.cancelable) e.preventDefault();
                if (!gameRunning || !player || autobotEnabled) return;
                action();
            };
            
            element.addEventListener('touchstart', pressBtn, { passive: false });
            element.addEventListener('mousedown', pressBtn);
        };

        addControlListener(mobileLeftBtn, () => { player.dx = -PLAYER_SPEED_X; });
        addControlListener(mobileRightBtn, () => { player.dx = PLAYER_SPEED_X; });
        addControlListener(mobileDownBtn, () => { player.dx = 0; });
    }
    setupMobileControls();

    // --- Classes (Player, Obstacle, Yeti) ---
    class Player { constructor(x, y, char) { this.x = x; this.y = y; this.char = char; this.width = 40; this.height = 40; this.dx = 0; this.isJumping = false; this.jumpTimer = 0; } startJump() { if (!this.isJumping) { this.isJumping = true; this.jumpTimer = JUMP_DURATION; } } draw() { let fontSize = PLAYER_FONT_SIZE; if (this.isJumping) { fontSize = PLAYER_JUMP_FONT_SIZE; ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = 5; ctx.shadowOffsetY = 5; } ctx.font = `${fontSize}px Arial`; if (this.dx > 0) { ctx.save(); ctx.scale(-1, 1); ctx.fillText(this.char, -this.x - this.width, this.y); ctx.restore(); } else { ctx.fillText(this.char, this.x, this.y); } ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; } update() { this.x += this.dx; if (this.x < 0) this.x = 0; if (this.x + this.width > canvas.width) this.x = canvas.width - this.width; if (this.isJumping) { this.jumpTimer--; if (this.jumpTimer <= 0) this.isJumping = false; } } }
    class Obstacle { constructor(x, y, typeInfo) { this.x = x; this.y = y; this.char = typeInfo.char; this.points = typeInfo.points; this.type = typeInfo.type; this.width = 40; this.height = 40; } draw() { ctx.font = '40px Arial'; ctx.fillText(this.char, this.x, this.y); if (devModeEnabled) { ctx.lineWidth = 2; switch (this.type) { case 'crash': ctx.strokeStyle = 'red'; break; case 'yeti': ctx.strokeStyle = '#ff00ff'; break; case 'jump': ctx.strokeStyle = 'lime'; break; case 'gate': ctx.strokeStyle = 'cyan'; break; } ctx.strokeRect(this.x + HITBOX_INSET, this.y + HITBOX_INSET + HITBOX_Y_OFFSET, this.width - 2 * HITBOX_INSET, this.height - 2 * HITBOX_INSET); } } update() { this.y -= gameSpeedY; } }
    class Yeti extends Obstacle { constructor(x, y) { super(x, y, { char: YETI_CHAR, type: 'yeti' }); this.width = 60; this.height = 60; } update() { const targetX = player.x - 10; if (this.x < targetX) this.x += Math.min(2, targetX - this.x); if (this.x > targetX) this.x -= Math.min(2, this.x - targetX); this.y -= (gameSpeedY * YETI_SPEED_MULTIPLIER); } }

    // --- Bot Algorithm Definitions ---
    const BOT_ALGORITHMS = [
        {
            name: 'Survivalist',
            logic: (obstacles) => {
                const LANE_WIDTH = 80;
                const playerCenterX = player.x + player.width / 2;
                const lanes = {
                    left: { x: playerCenterX - LANE_WIDTH, blocked: false, target: null },
                    center: { x: playerCenterX, blocked: false, target: null },
                    right: { x: playerCenterX + LANE_WIDTH, blocked: false, target: null },
                };
                let debugLines = [];

                for (const obs of obstacles) {
                    const obsCenterX = obs.x + obs.width / 2;
                    const isThreat = obs.type === 'crash' || obs.type === 'yeti';
                    debugLines.push({ x: obsCenterX, y: obs.y, color: isThreat ? 'red' : 'lime' });

                    if (Math.abs(obsCenterX - lanes.left.x) < LANE_WIDTH / 2) {
                        if (isThreat) lanes.left.blocked = true; else lanes.left.target = obs;
                    }
                    if (Math.abs(obsCenterX - lanes.center.x) < LANE_WIDTH / 2) {
                        if (isThreat) lanes.center.blocked = true; else lanes.center.target = obs;
                    }
                    if (Math.abs(obsCenterX - lanes.right.x) < LANE_WIDTH / 2) {
                        if (isThreat) lanes.right.blocked = true; else lanes.right.target = obs;
                    }
                }

                if (lanes.center.blocked) {
                    if (!lanes.right.blocked) player.dx = PLAYER_SPEED_X;
                    else if (!lanes.left.blocked) player.dx = -PLAYER_SPEED_X;
                    else player.dx = PLAYER_SPEED_X; // Pray
                } else if (lanes.right.target) {
                    player.dx = PLAYER_SPEED_X;
                } else if (lanes.left.target) {
                    player.dx = -PLAYER_SPEED_X;
                } else {
                    player.dx = 0;
                }
                return { lines: debugLines, lanes: lanes }; 
            }
        },
        {
            name: 'Greedy',
            logic: (obstacles) => {
                const targets = obstacles.filter(o => o.type === 'jump' || o.type === 'gate');
                const threats = obstacles.filter(o => o.type === 'crash' && o.y < player.y + 120); 
                let debugLines = [];

                if (threats.length > 0) {
                    const closestThreat = threats.sort((a,b) => a.y - b.y)[0];
                    debugLines.push({ x: closestThreat.x, y: closestThreat.y, color: 'magenta' });
                    player.dx = (closestThreat.x < player.x) ? PLAYER_SPEED_X : -PLAYER_SPEED_X;
                    return { lines: debugLines };
                }

                if (targets.length > 0) {
                    const closestTarget = targets.sort((a, b) => a.y - b.y)[0];
                    debugLines.push({ x: closestTarget.x, y: closestTarget.y, color: 'yellow' });
                    const targetCenterX = closestTarget.x + closestTarget.width / 2;
                    if (targetCenterX < player.x) player.dx = -PLAYER_SPEED_X;
                    else if (targetCenterX > player.x + player.width) player.dx = PLAYER_SPEED_X;
                    else player.dx = 0;
                } else {
                    player.dx = 0; 
                }
                return { lines: debugLines };
            }
        },
        {
            name: 'Cautious',
            logic: (obstacles) => {
                const centerScreen = canvas.width / 2;
                const immediateThreats = obstacles.filter(o => o.type === 'crash' &&
                    o.y < player.y + 150 &&
                    o.x < player.x + player.width &&
                    o.x + o.width > player.x);
                let debugLines = [];
                
                if (immediateThreats.length > 0) {
                    const threat = immediateThreats[0];
                    debugLines.push({ x: threat.x, y: threat.y, color: 'red' });
                    player.dx = (player.x < centerScreen) ? PLAYER_SPEED_X : -PLAYER_SPEED_X;
                } else {
                    if (player.x + player.width/2 < centerScreen - 10) player.dx = PLAYER_SPEED_X / 2;
                    else if (player.x + player.width/2 > centerScreen + 10) player.dx = -PLAYER_SPEED_X / 2;
                    else player.dx = 0;
                }
                 return { lines: debugLines };
            }
        },
        {
            name: 'Simple Dodge',
            logic: (obstacles) => {
                const threatsInPath = obstacles.filter(o => (o.type === 'crash' || o.type === 'yeti') &&
                    o.y < player.y + 200 &&
                    o.x < player.x + player.width &&
                    o.x + o.width > player.x);
                
                let debugLines = [];
                if (threatsInPath.length > 0) {
                     debugLines.push({ x: threatsInPath[0].x, y: threatsInPath[0].y, color: 'red' });
                    player.dx = -PLAYER_SPEED_X; // Always dodge left
                } else {
                    player.dx = 0;
                }
                return { lines: debugLines };
            }
        }
    ];

    // --- Autobot Logic ---
    function runAutobotLogic() {
        if (autobotDecisionCooldown > 0) {
            autobotDecisionCooldown--;
            return;
        }
        autobotDecisionCooldown = AUTOBOT_DECISION_INTERVAL;
        const upcomingObstacles = obstacles.filter(o => o.y > player.y && o.y < player.y + AUTOBOT_DETECTION_RANGE);
        const algorithm = BOT_ALGORITHMS[currentBotAlgorithmIndex].logic;
        botDebugData = algorithm(upcomingObstacles) || {};
    }

    // --- Game Loop and Update ---
    function gameLoop() { if (gameRunning) { update(); draw(); requestAnimationFrame(gameLoop); } }
    
    function update() {
        if (autobotEnabled) runAutobotLogic();
        player.update();
        obstacles.forEach(o => o.update());
        obstacles = obstacles.filter(o => o.y + o.height > 0);
        spawnObstacles();
        distance += gameSpeedY / 20; score += gameSpeedY / 10;
        gameSpeedY += GAME_SPEED_INCREMENT;
        if (distance > YETI_TRIGGER_DISTANCE && !yetiActive) {
            yetiActive = true;
            yeti = new Yeti(Math.random() * (canvas.width - 60), canvas.height + 100);
            obstacles.push(yeti);
        }
        checkCollisions();
        
        let indicatorText = '';
        if (autobotEnabled) indicatorText += `[AUTOBOT: ${BOT_ALGORITHMS[currentBotAlgorithmIndex].name}] `;
        if (devModeEnabled) indicatorText += '[DEV MODE]';
        modeIndicator.textContent = indicatorText;
    }

    function drawBotDebugInfo() {
        if (!botDebugData || !player) return;
        const playerMidX = player.x + player.width / 2;
        const playerMidY = player.y + player.height / 2;
        ctx.lineWidth = 2; ctx.globalAlpha = 0.6;

        if (botDebugData.lines) {
            botDebugData.lines.forEach(line => {
                ctx.strokeStyle = line.color; ctx.beginPath();
                ctx.moveTo(playerMidX, playerMidY); ctx.lineTo(line.x + 20, line.y + 20); ctx.stroke();
            });
        }
        if (botDebugData.lanes) {
            ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
            Object.values(botDebugData.lanes).forEach(lane => {
                 if (lane.blocked) ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                 else if (lane.target) ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
                 else ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                 ctx.fillRect(lane.x - 40, player.y, 80, AUTOBOT_DETECTION_RANGE);
                 ctx.strokeRect(lane.x - 40, player.y, 80, AUTOBOT_DETECTION_RANGE);
            });
        }
        ctx.globalAlpha = 1.0;
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        player.draw(); obstacles.forEach(o => o.draw());

        if (devModeEnabled) {
            ctx.strokeStyle = 'blue'; ctx.lineWidth = 2;
            ctx.strokeRect(player.x + HITBOX_INSET, player.y + HITBOX_INSET + HITBOX_Y_OFFSET, player.width - 2 * HITBOX_INSET, player.height - 2 * HITBOX_INSET);
            if(autobotEnabled) drawBotDebugInfo();
        }
        scoreDisplay.textContent = `Score: ${Math.floor(score)}`;
        distanceDisplay.textContent = `Distance: ${Math.floor(distance)}m`;
        highScoreDisplay.textContent = `High Score: ${highScore}`;
    }

    function startGame() { 
        gameRunning = true; gameSpeedY = GAME_INITIAL_SPEED_Y; score = 0; distance = 0; obstacles = []; yetiActive = false; yeti = null; autobotDecisionCooldown = 0; 
        highScore = loadHighScore(); player = new Player(canvas.width / 2 - 20, 50, currentSkierChar); player.dx = 0; 
        startMenu.style.display = 'none'; gameOverMenu.style.display = 'none'; hud.style.display = 'flex'; 
        
        // This class manages hiding/showing touch controls during active gameplay
        document.body.classList.add('game-playing'); 
        
        gameLoop(); 
    }
    
    function gameOver() { 
        gameRunning = false; 
        if (!autobotEnabled) updateHighScore(); 
        finalScoreEl.textContent = Math.floor(score); finalHighScoreEl.textContent = highScore; 
        hud.style.display = 'none'; gameOverMenu.style.display = 'block'; 
        
        // Hide touch controls when game over overlay pops up
        document.body.classList.remove('game-playing'); 
    }

    function checkCollisions() { for (let i = obstacles.length - 1; i >= 0; i--) { const obs = obstacles[i]; const pBox = { left: player.x + HITBOX_INSET, right: player.x + player.width - HITBOX_INSET, top: player.y + HITBOX_INSET + HITBOX_Y_OFFSET, bottom: player.y + player.height - HITBOX_INSET + HITBOX_Y_OFFSET }; const oBox = { left: obs.x + HITBOX_INSET, right: obs.x + obs.width - HITBOX_INSET, top: obs.y + HITBOX_INSET + HITBOX_Y_OFFSET, bottom: obs.y + obs.height - HITBOX_INSET + HITBOX_Y_OFFSET }; if (pBox.right > oBox.left && pBox.left < oBox.right && pBox.bottom > oBox.top && pBox.top < oBox.bottom) { handleCollision(obs, i); } } }
    function handleCollision(obstacle, index) { if (player.isJumping && obstacle.type === 'crash') return; switch (obstacle.type) { case 'crash': case 'yeti': gameOver(); break; case 'jump': player.startJump(); score += obstacle.points; break; case 'gate': score += obstacle.points; obstacles.splice(index, 1); break; } }
    
    // --- Event Listeners ---
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        
        if (key === 'b') { autobotEnabled = !autobotEnabled; if (autobotEnabled && player) player.dx = 0; botDebugData = {}; }
        if (key === 'd') { devModeEnabled = !devModeEnabled; }

        if (autobotEnabled && key >= '1' && key <= '9') {
            const index = parseInt(key) - 1;
            if (index < BOT_ALGORITHMS.length) { currentBotAlgorithmIndex = index; autobotDecisionCooldown = 0; console.log(`Switched to bot: ${BOT_ALGORITHMS[index].name}`); }
        }
        
        if (!gameRunning || !player || autobotEnabled) return;
        switch (e.key) { case 'ArrowLeft': player.dx = -PLAYER_SPEED_X; break; case 'ArrowRight': player.dx = PLAYER_SPEED_X; break; case 'ArrowDown': player.dx = 0; break; }
    });

    // --- Utility Functions ---
    function spawnObstacles() { if (obstacles.length > 30) return; if (Math.random() < 0.05) { const x = Math.random() * (canvas.width - 40); const y = canvas.height + 50; const rand = Math.random(); let type; if (rand < 0.5) type = OBSTACLE_TYPES.TREE; else if (rand < 0.75) type = OBSTACLE_TYPES.ROCK; else if (rand < 0.9) type = OBSTACLE_TYPES.MOGUL; else type = OBSTACLE_TYPES.GATE; obstacles.push(new Obstacle(x, y, type)); } }
    function loadHighScore() { return parseInt(localStorage.getItem('skiFreeHighScore') || '0'); }
    function updateHighScore() { if (score > highScore) { highScore = Math.floor(score); localStorage.setItem('skiFreeHighScore', highScore); } saveToLeaderboard(Math.floor(score)); }
    function saveToLeaderboard(newScore) { let board = JSON.parse(localStorage.getItem('skiFreeLeaderboard') || '[]'); if (newScore > 0) { board.push(newScore); board.sort((a, b) => b - a); board = board.slice(0, 10); localStorage.setItem('skiFreeLeaderboard', JSON.stringify(board)); } }
    function displayLeaderboard() { leaderboardList.innerHTML = ''; let board = JSON.parse(localStorage.getItem('skiFreeLeaderboard') || '[]'); if (board.length === 0) { leaderboardList.innerHTML = '<li>No scores yet!</li>'; return; } board.forEach((score, index) => { const li = document.createElement('li'); li.textContent = `${index + 1}. ${score}`; leaderboardList.appendChild(li); }); }
    function setupCustomization() { skierOptionsContainer.innerHTML = ''; SKIER_OPTIONS.forEach(char => { const option = document.createElement('div'); option.classList.add('skier-option'); option.textContent = char; if (char === currentSkierChar) option.classList.add('selected'); option.addEventListener('click', () => { currentSkierChar = char; localStorage.setItem('skierChar', char); document.querySelectorAll('.skier-option').forEach(opt => opt.classList.remove('selected')); option.classList.add('selected'); }); skierOptionsContainer.appendChild(option); }); }
    
    startButton.addEventListener('click', startGame);
    retryButton.addEventListener('click', startGame);
    
    mainMenuButton.addEventListener('click', () => { 
        gameOverMenu.style.display = 'none'; 
        startMenu.style.display = 'flex'; 
        document.body.classList.remove('game-playing'); 
    });
    
    customizeButton.addEventListener('click', () => { setupCustomization(); customizeModal.style.display = 'flex'; });
    leaderboardButton.addEventListener('click', () => { displayLeaderboard(); leaderboardModal.style.display = 'flex'; });
    closeModalButtons.forEach(btn => btn.addEventListener('click', () => { customizeModal.style.display = 'none'; leaderboardModal.style.display = 'none'; }));
    window.addEventListener('click', (event) => { if (event.target == customizeModal || event.target == leaderboardModal) { customizeModal.style.display = 'none'; leaderboardModal.style.display = 'none'; } });
    
    highScore = loadHighScore();
});
