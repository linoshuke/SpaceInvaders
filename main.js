const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreElement');
const levelElement = document.getElementById('levelElement');
const playerImage = document.getElementById('playerShip');
const hpFill = document.getElementById('hpFill');
const hpText = document.getElementById('hpText');

// Add these variables at the top with your other declarations
const backgroundImage = document.getElementById('backgroundImg');
let bgPattern = null;

// Set ukuran canvas
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
    shootCooldown: 500,
    maxHp: 100,
    currentHp: 100
};

// Projectiles
let projectiles = [];
const projectileSpeed = 7;

// Aliens
let aliens = [];
const alienRows = 3;
const alienCols = 6;
let alienWidth = 40;
let alienHeight = 30;
let alienPadding = 10;
let alienDirection = 1;
let alienStepDown = 30;
const ALIEN_SHOOT_CHANCE = 0.002;

// Game state
let score = 0;
let level = 1;
let alienSpeed = 1;
let enemiesDefeated = 0;
let attackSpeedBuff = 0;
const BUFF_INCREMENT = 0.05; // 5% per buff
const MAX_ATTACK_SPEED_BUFF = 0.50; // Maksimal 50% buff
let gameOver = false;
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// Tambahkan array untuk laser musuh
let enemyLasers = [];
const enemyLaserSpeed = 5;

// Di bagian atas file, tambahkan:
let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Fungsi untuk menyesuaikan ukuran canvas
function resizeCanvas() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let canvasWidth, canvasHeight;

    if (window.matchMedia("(orientation: portrait)").matches && isMobile) {
        // Portrait mode on mobile - use 9:16 ratio
        canvasWidth = Math.min(windowWidth * 0.95, 720);
        canvasHeight = (canvasWidth * 16) / 9;
        
        // Check if height exceeds available space
        if (canvasHeight > windowHeight * 0.7) {
            canvasHeight = windowHeight * 0.7;
            canvasWidth = (canvasHeight * 9) / 16;
        }
    } else {
        // Landscape or desktop - use 4:3 ratio
        canvasWidth = Math.min(windowWidth * 0.8, 800);
        canvasHeight = (canvasWidth * 3) / 4;
        
        if (canvasHeight > windowHeight * 0.8) {
            canvasHeight = windowHeight * 0.8;
            canvasWidth = (canvasHeight * 4) / 3;
        }
    }

    // Update canvas dimensions
    canvas.width = Math.floor(canvasWidth);
    canvas.height = Math.floor(canvasHeight);

    // Scale game elements
    const scaleFactor = canvasWidth / 800; // Use original width as reference

    // Scale player
    player.width = Math.floor(80 * scaleFactor);
    player.height = Math.floor(60 * scaleFactor);
    player.x = canvas.width / 2;
    player.y = canvas.height - (player.height + 20);
    player.speed = Math.floor(5 * scaleFactor);

    // Scale aliens
    alienWidth = Math.floor(40 * scaleFactor);
    alienHeight = Math.floor(30 * scaleFactor);
    alienPadding = Math.floor(15 * scaleFactor);
    alienStepDown = Math.floor(30 * scaleFactor);

    // Adjust enemy positions
    if (aliens.length > 0) {
        aliens.forEach(alien => {
            if (alien.alive) {
                const ratioX = alien.x / canvas.width;
                const ratioY = alien.y / canvas.height;
                alien.width = alienWidth;
                alien.height = alienHeight;
                alien.x = ratioX * canvas.width;
                alien.y = ratioY * canvas.height;
            }
        });
    }
}

// Tambahkan event listener untuk resize
window.addEventListener('resize', () => {
    handleOrientationChange();
});

// Update the orientation handling
function handleOrientationChange() {
    return new Promise(resolve => {
        setTimeout(() => {
            resizeCanvas();
            // Reposition game elements after resize
            player.x = canvas.width / 2;
            player.y = canvas.height - (player.height + 20);
            
            // Reposition aliens if they exist
            if (aliens.length > 0) {
                initAliens();
            }
            resolve();
        }, 200); // Delay for browser to adjust orientation
    });
}

// Replace existing orientation and load listeners
window.addEventListener('orientationchange', async () => {
    // Hide canvas during orientation change to prevent visual glitches
    canvas.style.opacity = '0';
    await handleOrientationChange();
    canvas.style.opacity = '1';
});

// Image preloading system
const gameAssets = {
    playerShip: 'Roket.jpeg',
    backgroundImage: 'bg.jpg',
    // Add more image assets here as needed
};

function preloadImages() {
    const imagePromises = [];
    const imageCache = {};

    for (const [key, src] of Object.entries(gameAssets)) {
        const promise = new Promise((resolve) => {
            const img = new Image();
            img.src = src;
            
            img.onload = () => {
                imageCache[key] = img;
                resolve();
            };
            
            img.onerror = () => {
                console.error(`Failed to load image: ${src}`);
                resolve();
            };
        });
        
        imagePromises.push(promise);
    }

    return Promise.all(imagePromises).then(() => {
        playerImage.src = imageCache.playerShip.src;
        backgroundImage = imageCache.background; // Store background reference
        return imageCache;
    });
}

// Update game initialization
async function initGame() {
    try {
        // Show loading indicator if needed
        // document.getElementById('loadingScreen').style.display = 'block';
        
        // Wait for images to load
        await preloadImages();
        
        // Initialize game
        resizeCanvas();
        resetGame();
        
        // Hide loading indicator if used
        // document.getElementById('loadingScreen').style.display = 'none';
        
        // Start game loop
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error('Failed to initialize game:', error);
        // Handle initialization error
    }
}

// Update the load event listener
window.addEventListener('load', async () => {
    await handleOrientationChange();
    initGame();
});

// Add orientation lock warning for better gameplay
if (isMobile) {
    if (window.matchMedia("(orientation: portrait)").matches) {
        console.log("Game works best in landscape mode on mobile devices");
    }
}

// Update touch controls
if (isMobile) {
    const mobileControls = document.querySelector('.mobile-controls');
    mobileControls.style.display = 'flex';
    
    // Touch control elements
    const touchControls = {
        left: document.getElementById('leftButton'),
        right: document.getElementById('rightButton'),
        shoot: document.getElementById('shootButton')
    };
    
    // Touch state tracking
    const touchState = {
        left: false,
        right: false
    };
    
    // Prevent default touch behavior
    document.addEventListener('touchstart', (e) => {
        e.preventDefault();
    }, { passive: false });
    
    // Left button controls
    touchControls.left.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchState.left = true;
        player.dx = -player.speed;
    }, { passive: false });
    
    touchControls.left.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchState.left = false;
        if (!touchState.right) {
            player.dx = 0;
        } else {
            player.dx = player.speed;
        }
    }, { passive: false });
    
    // Right button controls
    touchControls.right.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchState.right = true;
        player.dx = player.speed;
    }, { passive: false });
    
    touchControls.right.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchState.right = false;
        if (!touchState.left) {
            player.dx = 0;
        } else {
            player.dx = -player.speed;
        }
    }, { passive: false });
    
    // Shoot button control
    touchControls.shoot.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (player.canShoot && !gameOver) {
            projectiles.push({
                x: player.x,
                y: player.y - 20
            });
            
            const buffedCooldown = player.shootCooldown * (1 - attackSpeedBuff);
            
            player.canShoot = false;
            setTimeout(() => {
                player.canShoot = true;
            }, buffedCooldown);
        }
    }, { passive: false });
}

// Tambahkan setelah touch controls dan sebelum game loop
// Keyboard controls untuk desktop
document.addEventListener('keydown', (e) => {
    if (gameOver) return;
    
    if (e.key === 'ArrowLeft') {
        player.dx = -player.speed;
    }
    if (e.key === 'ArrowRight') {
        player.dx = player.speed;
    }
    if (e.key === ' ' && player.canShoot) {
        projectiles.push({
            x: player.x,
            y: player.y - 20
        });
            
        const buffedCooldown = player.shootCooldown * (1 - attackSpeedBuff);
        
        player.canShoot = false;
        setTimeout(() => {
            player.canShoot = true;
        }, buffedCooldown);
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' && player.dx < 0) {
        player.dx = 0;
    }
    if (e.key === 'ArrowRight' && player.dx > 0) {
        player.dx = 0;
    }
});

// Update game loop untuk better performance
let lastTime = 0;
const FPS = 60;
const frameTime = 1000 / FPS;

// Add these variables to your game state section
let alienStepProgress = 0;
let isAlienStepping = false;
const STEP_DURATION = 500; // Time in ms to complete one step down

// Update your gameLoop function to draw background first
function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    
    const deltaTime = timestamp - lastTime;
    
    if (deltaTime >= frameTime) {
        if (!gameOver) {
            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw background first!
            drawBackground();
            
            // Calculate scale factor for consistent movement
            const scaleFactor = deltaTime / (1000/60);
            
            // Update with scale factor
            updatePlayer(scaleFactor);
            updateProjectiles(scaleFactor);
            updateEnemyLasers(scaleFactor);
            updateAliens(scaleFactor, deltaTime); // Pass deltaTime here
            
            // Render game elements
            drawPlayer();
            drawProjectiles();
            drawEnemyLasers();
            drawAliens();
            
            checkCollisions();
            
            lastTime = timestamp;
        }
    }
    
    // Use RequestAnimationFrame with mobile optimization
    if ('requestIdleCallback' in window && isMobile) {
        requestIdleCallback(() => requestAnimationFrame(gameLoop));
    } else {
        requestAnimationFrame(gameLoop);
    }
}

function updatePlayer(scaleFactor) {
    const movement = player.dx * scaleFactor;
    const newX = player.x + movement;
    
    if (newX > player.width/2 && newX < canvas.width - player.width/2) {
        player.x = newX;
    }
}

function updateProjectiles(scaleFactor) {
    const movement = projectileSpeed * scaleFactor;
    
    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].y -= movement;
        if (projectiles[i].y < 0) {
            projectiles.splice(i, 1);
        }
    }
}

function updateEnemyLasers(scaleFactor) {
    const movement = enemyLaserSpeed * scaleFactor;
    
    for (let i = enemyLasers.length - 1; i >= 0; i--) {
        enemyLasers[i].y += movement;
        if (enemyLasers[i].y > canvas.height) {
            enemyLasers.splice(i, 1);
        }
    }
}

function updateAliens(scaleFactor, deltaTime) {
    let touchedEdge = false;
    const movement = alienSpeed * alienDirection * scaleFactor;
    
    // Handle horizontal movement and edge detection
    aliens.forEach(alien => {
        if (!alien.alive) return;
        
        // Only move horizontally if not in stepping motion
        if (!isAlienStepping) {
            const newX = alien.x + movement;
            
            // Check if would touch edge after movement
            if (newX <= 0 || newX + alienWidth >= canvas.width) {
                touchedEdge = true;
            } else {
                alien.x = newX;
            }
        }
        
        // Alien shooting logic
        if (Math.random() < ALIEN_SHOOT_CHANCE * scaleFactor) {
            enemyLasers.push({
                x: alien.x + alienWidth/2,
                y: alien.y + alienHeight
            });
        }
    });
    
    // Handle direction change and stepping down
    if (touchedEdge) {
        alienDirection *= -1; // Reverse direction
        
        if (!isAlienStepping) {
            isAlienStepping = true;
            alienStepProgress = 0;
        }
    }
    
    // Handle gradual descent
    if (isAlienStepping) {
        alienStepProgress += deltaTime;
        const stepRatio = Math.min(1, alienStepProgress / STEP_DURATION);
        
        aliens.forEach(alien => {
            if (alien.alive) {
                // Calculate smooth step down movement
                const stepDistance = alienStepDown * stepRatio * scaleFactor;
                alien.y += stepDistance * 0.016; // Smooth stepping
            }
        });
        
        // Reset stepping state when complete
        if (alienStepProgress >= STEP_DURATION) {
            isAlienStepping = false;
            alienStepProgress = 0;
        }
    }
}

// Update inisialisasi game
function initGame() {
    resizeCanvas();
    resetGame();
    gameLoop();
}


// Initialize aliens
function initAliens() {
    aliens = [];
    for (let row = 0; row < alienRows; row++) {
        for (let col = 0; col < alienCols; col++) {
            aliens.push({
                x: col * (alienWidth + alienPadding) + alienPadding,
                y: row * (alienHeight + alienPadding) + alienPadding + 30,
                width: alienWidth,
                height: alienHeight,
                alive: true
            });
        }
    }
}

// Update the drawPlayer function
function drawPlayer() {
    try {
        // Save the current context state
        ctx.save();
        
        // Optional: Add image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the player image
        ctx.drawImage(
            playerImage,
            player.x - player.width/2,
            player.y,
            player.width,
            player.height
        );
        
        // Restore the context state
        ctx.restore();
    } catch (error) {
        console.error('Error drawing player:', error);
        // Fallback to a basic shape if image fails
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(
            player.x - player.width/2,
            player.y,
            player.width,
            player.height
        );
    }
}

function drawProjectiles() {
    ctx.fillStyle = '#fff';
    projectiles.forEach(projectile => {
        ctx.fillRect(projectile.x - 2, projectile.y - 20, 4, 10);
    });
}

function drawAliens() {
    aliens.forEach(alien => {
        if (alien.alive) {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(alien.x, alien.y, alien.width, alien.height);
        }
    });
}

function drawEnemyLasers() {
    ctx.fillStyle = '#ff0000';
    enemyLasers.forEach(laser => {
        ctx.fillRect(laser.x - 2, laser.y, 4, 10);
    });
}

// Collision detection
function checkCollisions() {
    // Check enemy laser collision with player
    enemyLasers.forEach((laser, index) => {
        if (laser.x >= player.x - player.width/2 &&
            laser.x <= player.x + player.width/2 &&
            laser.y >= player.y &&
            laser.y <= player.y + player.height) {
            
            // Kurangi HP player (damage 10)
            updatePlayerHp(-10);
            enemyLasers.splice(index, 1);
        }
    });

    // Check alien collision with player
    aliens.forEach(alien => {
        if (!alien.alive) return;
        
        // Collision with player
        if (alien.y + alienHeight >= player.y &&
            alien.x < player.x + player.width/2 &&
            alien.x + alienWidth > player.x - player.width/2) {
            handleGameOver();
        }
        
        // Game over if aliens reach bottom
        if (alien.y + alienHeight >= canvas.height) {
            handleGameOver();
        }
    });

    // Existing projectile collision code
    if (!gameOver) {
        projectiles.forEach((projectile, projectileIndex) => {
            aliens.forEach(alien => {
                if (alien.alive && 
                    projectile.x >= alien.x && 
                    projectile.x <= alien.x + alien.width &&
                    projectile.y >= alien.y && 
                    projectile.y <= alien.y + alien.height) {
                                   
                    alien.alive = false;
                    projectiles.splice(projectileIndex, 1);
                    score += 10;
                    scoreElement.textContent = score;
                    
                    enemiesDefeated++;
                    if (enemiesDefeated >= 10) {
                        enemiesDefeated = 0;
                        if (attackSpeedBuff < MAX_ATTACK_SPEED_BUFF) {
                            attackSpeedBuff += BUFF_INCREMENT;
                            console.log(`Attack Speed Buff: ${(attackSpeedBuff * 100).toFixed(0)}%`);
                        }
                    }
                    
                    checkLevelComplete();
                }
            });
        });
    }
}

function checkLevelComplete() {
    if (aliens.every(alien => !alien.alive)) {
        level++;
        levelElement.textContent = level;
        alienSpeed += 0.5;
        initAliens();
    }
}

// Tambahkan fungsi untuk update HP player
function updatePlayerHp(change) {
    player.currentHp = Math.max(0, Math.min(player.maxHp, player.currentHp + change));
    const hpPercent = (player.currentHp / player.maxHp) * 100;
    hpFill.style.setProperty('--hp-percent', `${hpPercent}%`);
    hpText.textContent = `${player.currentHp}/${player.maxHp}`;
    
    if (player.currentHp <= 0) {
        handleGameOver();
    }
}

// Tambahkan fungsi untuk menghandle game over
function handleGameOver() {
    gameOver = true;
    gameOverScreen.style.display = 'block';
    finalScoreElement.textContent = score;
}

// Tambahkan fungsi reset game
function resetGame() {
    // Reset game state
    gameOver = false;
    score = 0;
    level = 1;
    alienSpeed = 1;
    enemiesDefeated = 0;
    attackSpeedBuff = 0;
    
    // Clear all arrays
    projectiles = [];
    enemyLasers = [];
    aliens = []; // Clear aliens array completely
    
    // Reset UI elements
    scoreElement.textContent = score;
    levelElement.textContent = level;
    gameOverScreen.style.display = 'none';
    
    // Reset player position and health
    player.x = canvas.width / 2;
    player.currentHp = player.maxHp;
    updatePlayerHp(0);
    
    // Reinitialize aliens with fresh array
    initAliens();
    
    // Reset alien movement state
    alienDirection = 1;
    isAlienStepping = false;
    alienStepProgress = 0;
}

// Tambahkan event listener untuk restart button
restartButton.addEventListener('click', () => {
    resetGame();
    gameLoop();
});

// Add drawBackground function
function drawBackground() {
    if (backgroundImage) {
        // Option 1: Stretch to canvas size
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
        
    }
}

// Add this after your other event listeners
backgroundImage.onerror = function() {
    console.error('Failed to load background image');
    // Fallback to solid color
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
};
