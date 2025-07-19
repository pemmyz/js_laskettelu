document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const startMenu = document.getElementById('start-menu');
    const gameOverMenu = document.getElementById('game-over-menu');
    const hud = document.getElementById('hud');
    
    const scoreDisplay = document.getElementById('score-display');
    const distanceDisplay = document.getElementById('distance-display');
    const highScoreDisplay = document.getElementById('high-score-display');
    
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

    // *** NEW: Jump configuration ***
    const PLAYER_FONT_SIZE = 40;
    const PLAYER_JUMP_FONT_SIZE = 47; // 40 + 7
    const JUMP_DURATION = 60; // 60 frames = approx. 1 second at 60fps

    // --- Game State ---
    let gameRunning = false;
    let gameSpeedY;
    let score;
    let distance;
    let highScore;
    
    let player;
    let obstacles = [];
    let yeti;
    let yetiActive = false;
    let currentSkierChar = localStorage.getItem('skierChar') || SKIER_OPTIONS[0];

    // --- Player Class ---
    class Player {
        constructor(x, y, char) {
            this.x = x;
            this.y = y;
            this.char = char;
            this.width = 40;
            this.height = 40;
            this.dx = 0;
            // *** NEW: Jump state properties ***
            this.isJumping = false;
            this.jumpTimer = 0;
        }

        // *** NEW: Method to start a jump ***
        startJump() {
            if (!this.isJumping) {
                this.isJumping = true;
                this.jumpTimer = JUMP_DURATION;
            }
        }

        draw() {
            // *** MODIFIED: Apply jump effects before drawing ***
            if (this.isJumping) {
                ctx.font = `${PLAYER_JUMP_FONT_SIZE}px Arial`;
                ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetX = 5;
                ctx.shadowOffsetY = 5;
            } else {
                ctx.font = `${PLAYER_FONT_SIZE}px Arial`;
            }

            // Mirroring logic
            if (this.dx > 0) { // Moving right
                ctx.save();
                ctx.scale(-1, 1);
                ctx.fillText(this.char, -this.x - this.width, this.y);
                ctx.restore();
            } else { // Moving left or stationary
                ctx.fillText(this.char, this.x, this.y);
            }

            // *** NEW: Reset shadow effects so they don't affect other objects ***
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }

        update() {
            this.x += this.dx;
            if (this.x < 0) this.x = 0;
            if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

            // *** NEW: Update the jump timer ***
            if (this.isJumping) {
                this.jumpTimer--;
                if (this.jumpTimer <= 0) {
                    this.isJumping = false;
                }
            }
        }
    }

    // --- Obstacle Class --- (No changes here)
    class Obstacle {
        constructor(x, y, typeInfo) {
            this.x = x;
            this.y = y;
            this.char = typeInfo.char;
            this.points = typeInfo.points;
            this.type = typeInfo.type;
            this.width = 40;
            this.height = 40;
        }
        draw() {
            ctx.font = '40px Arial';
            ctx.fillText(this.char, this.x, this.y);
        }
        update() {
            this.y -= gameSpeedY;
        }
    }

    // --- Yeti Class --- (No changes here)
    class Yeti extends Obstacle {
        constructor(x, y) {
            super(x, y, { char: YETI_CHAR, type: 'yeti' });
            this.width = 60; this.height = 60;
        }
        update() {
            const targetX = player.x - 10;
            if (this.x < targetX) this.x += Math.min(2, targetX - this.x);
            if (this.x > targetX) this.x -= Math.min(2, this.x - targetX);
            this.y -= (gameSpeedY * YETI_SPEED_MULTIPLIER);
        }
    }

    // --- Game Loop and Update --- (No changes here)
    function gameLoop() {
        if (!gameRunning) return;
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    function update() {
        player.update();
        obstacles.forEach(o => o.update());
        obstacles = obstacles.filter(o => o.y + o.height > 0);
        spawnObstacles();
        distance += gameSpeedY / 20;
        score += gameSpeedY / 10;
        gameSpeedY += GAME_SPEED_INCREMENT;
        if (distance > YETI_TRIGGER_DISTANCE && !yetiActive) {
            yetiActive = true;
            yeti = new Yeti(Math.random() * (canvas.width - 60), canvas.height + 100);
            obstacles.push(yeti);
        }
        checkCollisions();
    }

    // --- Drawing and Game State --- (No changes here)
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        player.draw();
        obstacles.forEach(o => o.draw());
        scoreDisplay.textContent = `Score: ${Math.floor(score)}`;
        distanceDisplay.textContent = `Distance: ${Math.floor(distance)}m`;
        highScoreDisplay.textContent = `High Score: ${highScore}`;
    }

    function startGame() {
        gameRunning = true;
        gameSpeedY = GAME_INITIAL_SPEED_Y;
        score = 0; distance = 0;
        obstacles = []; yetiActive = false; yeti = null;
        highScore = loadHighScore();
        player = new Player(canvas.width / 2 - 20, 50, currentSkierChar);
        player.dx = 0;
        startMenu.style.display = 'none';
        gameOverMenu.style.display = 'none';
        hud.style.display = 'flex';
        gameLoop();
    }
    
    function gameOver() {
        gameRunning = false;
        updateHighScore();
        finalScoreEl.textContent = Math.floor(score);
        finalHighScoreEl.textContent = highScore;
        hud.style.display = 'none';
        gameOverMenu.style.display = 'block';
    }

    function spawnObstacles() {
        if (obstacles.length > 30) return;
        if (Math.random() < 0.05) {
            const x = Math.random() * (canvas.width - 40);
            const y = canvas.height + 50;
            const rand = Math.random();
            let type;
            if (rand < 0.5) type = OBSTACLE_TYPES.TREE;
            else if (rand < 0.75) type = OBSTACLE_TYPES.ROCK;
            else if (rand < 0.9) type = OBSTACLE_TYPES.MOGUL;
            else type = OBSTACLE_TYPES.GATE;
            obstacles.push(new Obstacle(x, y, type));
        }
    }
    
    function checkCollisions() {
        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            if (player.x < obs.x + obs.width &&
                player.x + player.width > obs.x &&
                player.y < obs.y + obs.height &&
                player.y + player.height > obs.y) {
                handleCollision(obs, i);
            }
        }
    }

    // *** MODIFIED: Collision handler is updated for jumping ***
    function handleCollision(obstacle, index) {
        // If jumping, the player is immune to crashes.
        if (player.isJumping && obstacle.type === 'crash') {
            return; // Fly over the obstacle!
        }

        switch (obstacle.type) {
            case 'crash': // Tree or Rock
            case 'yeti':
                gameOver();
                break;
            case 'jump': // Mogul
                player.startJump();
                score += obstacle.points;
                // DO NOT remove the mogul: The line `obstacles.splice(index, 1);` is intentionally omitted.
                break;
            case 'gate':
                score += obstacle.points;
                obstacles.splice(index, 1); // Gates still disappear.
                break;
        }
    }

    // --- High Score, Customization, Event Listeners --- (No changes below this line)
    function loadHighScore() {
        return parseInt(localStorage.getItem('skiFreeHighScore') || '0');
    }

    function updateHighScore() {
        if (score > highScore) {
            highScore = Math.floor(score);
            localStorage.setItem('skiFreeHighScore', highScore);
        }
        saveToLeaderboard(Math.floor(score));
    }

    function saveToLeaderboard(newScore) {
        let board = JSON.parse(localStorage.getItem('skiFreeLeaderboard') || '[]');
        if (newScore > 0) {
            board.push(newScore);
            board.sort((a, b) => b - a);
            board = board.slice(0, 10);
            localStorage.setItem('skiFreeLeaderboard', JSON.stringify(board));
        }
    }

    function displayLeaderboard() {
        leaderboardList.innerHTML = '';
        let board = JSON.parse(localStorage.getItem('skiFreeLeaderboard') || '[]');
        if (board.length === 0) {
            leaderboardList.innerHTML = '<li>No scores yet!</li>';
            return;
        }
        board.forEach((score, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${score}`;
            leaderboardList.appendChild(li);
        });
    }

    function setupCustomization() {
        skierOptionsContainer.innerHTML = '';
        SKIER_OPTIONS.forEach(char => {
            const option = document.createElement('div');
            option.classList.add('skier-option');
            option.textContent = char;
            if (char === currentSkierChar) {
                option.classList.add('selected');
            }
            option.addEventListener('click', () => {
                currentSkierChar = char;
                localStorage.setItem('skierChar', char);
                document.querySelectorAll('.skier-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            });
            skierOptionsContainer.appendChild(option);
        });
    }

    window.addEventListener('keydown', (e) => {
        if (!gameRunning || !player) return;
        switch (e.key) {
            case 'ArrowLeft': player.dx = -PLAYER_SPEED_X; break;
            case 'ArrowRight': player.dx = PLAYER_SPEED_X; break;
            case 'ArrowDown': player.dx = 0; break;
        }
    });

    startButton.addEventListener('click', startGame);
    retryButton.addEventListener('click', startGame);
    mainMenuButton.addEventListener('click', () => {
        gameOverMenu.style.display = 'none';
        startMenu.style.display = 'flex';
    });

    customizeButton.addEventListener('click', () => {
        setupCustomization();
        customizeModal.style.display = 'flex';
    });
    leaderboardButton.addEventListener('click', () => {
        displayLeaderboard();
        leaderboardModal.style.display = 'flex';
    });
    closeModalButtons.forEach(btn => btn.addEventListener('click', () => {
        customizeModal.style.display = 'none';
        leaderboardModal.style.display = 'none';
    }));
    window.addEventListener('click', (event) => {
        if (event.target == customizeModal || event.target == leaderboardModal) {
            customizeModal.style.display = 'none';
            leaderboardModal.style.display = 'none';
        }
    });
    
    highScore = loadHighScore();
});
