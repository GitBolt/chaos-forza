import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Car } from './car.js';
import { Road } from './road.js';
import { InputHandler } from './input.js';
import { SkyDome } from './sky.js';
import { Rocket } from './rocket.js';
import { EnemyVehicle } from './enemyVehicle.js';

// Loading screen handling
let loadingScreen;
let loadingBar;
let loadingText;

// Initialize loading screen
document.addEventListener('DOMContentLoaded', () => {
    loadingScreen = document.getElementById('loading-screen');
    loadingBar = document.getElementById('loading-bar');
    loadingText = document.getElementById('loading-text');
    
    // Animate loading bar
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += 2; // Increment by 2% each time
        if (progress > 100) {
            progress = 100;
            clearInterval(loadingInterval);
            
            // Hide loading screen after 5 seconds total
            setTimeout(() => {
                loadingScreen.classList.add('fade-out');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 500); // Wait for fade-out animation to complete
            }, 5000 - (progress * 50)); // Adjust remaining time to total 5 seconds
        }
        
        // Update loading bar and text
        loadingBar.style.width = progress + '%';
        loadingText.textContent = `Loading game assets... ${Math.floor(progress)}%`;
    }, 100); // Update every 100ms
});

// Memory management - texture cache to avoid duplicate loading
const textureCache = new Map();

// Texture loader with cache
function loadTextureWithCache(path) {
    if (textureCache.has(path)) {
        return textureCache.get(path);
    }
    
    const texture = new THREE.TextureLoader().load(path);
    textureCache.set(path, texture);
    return texture;
}

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

// Device detection for performance optimization - only detect mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isLowEndMobile = isMobile && (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

// Check for user-defined quality settings in localStorage
const userQualityPreset = localStorage.getItem('qualityPreset');
const userShadowQuality = localStorage.getItem('shadowQuality');
const userEnemyCount = localStorage.getItem('enemyCount');

// Performance settings based on device capability
const QUALITY = {
    LOW: {
        pixelRatio: 0.5,
        enemyCount: 10,
        shadowMapEnabled: false,
        antialias: false,
        maxUpdatesPerFrame: 2,
        drawDistance: 300,
        targetFPS: 30
    },
    MEDIUM: {
        pixelRatio: 0.75,
        enemyCount: 20,
        shadowMapEnabled: true,
        shadowMapType: THREE.BasicShadowMap,
        antialias: false,
        maxUpdatesPerFrame: 3,
        drawDistance: 500,
        targetFPS: 60
    },
    HIGH: {
        pixelRatio: window.devicePixelRatio,
        enemyCount: 40,
        shadowMapEnabled: true,
        shadowMapType: THREE.PCFSoftShadowMap,
        antialias: true,
        maxUpdatesPerFrame: 5,
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
    qualitySettings = isLowEndMobile ? QUALITY.LOW : (isMobile ? QUALITY.MEDIUM : QUALITY.HIGH);
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
    qualitySettings.enemyCount = parseInt(userEnemyCount);
}

console.log("Device detected as:", isMobile ? "Mobile" : "Desktop", "- Quality:", 
    userQualityPreset || (isLowEndMobile ? "LOW" : (isMobile ? "MEDIUM" : "HIGH")));

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
        let pitch = 0.5 + Math.abs(speed) / 4; // Adjust pitch based on speed
        
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
        carSound.volume = 0.2 + Math.min(0.6, Math.abs(speed) / 4);
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
    antialias: !isLowEndMobile, // Only disable on low-end mobile
    powerPreference: "high-performance",
    precision: isMobile ? "mediump" : "highp", // Use medium precision on mobile for balance
    stencil: false, // Disable stencil buffer if not needed
    depth: true
});
// Moderately reduce pixel ratio on mobile for better performance
renderer.setPixelRatio(isMobile ? (isLowEndMobile ? 0.75 : Math.min(window.devicePixelRatio, 1)) : window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
// Enable shadows with reduced quality on mobile
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = isMobile ? THREE.BasicShadowMap : THREE.PCFSoftShadowMap;
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

// Create a frustum for culling objects outside the camera view
const frustum = new THREE.Frustum();
const cameraViewProjectionMatrix = new THREE.Matrix4();

container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// Add minimal lighting - HDR will provide most of the lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); // Lower intensity ambient light
scene.add(ambientLight);

// Main directional light (sun)
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7); // Lower intensity directional light
directionalLight.position.set(0, 1, 0); // Overhead position
directionalLight.castShadow = true;
// Set up shadow properties
directionalLight.shadow.mapSize.width = isMobile ? 1024 : 2048;
directionalLight.shadow.mapSize.height = isMobile ? 1024 : 2048;
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

// Create a texture cache cleaner
function cleanupUnusedTextures() {
    // This function should be called periodically to free memory
    // It checks if textures are still in use and removes them from cache if not
    
    // Get all materials in the scene
    const materialsInUse = new Set();
    scene.traverse((object) => {
        if (object.material) {
            if (Array.isArray(object.material)) {
                object.material.forEach(mat => {
                    if (mat.map) materialsInUse.add(mat.map);
                    if (mat.normalMap) materialsInUse.add(mat.normalMap);
                    if (mat.roughnessMap) materialsInUse.add(mat.roughnessMap);
                    if (mat.metalnessMap) materialsInUse.add(mat.metalnessMap);
                });
            } else {
                if (object.material.map) materialsInUse.add(object.material.map);
                if (object.material.normalMap) materialsInUse.add(object.material.normalMap);
                if (object.material.roughnessMap) materialsInUse.add(object.material.roughnessMap);
                if (object.material.metalnessMap) materialsInUse.add(object.material.metalnessMap);
            }
        }
    });
    
    // Remove textures that are not in use
    for (const [path, texture] of textureCache.entries()) {
        if (!materialsInUse.has(texture)) {
            texture.dispose();
            textureCache.delete(path);
        }
    }
}

// Set up periodic texture cleanup - only on mobile
if (isMobile) {
    setInterval(cleanupUnusedTextures, 30000); // Every 30 seconds
}

// Load car model
loader.load('car.glb', function (gltf) {
    const model = gltf.scene;
    model.position.set(0, 0, 0);
    model.scale.set(1, 1, 1);

    // Enable shadows for the car model
    model.traverse(function (object) {
        if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
            
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
    
    // Create enemy vehicles after player car is loaded
    createEnemyVehicles();

    // Start animation loop
    animate();

}, undefined, function (e) {
    console.error(e);
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

// Function to spawn a batch of enemy vehicles
function spawnEnemyBatch(batchSize) {
    const count = Math.min(batchSize, ENEMY_COUNT - enemyVehicles.length);
    
    for (let i = 0; i < count; i++) {
        // Create random position within the boundary
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (road.boundaryRadius * 0.8); // 80% of boundary radius
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        
        // Create position vector
        const position = new THREE.Vector3(x, 0, z);
        
        // Create enemy vehicle
        const enemyVehicle = new EnemyVehicle(scene, position, road);
        
        // Add to array
        enemyVehicles.push(enemyVehicle);
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();

    // Update rocket cooldown
    if (rocketCooldown > 0) {
        rocketCooldown -= delta;
    }

    // Check for space key to launch rocket
    if (input.keys[' '] && rocketCooldown <= 0 && car) {
        // Get car position - ensure we're getting the complete position with height
        const position = car.object.position.clone();
        
        // Get forward direction from car - this is the direction the car is facing
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(car.object.quaternion);
        
        // Create a new rocket and launch it
        const newRocket = new Rocket(scene, null); // No need to pass soundManager
        newRocket.launch(position, direction, car.speed);
        rockets.push(newRocket);
        
        // Play rocket sound
        playRocketSound();
        
        // Set cooldown to prevent rapid firing
        rocketCooldown = 1.5; // 1.5 seconds cooldown
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

        camera.lookAt(new THREE.Vector3(
            car.object.position.x,
            car.object.position.y + 2, // Look higher up
            car.object.position.z
        ));
        
        // Update road segments based on car position
        road.update(car.object.position);
    }

    // Standard rendering
    renderer.render(scene, camera);
}

// Function to update enemy vehicles
function updateEnemyVehicles(delta) {
    // Only update a subset of vehicles per frame to prevent lag
    const maxUpdatesPerFrame = isMobile ? 3 : 5;
    let updatesThisFrame = 0;
    
    // Update camera frustum for culling
    camera.updateMatrixWorld();
    cameraViewProjectionMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
    
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
                        let position;
                        do {
                            const angle = Math.random() * Math.PI * 2;
                            const distance = Math.random() * (road.boundaryRadius * 0.8);
                            const x = Math.cos(angle) * distance;
                            const z = Math.sin(angle) * distance;
                            position = new THREE.Vector3(x, 0, z);
                        } while (position.distanceTo(car.object.position) < 50); // Ensure it's at least 50 units away from player
                        
                        // Create new enemy vehicle
                        const enemyVehicle = new EnemyVehicle(scene, position, road);
                        enemyVehicles.push(enemyVehicle);
                    }, 2000); // Increased delay to 2 seconds
                }
            }
        } 
        // For non-destroyed vehicles, use a more efficient update strategy
        else {
            // Create a sphere for frustum culling check
            const enemyPosition = enemyVehicles[i].object.position;
            const boundingSphere = new THREE.Sphere(enemyPosition, 5);
            
            // Only update if in frustum or close to player
            const inFrustum = frustum.intersectsSphere(boundingSphere);
            const closeToPlayer = car && enemyPosition.distanceTo(car.object.position) < (isMobile ? 500 : 1000);
            
            // Update based on distance from player, frame count, and frustum culling
            const frameOffset = i % 6; // Spread updates across 6 frames
            const currentFrame = Math.floor(Date.now() / 16.67) % 6; // Assuming 60fps (16.67ms per frame)
            
            // Only update if it's this vehicle's turn or it's close to the player and in view
            const updateThisFrame = (frameOffset === currentFrame) && (inFrustum || closeToPlayer);
            
            if (updateThisFrame && updatesThisFrame < maxUpdatesPerFrame) {
                enemyVehicles[i].update(delta, car ? car.object.position : null);
                updatesThisFrame++;
            }
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
    const nearbyEnemies = [];
    
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
                nearbyEnemies.push(enemy);
                
                // Limit the number of enemies to check
                if (nearbyEnemies.length >= 5) break;
            }
        }
    }
    
    // Check actual collisions only for nearby enemies
    for (const enemy of nearbyEnemies) {
        // Check if enemy is within explosion range
        if (enemy.checkCollision(rocketPosition, 6)) {
            // Explode the rocket
            rocket.explode();
            
            // Destroy the enemy vehicle with a slight delay to prevent simultaneous explosions
            setTimeout(() => {
                enemy.destroy(rocketPosition);
                
                // Update kill count and show notification
                updateKillCount();
                
                // Play explosion sound - simple approach
                playExplosionSound();
            }, 50);
            
            // No need to check other enemies for this rocket
            break;
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