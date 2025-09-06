const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.querySelector('.game-container');
const scoreElement = document.getElementById('scoreElement');
const levelElement = document.getElementById('levelElement');
const playerImage = document.getElementById('playerShip');
const hpFill = document.getElementById('hpFill');
const hpText = document.getElementById('hpText');
const backgroundImage = document.getElementById('backgroundImg');

// Set Initial Canvas Size (akan di-override oleh resize)
canvas.width = 800;
canvas.height = 600;

// Player
const player = {
    x: canvas.width / 2,
    y: canvas.height - 80,
    width: 80,
    height: 60,
    speed: 5,
    dx: 0,
    canShoot: true,
    shootCooldown: 500, // 500ms
    maxHp: 100,
    currentHp: 100
};

// Game State
let projectiles = [];
let aliens = [];
let enemyLasers = [];
let score = 0;
let level = 1;
let alienSpeed = 1;
let enemiesDefeated = 0;
let attackSpeedBuff = 0;
const BUFF_INCREMENT = 0.05; // 5% per buff
const MAX_ATTACK_SPEED_BUFF = 0.50; // Maksimal 50%
let gameOver = false;

// UI Elements
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// Alien Properties
const alienRows = 3;
const alienCols = 6;
let alienWidth = 40;
let alienHeight = 30;
let alienPadding = 10;
let alienDirection = 1;
let alienStepDown = 30;
const ALIEN_SHOOT_CHANCE = 0.002;
const enemyLaserSpeed = 5;
const projectileSpeed = 7;

// --- REFAKTORISASI FUNGSI KONTROL ---

function handleMove(direction) {
    if (gameOver) return;
    // direction bisa -1 untuk kiri, 1 untuk kanan
    player.dx = player.speed * direction;
}

function stopMove() {
    player.dx = 0;
}

function shoot() {
    if (gameOver || !player.canShoot) return;

    projectiles.push({
        x: player.x,
        y: player.y - 20
    });

    // Terapkan buff. Cooldown berkurang seiring meningkatnya buff.
    const buffedCooldown = player.shootCooldown * (1 - attackSpeedBuff);
    
    player.canShoot = false;
    setTimeout(() => {
        player.canShoot = true;
    }, buffedCooldown);
}

// --- FUNGSI UTAMA GAME ---

function resizeCanvas() {
    const { clientWidth, clientHeight } = gameContainer;
    
    // Tentukan rasio aspek yang diinginkan
    // Ini bisa diubah ke 9/16 untuk portrait jika diinginkan
    const aspectRatio = 4 / 3;

    let newWidth = clientWidth;
    let newHeight = newWidth / aspectRatio;

    if (newHeight > clientHeight) {
        newHeight = clientHeight;
        newWidth = newHeight * aspectRatio;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;

    // Skalakan ulang elemen game berdasarkan ukuran canvas baru
    const scaleFactor = canvas.width / 800; // 800 adalah lebar referensi awal

    player.width = 60 * scaleFactor;
    player.height = 45 * scaleFactor;
    player.speed = 5 * scaleFactor;
    player.x = canvas.width / 2;
    player.y = canvas.height - player.height - 20;

    alienWidth = 40 * scaleFactor;
    alienHeight = 30 * scaleFactor;
    alienPadding = 15 * scaleFactor;
    alienStepDown = 30 * scaleFactor;

    // Reposisi alien setelah resize
    initAliens();
}

function initAliens() {
    aliens = [];
    const initialOffsetX = (canvas.width - (alienCols * (alienWidth + alienPadding))) / 2;
    for (let row = 0; row < alienRows; row++) {
        for (let col = 0; col < alienCols; col++) {
            aliens.push({
                x: col * (alienWidth + alienPadding) + initialOffsetX,
                y: row * (alienHeight + alienPadding) + 50, // Beri jarak dari atas
                width: alienWidth,
                height: alienHeight,
                alive: true
            });
        }
    }
}

function resetGame() {
    gameOver = false;
    score = 0;
    level = 1;
    alienSpeed = 1;
    enemiesDefeated = 0;
    attackSpeedBuff = 0;
    
    projectiles = [];
    enemyLasers = [];
    
    scoreElement.textContent = score;
    levelElement.textContent = level;
    gameOverScreen.style.display = 'none';
    
    player.x = canvas.width / 2;
    player.y = canvas.height - player.height - 20;
    player.currentHp = player.maxHp;
    updatePlayerHp(0);
    
    initAliens();
    
    alienDirection = 1;
    
    // Mulai game loop lagi jika sebelumnya berhenti
    if (gameOver) {
        requestAnimationFrame(gameLoop);
    }
}

// --- UPDATE & DRAW FUNCTIONS ---

function update(deltaTime) {
    if (gameOver) return;

    // Player Movement
    player.x += player.dx;
    if (player.x - player.width / 2 < 0) player.x = player.width / 2;
    if (player.x + player.width / 2 > canvas.width) player.x = canvas.width - player.width / 2;

    // Projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].y -= projectileSpeed;
        if (projectiles[i].y < 0) projectiles.splice(i, 1);
    }

    // Enemy Lasers
    for (let i = enemyLasers.length - 1; i >= 0; i--) {
        enemyLasers[i].y += enemyLaserSpeed;
        if (enemyLasers[i].y > canvas.height) enemyLasers.splice(i, 1);
    }

    // Aliens
    let touchedEdge = false;
    aliens.forEach(alien => {
        if (!alien.alive) return;
        alien.x += alienSpeed * alienDirection;
        if (alien.x <= 0 || alien.x + alien.width >= canvas.width) {
            touchedEdge = true;
        }
        if (Math.random() < ALIEN_SHOOT_CHANCE) {
            enemyLasers.push({ x: alien.x + alien.width / 2, y: alien.y + alien.height });
        }
    });

    if (touchedEdge) {
        alienDirection *= -1;
        aliens.forEach(alien => {
            alien.y += alienStepDown;
        });
    }

    checkCollisions();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Background
    if (backgroundImage && backgroundImage.complete) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Player
    ctx.drawImage(playerImage, player.x - player.width / 2, player.y, player.width, player.height);

    // Projectiles
    ctx.fillStyle = '#00ff00';
    projectiles.forEach(p => ctx.fillRect(p.x - 2, p.y, 4, 10));

    // Aliens
    ctx.fillStyle = '#ff0000';
    aliens.forEach(a => {
        if (a.alive) ctx.fillRect(a.x, a.y, a.width, a.height);
    });

    // Enemy Lasers
    ctx.fillStyle = '#ffff00';
    enemyLasers.forEach(l => ctx.fillRect(l.x - 2, l.y, 4, 10));
}

// (Fungsi checkCollisions, updatePlayerHp, handleGameOver, checkLevelComplete tetap sama, tapi pastikan direview)
function checkCollisions() {
    // Player projectiles vs Aliens
    for (let i = projectiles.length - 1; i >= 0; i--) {
        for (let j = aliens.length - 1; j >= 0; j--) {
            const p = projectiles[i];
            const a = aliens[j];
            if (a.alive && p && p.x > a.x && p.x < a.x + a.width && p.y > a.y && p.y < a.y + a.height) {
                a.alive = false;
                projectiles.splice(i, 1);
                score += 10;
                scoreElement.textContent = score;

                enemiesDefeated++;
                if (enemiesDefeated >= 10) {
                    enemiesDefeated = 0;
                    if (attackSpeedBuff < MAX_ATTACK_SPEED_BUFF) {
                        attackSpeedBuff = Math.min(MAX_ATTACK_SPEED_BUFF, attackSpeedBuff + BUFF_INCREMENT);
                        console.log(`Attack Speed Buff: ${(attackSpeedBuff * 100).toFixed(0)}%`);
                    }
                }
                checkLevelComplete();
                break; // Hentikan loop alien jika proyektil sudah kena
            }
        }
    }

    // Enemy lasers vs Player
    for (let i = enemyLasers.length - 1; i >= 0; i--) {
        const l = enemyLasers[i];
        if (l.x > player.x - player.width/2 && l.x < player.x + player.width/2 && l.y > player.y && l.y < player.y + player.height) {
            enemyLasers.splice(i, 1);
            updatePlayerHp(-10);
        }
    }

    // Aliens vs Player (atau mencapai bawah)
    aliens.forEach(a => {
        if (a.alive && (a.y + a.height >= canvas.height || (a.y + a.height > player.y && a.x < player.x + player.width/2 && a.x + a.width > player.x - player.width/2))) {
            handleGameOver();
        }
    });
}

function checkLevelComplete() {
    if (aliens.every(a => !a.alive)) {
        level++;
        levelElement.textContent = level;
        alienSpeed += 0.5;
        initAliens();
    }
}

function updatePlayerHp(change) {
    player.currentHp = Math.max(0, player.currentHp + change);
    const hpPercent = (player.currentHp / player.maxHp) * 100;
    hpFill.style.setProperty('--hp-percent', `${hpPercent}%`);
    hpText.textContent = `${player.currentHp}/${player.maxHp}`;
    if (player.currentHp <= 0) {
        handleGameOver();
    }
}

function handleGameOver() {
    if (gameOver) return; // Mencegah pemanggilan ganda
    gameOver = true;
    gameOverScreen.style.display = 'block';
    finalScoreElement.textContent = score;
}

// --- GAME LOOP ---
let lastTime = 0;
function gameLoop(timestamp) {
    if (gameOver) return; // Hentikan loop jika game over
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    update(deltaTime);
    draw();

    requestAnimationFrame(gameLoop);
}

// --- EVENT LISTENERS ---

// Keyboard (Desktop)
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') handleMove(-1);
    if (e.key === 'ArrowRight') handleMove(1);
    if (e.key === ' ') shoot();
});
document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') stopMove();
});

// Touch (Mobile)
const leftBtn = document.getElementById('leftButton');
const rightBtn = document.getElementById('rightButton');
const shootBtn = document.getElementById('shootButton');

leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleMove(-1); });
rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); handleMove(1); });
shootBtn.addEventListener('touchstart', (e) => { e.preventDefault(); shoot(); });

leftBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopMove(); });
rightBtn.addEventListener('touchend', (e) => { e.preventDefault(); stopMove(); });

// Window Listeners
window.addEventListener('resize', resizeCanvas);
window.addEventListener('load', () => {
    resizeCanvas();
    resetGame();
    requestAnimationFrame(gameLoop);
});
restartButton.addEventListener('click', resetGame);