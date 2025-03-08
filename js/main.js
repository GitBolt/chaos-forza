import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Car } from './car.js';
import { Road } from './road.js';
import { InputHandler } from './input.js';
import { SkyDome } from './sky.js';
import { Rocket } from './rocket.js';

// Game variables
let mixer;
let car;
let road;
let input;
let sky;
let rocket;
let rocketCooldown = 0;
let timeOfDay = 0.78; // Evening time (matching sky.js)

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
rocket = new Rocket(scene);

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

// Animation loop
function animate() {
    const delta = clock.getDelta();

    // Update rocket cooldown
    if (rocketCooldown > 0) {
        rocketCooldown -= delta;
    }

    // Check for space key to launch rocket
    if (input.keys[' '] && rocketCooldown <= 0 && car) {
        // Get car position
        const position = car.object.position.clone();
        
        // Get forward direction from car - this is the direction the car is facing
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(car.object.quaternion);
        
        // Launch rocket in the forward direction of the car
        // Pass the car's current speed to the rocket
        rocket.launch(position, direction, car.speed);
        
        // Set cooldown to prevent rapid firing
        rocketCooldown = 0.5; // 0.5 seconds cooldown
    }

    // Update rocket
    if (rocket) {
        rocket.update(delta);
    }

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