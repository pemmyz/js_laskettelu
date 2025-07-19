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

    const PLAYER_SPEED_X = 5;
    const GAME_INITIAL_SPEED_Y = 3;
    const GAME_SPEED_INCREMENT = 0.0005;
    const YETI_TRIGGER_DISTANCE = 2000;
    const YETI_SPEED_MULTIPLIER = 1.05; // Yeti is slightly faster than the world

    // --- Game State ---
    let gameRunning = false;
    let gameSpeedY;
    let score;
    let distance;
    let highScore;
    let keys = { ArrowLeft: false, ArrowRight: false };
    
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
        }

        draw() {
            ctx.font = '40px Arial';
    
            // *** MODIFIED FOR MIRRORING ***
            // Check direction for mirroring
            if (this.dx > 0) { // Moving right
                ctx.save(); // Save the current canvas state
                ctx.scale(-1, 1); // Flip the context horizontally
    
                // Draw the character at a mirrored position
                ctx.fillText(this.char, -this.x - this.width, this.y);
    
                ctx.restore(); // Restore the canvas to its original, un-flipped state
            } else { // Moving left or stationary
                // Draw normally
                ctx.fillText(this.char, this.x, this.y);
            }
        }

        update() {
            this.x += this.dx;
            // Keep player within canvas bounds
            if (this.x < 0) this.x = 0;
            if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        }
    }

    // --- Obstacle Class ---
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

    // --- Yeti Class ---
    class Yeti extends Obstacle {
        constructor(x, y) {
            super(x, y, { char: YETI_CHAR, type: 'yeti' });
            this.width = 60;
            this.height = 60;
        }

        update() {
            // Chase the player
            const targetX = player.x - 10; // Center alignment
            if (this.x < targetX) this.x += Math.min(2, targetX - this.x);
            if (this.x > targetX) this.x -= Math.min(2, this.x - targetX);
            
            // Move down slightly faster than the game world
            this.y -= (gameSpeedY * YETI_SPEED_MULTIPLIER);
        }
    }

    // --- Game Loop ---
    function gameLoop() {
        if (!gameRunning) return;

        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    function update() {
        // Update player movement
        player.dx = 0;
        if (keys.ArrowLeft) player.dx = -PLAYER_SPEED_X;
        if (keys.ArrowRight) player.dx = PLAYER_SPEED_X;
        player.update();

        // Update obstacles
        obstacles.forEach(o => o.update());
        
        // Remove off-screen obstacles
        obstacles = obstacles.filter(o => o.y + o.height > 0);

        // Spawn new obstacles
        spawnObstacles();

        // Update score and distance
        distance += gameSpeedY / 20; // Scale down for readability
        score += gameSpeedY / 10;
        gameSpeedY += GAME_SPEED_INCREMENT;

        // Check for Yeti
        if (distance > YETI_TRIGGER_DISTANCE && !yetiActive) {
            yetiActive = true;
            yeti = new Yeti(Math.random() * (canvas.width - 60), canvas.height + 100);
            obstacles.push(yeti);
        }

        // Collision Detection
        checkCollisions();
    }

    function draw() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw player
        player.draw();

        // Draw obstacles
        obstacles.forEach(o => o.draw());

        // Update HUD
        scoreDisplay.textContent = `Score: ${Math.floor(score)}`;
        distanceDisplay.textContent = `Distance: ${Math.floor(distance)}m`;
        highScoreDisplay.textContent = `High Score: ${highScore}`;
    }

    // --- Game Logic Functions ---
    function startGame() {
        // Reset state
        gameRunning = true;
        gameSpeedY = GAME_INITIAL_SPEED_Y;
        score = 0;
        distance = 0;
        obstacles = [];
        yetiActive = false;
        yeti = null;
        highScore = loadHighScore();
        
        player = new Player(canvas.width / 2 - 20, 50, currentSkierChar);
        
        // UI changes
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
        // Limit number of obstacles to prevent lag
        if (obstacles.length > 30) return;

        if (Math.random() < 0.05) { // Adjust spawn rate
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
            // Simple AABB collision detection
            if (player.x < obs.x + obs.width &&
                player.x + player.width > obs.x &&
                player.y < obs.y + obs.height &&
                player.y + player.height > obs.y) {
                
                handleCollision(obs, i);
            }
        }
    }

    function handleCollision(obstacle, index) {
        switch (obstacle.type) {
            case 'crash':
            case 'yeti':
                gameOver();
                break;
            case 'jump':
            case 'gate':
                score += obstacle.points;
                obstacles.splice(index, 1); // Remove mogul/gate after hitting it
                break;
        }
    }

    // --- High Score & Leaderboard ---
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
        if (newScore > 0) { // Only save scores greater than 0
            board.push(newScore);
            board.sort((a, b) => b - a); // Sort descending
            board = board.slice(0, 10); // Keep top 10
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

    // --- Customization ---
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
                // Update selection visual
                document.querySelectorAll('.skier-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
            });
            skierOptionsContainer.appendChild(option);
        });
    }

    // --- Event Listeners ---
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            keys[e.key] = true;
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            keys[e.key] = false;
        }
    });

    startButton.addEventListener('click', startGame);
    retryButton.addEventListener('click', startGame);
    mainMenuButton.addEventListener('click', () => {
        gameOverMenu.style.display = 'none';
        startMenu.style.display = 'flex';
    });

    // Modal listeners
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
    
    // --- Initial Setup ---
    highScore = loadHighScore();
});
