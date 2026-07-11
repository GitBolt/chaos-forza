import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Car } from './car.js';
import { Road } from './road.js';
import { InputHandler } from './input.js';
import { SkyDome } from './sky.js';
import { Rocket } from './rocket.js';
import { EnemyVehicle } from './enemyVehicle.js';

// The module runs after the loading markup has been parsed. Progress is tied to
// the player model instead of an artificial five-second timer.
const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
let loadingScreenHidden = false;

function setLoadingProgress(progress, message = 'Loading game assets...') {
    const percentage = Math.round(THREE.MathUtils.clamp(progress, 0, 1) * 100);
    if (loadingBar) loadingBar.style.width = `${percentage}%`;
    if (loadingText) loadingText.textContent = `${message} ${percentage}%`;
}

function hideLoadingScreen() {
    if (!loadingScreen || loadingScreenHidden) return;
    loadingScreenHidden = true;
    setLoadingProgress(1, 'Ready');
    loadingScreen.classList.add('fade-out');
    loadingScreen.addEventListener('transitionend', () => {
        loadingScreen.style.display = 'none';
    }, { once: true });
}

// Reuse decoded images requested by multiple materials. Each texture can still
// have its own wrapping/repeat settings while sharing the expensive image data.
THREE.Cache.enabled = true;

// Function to optimize textures based on device capability
function optimizeTexture(texture, isLowQuality = false) {
    // Only apply optimizations to mobile devices
    if (isMobile) {
        if (isLowEndMobile) {
            // More aggressive optimization for low-end mobile
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapNearestFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = 1;
        } else {
            // Moderate optimization for regular mobile
            texture.generateMipmaps = true;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.magFilter = THREE.LinearFilter;
            texture.anisotropy = 2;
        }
    } else {
        // Full quality for desktop
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = 4;
    }
    
    return texture;
}

// Device detection for performance optimization
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const cpuCores = navigator.hardwareConcurrency || 4;
const deviceMemory = navigator.deviceMemory || 4;
const isLowEndMobile = isMobile && cpuCores <= 4;
const isIntegratedLaptop = !isMobile && (cpuCores <= 8 || deviceMemory <= 8 || window.devicePixelRatio > 1.5);

// Check for user-defined quality settings in localStorage
const userQualityPreset = localStorage.getItem('qualityPreset');
const userShadowQuality = localStorage.getItem('shadowQuality');
const userEnemyCount = localStorage.getItem('enemyCount');

// Performance settings based on device capability
const QUALITY = {
    LOW: {
        pixelRatio: 0.65,
        enemyCount: 6,
        shadowMapEnabled: false,
        antialias: false,
        drawDistance: 300,
        targetFPS: 30
    },
    MEDIUM: {
        pixelRatio: 1,
        enemyCount: 10,
        shadowMapEnabled: true,
        shadowMapType: THREE.BasicShadowMap,
        antialias: false,
        drawDistance: 500,
        targetFPS: 60
    },
    HIGH: {
        pixelRatio: Math.min(window.devicePixelRatio, 1.35),
        enemyCount: 16,
        shadowMapEnabled: true,
        shadowMapType: THREE.BasicShadowMap,
        antialias: false,
        drawDistance: 1000,
        targetFPS: 60
    }
};

// Select quality preset based on device and user settings
let qualitySettings;

if (userQualityPreset === 'low') {
    qualitySettings = QUALITY.LOW;
} else if (userQualityPreset === 'medium') {
    qualitySettings = QUALITY.MEDIUM;
} else if (userQualityPreset === 'high') {
    qualitySettings = QUALITY.HIGH;
} else {
    // Auto detect based on device
    qualitySettings = isLowEndMobile ? QUALITY.LOW : ((isMobile || isIntegratedLaptop) ? QUALITY.MEDIUM : QUALITY.HIGH);
}

// Override specific settings if user has set them
if (userShadowQuality === 'off') {
    qualitySettings.shadowMapEnabled = false;
} else if (userShadowQuality === 'low') {
    qualitySettings.shadowMapEnabled = true;
    qualitySettings.shadowMapType = THREE.BasicShadowMap;
} else if (userShadowQuality === 'high') {
    qualitySettings.shadowMapEnabled = true;
    qualitySettings.shadowMapType = THREE.PCFSoftShadowMap;
}

if (userEnemyCount) {
    const parsedEnemyCount = Number.parseInt(userEnemyCount, 10);
    if (Number.isFinite(parsedEnemyCount)) {
        qualitySettings.enemyCount = Math.min(Math.max(parsedEnemyCount, 4), QUALITY.HIGH.enemyCount);
    }
}

console.log("Device detected as:", isMobile ? "Mobile" : "Desktop", "- Quality:", 
    userQualityPreset || (isLowEndMobile ? "LOW" : ((isMobile || isIntegratedLaptop) ? "MEDIUM" : "HIGH")));

// Listen for quality settings changes from UI
window.addEventListener('qualitySettingsChanged', (event) => {
    const { qualityPreset, shadowQuality, enemyCount } = event.detail;
    
    // Save settings to localStorage
    localStorage.setItem('qualityPreset', qualityPreset);
    localStorage.setItem('shadowQuality', shadowQuality);
    localStorage.setItem('enemyCount', enemyCount);
    
    console.log("Quality settings changed:", qualityPreset, shadowQuality, enemyCount);
});

// Game variables
let mixer;
let car;
let road;
let input;
let sky;
let rockets = []; // Array to store multiple rockets
let rocketCooldown = 0;
let timeOfDay = 0.78; // Evening time (matching sky.js)
let enemyVehicles = []; // Array to store enemy vehicles
const ENEMY_COUNT = qualitySettings.enemyCount; // Adjusted based on device capability
const ENEMY_SPAWN_BATCH_SIZE = Math.min(5, Math.ceil(ENEMY_COUNT / 8)); // Spawn enemies in batches to prevent lag
let enemySpawnTimer = 0; // Timer for spawning enemy batches

// UI variables
let killCount = 0;
let killStreakCount = 0;
let lastKillTime = 0;
let killCountElement;
let killNotificationElement;

// Simple audio elements
const explosionSound = new Audio('sound/explosion.mp3');
explosionSound.volume = 0.7;

const rocketSound = new Audio('sound/rocket.mp3');
rocketSound.volume = 0.5;

const carSound = new Audio('sound/car.mp3');
carSound.volume = 0.3;
carSound.loop = true;

// Function to play explosion sound
function playExplosionSound() {
    // Clone the audio to allow multiple sounds at once
    const sound = explosionSound.cloneNode();
    sound.volume = 0.7;
    sound.play().catch(err => console.log('Error playing explosion sound:', err));
}

// Function to play rocket sound
function playRocketSound() {
    // Clone the audio to allow multiple sounds at once
    const sound = rocketSound.cloneNode();
    sound.volume = 0.5;
    sound.play().catch(err => console.log('Error playing rocket sound:', err));
}

// Function to update car sound
function updateCarSound(speed, isAccelerating, isBraking) {
    // Start the sound if it's not already playing and the car is moving
    if (!carSound.paused && Math.abs(speed) < 0.1) {
        carSound.pause();
    } else if (carSound.paused && Math.abs(speed) > 0.1) {
        carSound.play().catch(err => console.log('Error playing car sound:', err));
    }
    
    // Adjust playback rate based on speed
    if (!carSound.paused) {
        // Base pitch is 1.0
        const speedRatio = Math.min(Math.abs(speed) / 45, 1);
        let pitch = 0.65 + speedRatio * 1.1;
        
        // Increase pitch during acceleration
        if (isAccelerating) {
            pitch *= 1.2;
        }
        
        // Decrease pitch during braking
        if (isBraking) {
            pitch *= 0.8;
        }
        
        // Clamp pitch between reasonable values
        pitch = Math.max(0.5, Math.min(2.0, pitch));
        
        // Set the playback rate (pitch)
        carSound.playbackRate = pitch;
        
        // Adjust volume based on speed
        carSound.volume = 0.2 + speedRatio * 0.5;
    }
}

// Initialize UI elements after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    killCountElement = document.getElementById('kill-count');
    killNotificationElement = document.getElementById('kill-notification');
    
    // Add animation style
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: translate(-50%, -50%) scale(1.2); }
            50% { transform: translate(-50%, -50%) scale(1.3); }
            100% { transform: translate(-50%, -50%) scale(1.2); }
        }
    `;
    document.head.appendChild(style);
    
    // Hide quality settings button - as requested by user
    const qualityButton = document.getElementById('quality-settings');
    if (qualityButton) {
        qualityButton.style.display = 'none';
    }
    
    // Auto-show mobile controls on mobile devices
    const mobileControls = document.getElementById('mobile-controls');
    if (isMobile && mobileControls) {
        mobileControls.style.display = 'block';
    }
});

// Three.js setup
const clock = new THREE.Clock();
const container = document.getElementById('container');

// Use the existing isLowEndMobile variable defined earlier

const renderer = new THREE.WebGLRenderer({
    antialias: qualitySettings.antialias,
    powerPreference: "high-performance",
    precision: (isMobile || isIntegratedLaptop) ? "mediump" : "highp",
    stencil: false,
    depth: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, qualitySettings.pixelRatio));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = qualitySettings.shadowMapEnabled;
renderer.shadowMap.type = qualitySettings.shadowMapType || THREE.BasicShadowMap;
// Enable physically correct lighting with reduced quality on mobile
renderer.physicallyCorrectLights = true;
// Use better tone mapping on mobile
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = isMobile ? 0.6 : 0.4; // Slightly higher exposure for mobile
// Enable output encoding for better color representation
renderer.outputEncoding = THREE.sRGBEncoding;

// Performance optimizations
renderer.sortObjects = true; // Enable sorting for better rendering order
renderer.autoClear = true; // Changed from false to true - let Three.js handle clearing

const reusableCameraLookTarget = new THREE.Vector3();
const reusableRocketPosition = new THREE.Vector3();
const reusableRocketDirection = new THREE.Vector3();

container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// Add minimal lighting - HDR will provide most of the lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Lower intensity ambient light
scene.add(ambientLight);

// Main directional light (sun)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7); // Lower intensity directional light
directionalLight.position.set(0, 1, 0); // Overhead position
directionalLight.castShadow = qualitySettings.shadowMapEnabled;
// Set up shadow properties
directionalLight.shadow.mapSize.width = qualitySettings === QUALITY.HIGH ? 1024 : 512;
directionalLight.shadow.mapSize.height = qualitySettings === QUALITY.HIGH ? 1024 : 512;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
scene.add(directionalLight);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 1000000);
camera.position.set(0, 5, -10);

// Create a follow camera setup
const cameraTarget = new THREE.Object3D();
scene.add(cameraTarget);

// Initialize sky with sunset
sky = new SkyDome(scene);

// Initialize input handler
input = new InputHandler();

// Create road
road = new Road(scene);

// Initialize the car
const carObject = new THREE.Object3D();
scene.add(carObject);

// Initialize the DRACO loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://unpkg.com/three@0.154.0/examples/jsm/libs/draco/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

// Load car model
loader.load('car.glb', function (gltf) {
    const model = gltf.scene;
    model.position.set(0, 0, 0);
    model.scale.set(1, 1, 1);

    // Enable shadows for the car model
    model.traverse(function (object) {
        if (object.isMesh) {
            object.castShadow = qualitySettings.shadowMapEnabled;
            object.receiveShadow = qualitySettings.shadowMapEnabled;
            
            // Optimize textures only on mobile
            if (object.material && object.material.map && isMobile) {
                object.material.map = optimizeTexture(object.material.map, isMobile);
            }
        }
    });

    // Add model to car container
    carObject.add(model);

    // Initialize car physics and controls
    car = new Car(carObject, model);

    // Set the car's boundary radius to match the road's boundary
    car.boundaryRadius = road.boundaryRadius - 5; // 5 units buffer

    // Setup camera
    cameraTarget.position.copy(carObject.position);
    cameraTarget.position.y += 2;
    cameraTarget.position.z -= 5;

    // Position camera relative to car
    camera.position.set(0, 3, 10);
    camera.lookAt(carObject.position);

    // Attach camera to target
    cameraTarget.add(camera);

    if (gltf.animations && gltf.animations.length > 0) {
        mixer = new THREE.AnimationMixer(model);
        mixer.clipAction(gltf.animations[0]).play();
    }
    
    // Compile the initial scene while it is still covered. This prevents the
    // first steering/fire input from paying shader-compilation cost.
    renderer.compile(scene, camera);

    // Create enemy vehicles after player car is loaded
    createEnemyVehicles();

    // Render a complete frame before revealing the game.
    renderer.render(scene, camera);
    hideLoadingScreen();

    // Start animation loop
    clock.start();
    animate();

}, function (event) {
    if (event.total > 0) {
        setLoadingProgress(event.loaded / event.total);
    }
}, function (e) {
    console.error(e);
    if (loadingText) loadingText.textContent = 'Unable to load the player vehicle';
});

// Handle window resize
window.onresize = function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};

// Function to create enemy vehicles
function createEnemyVehicles() {
    // Create initial batch of enemies
    spawnEnemyBatch(ENEMY_SPAWN_BATCH_SIZE);
    
    // Set up interval to spawn remaining enemies in batches
    const spawnInterval = setInterval(() => {
        if (enemyVehicles.length < ENEMY_COUNT) {
            spawnEnemyBatch(ENEMY_SPAWN_BATCH_SIZE);
        } else {
            clearInterval(spawnInterval);
        }
    }, 2000); // Spawn a batch every 2 seconds
}

function createEnemySpawnPosition(minDistance = 90, maxDistance = 420) {
    const angle = Math.random() * Math.PI * 2;
    const distance = minDistance + Math.random() * (maxDistance - minDistance);
    const origin = car ? car.object.position : scene.position;
    const position = new THREE.Vector3(
        origin.x + Math.cos(angle) * distance,
        0,
        origin.z + Math.sin(angle) * distance
    );

    // Keep spawns comfortably inside the arena even when the player is near a wall.
    const maximumRadius = road.boundaryRadius * 0.82;
    const radius = Math.hypot(position.x, position.z);
    if (radius > maximumRadius) {
        const inwardScale = maximumRadius / radius;
        position.x *= inwardScale;
        position.z *= inwardScale;
    }

    return position;
}

// Function to spawn a batch of enemy vehicles
function spawnEnemyBatch(batchSize) {
    const count = Math.min(batchSize, ENEMY_COUNT - enemyVehicles.length);
    
    for (let i = 0; i < count; i++) {
        const position = createEnemySpawnPosition();
        
        // Create enemy vehicle
        const enemyVehicle = new EnemyVehicle(scene, position, road);
        
        // Add to array
        enemyVehicles.push(enemyVehicle);
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    // Avoid a huge simulation jump after tab switches or a temporary stall.
    const delta = Math.min(clock.getDelta(), 0.05);

    // Update rocket cooldown
    if (rocketCooldown > 0) {
        rocketCooldown -= delta;
    }

    // Check for space key to launch rocket
    if (input.keys[' '] && rocketCooldown <= 0 && car) {
        reusableRocketPosition.copy(car.object.position);
        
        reusableRocketDirection.set(0, 0, -1).applyQuaternion(car.object.quaternion);
        
        // Check if car is in the air (verticalPosition > 0)
        const isCarInAir = car.verticalPosition > 0;
        
        // Create a new rocket and launch it
        const newRocket = new Rocket(scene, null); // No need to pass soundManager
        newRocket.launch(reusableRocketPosition, reusableRocketDirection, car.speed, isCarInAir);
        rockets.push(newRocket);
        
        // Play rocket sound
        playRocketSound();
        
        // Set cooldown to prevent rapid firing
        rocketCooldown = 0.75;
    }

    // Update all rockets
    for (let i = rockets.length - 1; i >= 0; i--) {
        rockets[i].update(delta);
        
        // Check for collisions with enemy vehicles
        if (!rockets[i].exploded) {
            checkRocketEnemyCollisions(rockets[i]);
        }
        
        // Remove exploded rockets that have completed their animation
        if (rockets[i].exploded && rockets[i].explosionComplete) {
            // Ensure proper cleanup
            rockets[i].dispose();
            rockets.splice(i, 1);
            
            // Limit the number of active rockets to prevent memory issues
            if (rockets.length > (isMobile ? 5 : 10)) {
                // If we have too many rockets, remove the oldest ones
                const oldRocket = rockets.shift();
                oldRocket.dispose();
            }
        }
    }
    
    // Update enemy vehicles
    updateEnemyVehicles(delta);

    if (mixer) {
        mixer.update(delta);
    }

    // Call sky update for compatibility
    if (sky) {
        sky.updateSunPosition(0.5);
    }

    // Update car
    if (car) {
        // Update car based on input
        car.update(delta, input.keys, road);
        
        // Update car sound
        updateCarSound(car.speed, car.isAccelerating, car.isBraking);

        // Update camera to follow car
        cameraTarget.position.copy(car.object.position);
        cameraTarget.rotation.y = car.object.rotation.y;

        reusableCameraLookTarget.set(
            car.object.position.x,
            car.object.position.y + 2, // Look higher up
            car.object.position.z
        );
        camera.lookAt(reusableCameraLookTarget);
        
        // Update road segments based on car position
        road.update(car.object.position);
    }

    // Standard rendering
    renderer.render(scene, camera);
}

// Function to update enemy vehicles
function updateEnemyVehicles(delta) {
    // Update each enemy vehicle
    for (let i = enemyVehicles.length - 1; i >= 0; i--) {
        // If this vehicle is destroyed, always update it to complete explosion animation
        if (enemyVehicles[i].destroyed) {
            enemyVehicles[i].update(delta, car ? car.object.position : null);
            
            // Remove destroyed vehicles that have completed their explosion animation
            if (enemyVehicles[i].explosionComplete) {
                enemyVehicles[i].dispose();
                enemyVehicles.splice(i, 1);
                
                // Create a new enemy vehicle to replace the destroyed one
                if (car && enemyVehicles.length < ENEMY_COUNT) {
                    // Delay creation of new vehicles to prevent lag spikes
                    setTimeout(() => {
                        // Create random position within the boundary but away from the player
                        const position = createEnemySpawnPosition(100, 380);
                        
                        // Create new enemy vehicle
                        const enemyVehicle = new EnemyVehicle(scene, position, road);
                        enemyVehicles.push(enemyVehicle);
                    }, 2000); // Increased delay to 2 seconds
                }
            }
        } 
        // Enemy movement is intentionally lightweight. Updating it every frame
        // removes the visible 10 FPS stepping caused by the old six-frame
        // scheduler, without changing model or texture quality.
        else {
            enemyVehicles[i].update(delta, car ? car.object.position : null);
        }
    }
}

// Function to check for collisions between rockets and enemy vehicles
function checkRocketEnemyCollisions(rocket) {
    if (rocket.exploded) return;
    
    // Get rocket position
    const rocketPosition = rocket.object.position;
    
    // Use spatial partitioning for more efficient collision detection
    // Divide the world into a grid and only check vehicles in nearby grid cells
    const gridSize = 20; // Size of each grid cell
    const gridX = Math.floor(rocketPosition.x / gridSize);
    const gridZ = Math.floor(rocketPosition.z / gridSize);
    
    // Check vehicles in current and adjacent grid cells
    // Loop through all enemies (in a real game, you'd use a spatial hash map)
    for (const enemy of enemyVehicles) {
        // Skip already destroyed enemies
        if (enemy.destroyed) continue;
        
        // Get enemy grid position
        const enemyGridX = Math.floor(enemy.object.position.x / gridSize);
        const enemyGridZ = Math.floor(enemy.object.position.z / gridSize);
        
        // Check if in adjacent cells (including diagonals)
        if (Math.abs(enemyGridX - gridX) <= 1 && Math.abs(enemyGridZ - gridZ) <= 1) {
            // Quick distance check (squared distance for performance)
            const dx = enemy.object.position.x - rocketPosition.x;
            const dz = enemy.object.position.z - rocketPosition.z;
            const distanceSquared = dx * dx + dz * dz;
            
            // If potentially within range, add to candidates
            if (distanceSquared < 100) { // 10 units squared
                if (enemy.checkCollision(rocketPosition, 6)) {
                    rocket.explode();
                    setTimeout(() => {
                        enemy.destroy(rocketPosition);
                        updateKillCount();
                        playExplosionSound();
                    }, 50);
                    return;
                }
            }
        }
    }
}

// Function to update kill count and show notification
function updateKillCount() {
    try {
        // Increment kill count
        killCount++;
        
        // Update kill count display if element exists
        if (killCountElement) {
            killCountElement.textContent = killCount;
            
            // Add a quick scale animation to the kill count
            killCountElement.style.transform = 'scale(1.3)';
            setTimeout(() => {
                killCountElement.style.transform = 'scale(1)';
            }, 200);
        }
        
        // Check for kill streak
        const currentTime = Date.now();
        if (currentTime - lastKillTime < 5000) { // 5 seconds for streak
            killStreakCount++;
        } else {
            killStreakCount = 1;
        }
        lastKillTime = currentTime;
        
        // Show appropriate notification based on streak
        let message = '';
        if (killStreakCount >= 5) {
            message = 'RAMPAGE!';
        } else if (killStreakCount >= 3) {
            message = 'KILLING SPREE!';
        } else if (killStreakCount === 2) {
            message = 'DOUBLE KILL!';
        } else {
            message = 'ENEMY DESTROYED!';
        }
        
        // Display notification if element exists
        if (killNotificationElement) {
            // Set the notification text
            killNotificationElement.textContent = message;
            
            // Add the show class to make it visible
            killNotificationElement.classList.add('show');
            
            // Add a pulse animation effect
            killNotificationElement.style.animation = 'none';
            setTimeout(() => {
                killNotificationElement.style.animation = 'pulse 0.5s 3';
            }, 10);
            
            // Hide notification after a delay
            setTimeout(() => {
                killNotificationElement.classList.remove('show');
            }, 2000);
        }
    } catch (error) {
        console.error('Error updating kill count:', error);
    }
}
