import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Car } from './car.js';
import { Road } from './road.js';
import { InputHandler } from './input.js';
import { SkyDome } from './sky.js';

// Game variables
let mixer;
let car;
let road;
let input;
let sky;
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
// Enable tone mapping for better visual quality
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3; // Increased for better reflections
// Enable output encoding for better color representation
renderer.outputEncoding = THREE.sRGBEncoding;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

// Add lights
const ambientLight = new THREE.AmbientLight(0xffa07a, 0.7); // Warmer ambient light for evening
scene.add(ambientLight);

// Main directional light (sun)
const directionalLight = new THREE.DirectionalLight(0xff8040, 1.8); // Brighter orange evening color
directionalLight.position.set(5, 10, 7.5);
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

// Add a hemisphere light for better ambient lighting
const hemisphereLight = new THREE.HemisphereLight(0xff9966, 0x553344, 0.7); // Enhanced evening colors
scene.add(hemisphereLight);

// Add a subtle orange point light to enhance the evening glow
const sunsetGlow = new THREE.PointLight(0xff6622, 1.2, 250);
sunsetGlow.position.set(-50, 15, 0);
scene.add(sunsetGlow);

// Add additional lights for better reflections
const frontLight = new THREE.SpotLight(0xffaa77, 0.9, 100, Math.PI / 6, 0.5);
frontLight.position.set(0, 10, 20);
scene.add(frontLight);

const backLight = new THREE.SpotLight(0xff8844, 0.7, 100, Math.PI / 6, 0.5);
backLight.position.set(0, 10, -20);
scene.add(backLight);

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
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });

    // Add model to car container
    carObject.add(model);

    // Initialize car physics and controls
    car = new Car(carObject, model);

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

    if (mixer) {
        mixer.update(delta);
    }

    // Update sky (no need to change time for fixed evening)
    sky.updateSunPosition(timeOfDay);

    // Update directional light position to match sun
    directionalLight.position.copy(sky.sun);
    directionalLight.position.multiplyScalar(20);

    // Animate evening glow with gentle pulsing
    sunsetGlow.intensity = 1.2 + Math.sin(clock.elapsedTime * 0.3) * 0.2;
    
    // Slightly adjust color temperature over time for a more dynamic feel
    const warmthFactor = 0.5 + Math.sin(clock.elapsedTime * 0.1) * 0.05;
    sunsetGlow.color.setRGB(1.0, 0.4 + warmthFactor, 0.1 + warmthFactor * 0.5);

    // Update additional lights to follow the car
    if (car) {
        frontLight.position.z = car.object.position.z + 20;
        backLight.position.z = car.object.position.z - 20;

        // Update car based on input
        car.update(delta, input.keys);

        // Update camera to follow car
        cameraTarget.position.copy(car.object.position);
        cameraTarget.rotation.y = car.object.rotation.y;

        camera.lookAt(new THREE.Vector3(
            car.object.position.x,
            car.object.position.y + 2, // Look much higher up
            car.object.position.z
        ));
        // Update road segments based on car position
        road.update(car.object.position);

    }

    renderer.render(scene, camera);
}