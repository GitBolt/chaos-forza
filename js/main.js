import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Car } from './car.js';
import { Road } from './road.js';
import { InputHandler } from './input.js';
import { SkyDome } from './sky.js';
import { Rocket } from './rocket.js';
import { EnemyVehicle } from './enemyVehicle.js';

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
const ENEMY_COUNT = 40; // Increased from 3 to 40 as requested
const ENEMY_SPAWN_BATCH_SIZE = 5; // Spawn enemies in batches to prevent lag
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
});

// Three.js setup
const clock = new THREE.Clock();
const container = document.getElementById('container');

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
// Enable shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
// Enable physically correct lighting
renderer.physicallyCorrectLights = true;
// Enable tone mapping for better HDR visibility
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.4; // Even lower exposure to see HDR sky details better
// Enable output encoding for better color representation
renderer.outputEncoding = THREE.sRGBEncoding;

// Performance optimizations
renderer.sortObjects = true; // Enable sorting for better rendering order
renderer.autoClear = true; // Changed from false to true - let Three.js handle clearing

// Create depth material for pre-pass (not using it for now as it might cause issues)
// const depthMaterial = new THREE.MeshDepthMaterial();

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
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
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

// Initialize the rocket
// rocket = new Rocket(scene);

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
            object.castShadow = true;
            object.receiveShadow = true;
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

    renderer.setAnimationLoop(animate);

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
            if (rockets.length > 10) {
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
    const maxUpdatesPerFrame = 5; // Increased from 1 to 5 since we have more vehicles
    let updatesThisFrame = 0;
    
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
            // Update based on distance from player and frame count
            const frameOffset = i % 6; // Spread updates across 6 frames
            const currentFrame = Math.floor(Date.now() / 16.67) % 6; // Assuming 60fps (16.67ms per frame)
            
            // Only update if it's this vehicle's turn or it's close to the player
            const updateThisFrame = frameOffset === currentFrame;
            
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
            killNotificationElement.textContent = message;
            killNotificationElement.classList.add('show');
            
            // Hide notification after a delay
            setTimeout(() => {
                if (killNotificationElement) {
                    killNotificationElement.classList.remove('show');
                }
            }, 2000);
        }
        
        // Log to console as fallback
        console.log(`Kill count: ${killCount} - ${message}`);
    } catch (error) {
        console.error('Error updating kill count:', error);
    }
}

// Render with depth pre-pass for better performance - disabled for now
// function renderWithDepthPrePass() {
//     // Clear both the color and depth buffers
//     renderer.clear();
// 
//     // 1. Render depth only
//     scene.overrideMaterial = depthMaterial;
//     renderer.render(scene, camera);
// 
//     // 2. Render scene normally, using the depth information from the previous pass
//     scene.overrideMaterial = null;
//     renderer.render(scene, camera);
// }