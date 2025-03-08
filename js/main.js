import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Car } from './car.js';
import { Road } from './road.js';
import { InputHandler } from './input.js';

// Game variables
let mixer;
let car;
let road;
let input;

// Three.js setup
const clock = new THREE.Clock();
const container = document.getElementById('container');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 5, -10);

// Create a follow camera setup
const cameraTarget = new THREE.Object3D();
scene.add(cameraTarget);

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
    
    if (car) {
        // Update car based on input
        car.update(delta, input.keys);
        
        // Update camera to follow car
        cameraTarget.position.copy(car.object.position);
        cameraTarget.rotation.y = car.object.rotation.y;
        
        // Update road segments based on car position
        road.update(car.object.position);
    }

    renderer.render(scene, camera);
} 