import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class EnemyVehicle {
    constructor(scene, position, road) {
        this.scene = scene;
        this.road = road;
        this.object = new THREE.Object3D();
        this.model = null;
        this.destroyed = false;
        this.explosionComplete = false;
        
        // Position the enemy vehicle
        this.object.position.copy(position);
        
        // Random rotation
        this.object.rotation.y = Math.random() * Math.PI * 2;
        
        // Physics properties
        this.speed = 0.5 + Math.random() * 1.5; // Random speed between 0.5 and 2
        this.direction = new THREE.Vector3(0, 0, -1); // Forward direction
        this.turnSpeed = 0.02 + Math.random() * 0.03; // Random turn speed
        
        // Movement pattern
        this.movementPattern = Math.floor(Math.random() * 3); // 0: straight, 1: circular, 2: random
        this.directionChangeTimer = 0;
        this.directionChangeDuration = 2 + Math.random() * 3; // Change direction every 2-5 seconds
        
        // Boundary check
        this.boundaryRadius = road.boundaryRadius - 10; // Stay within road boundary with buffer
        this.lastValidPosition = new THREE.Vector3();
        
        // Collision properties - increased for better gameplay
        this.collisionRadius = 3.5; // Increased radius for collision detection
        
        // Explosion properties
        this.explosionParticles = [];
        this.smokeParticles = [];
        
        // Add to scene
        this.scene.add(this.object);
        
        // Load model
        this.loadModel();
    }
    
    loadModel() {
        const loader = new GLTFLoader();
        
        loader.load('agera.glb', (gltf) => {
            this.model = gltf.scene;
            
            // Scale and position the model - reduce size to 0.2 of original (was 0.25)
            this.model.scale.set(0.2, 0.2, 0.2);
            
            // Apply materials
            this.applyMaterials();
            
            // Enable shadows
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            
            // Add model to object
            this.object.add(this.model);
            
            // Store initial position as last valid position
            this.lastValidPosition.copy(this.object.position);
        });
    }
    
    applyMaterials() {
        // Use a simpler material for better performance with many vehicles
        this.model.traverse((child) => {
            if (child.isMesh) {
                // Create a copy of the original material to preserve textures
                const originalMaterial = child.material;
                
                // Create a simpler material with lower quality settings
                const material = new THREE.MeshStandardMaterial({
                    map: originalMaterial.map,
                    color: originalMaterial.color || new THREE.Color(0x888888),
                    metalness: 0.6,
                    roughness: 0.4,
                    // Remove environment maps and complex properties for performance
                });
                
                // Apply the new material
                child.material = material;
            }
        });
    }
    
    update(delta, playerPosition) {
        if (this.destroyed) {
            // No need to do anything - explosion is handled by timeouts
            return;
        }
        
        // Store last valid position
        if (this.isWithinBoundary(this.object.position)) {
            this.lastValidPosition.copy(this.object.position);
        }
        
        // Update direction change timer
        this.directionChangeTimer += delta;
        if (this.directionChangeTimer >= this.directionChangeDuration) {
            this.directionChangeTimer = 0;
            this.changeDirection(playerPosition);
        }
        
        // Update movement - simplified
        this.updateSimpleMovement(delta);
        
        // Check boundary
        if (!this.isWithinBoundary(this.object.position)) {
            // If outside boundary, return to last valid position and change direction
            this.object.position.copy(this.lastValidPosition);
            this.changeDirection(playerPosition);
        }
    }
    
    updateSimpleMovement(delta) {
        // Update direction vector based on rotation
        this.direction.set(0, 0, -1).applyQuaternion(this.object.quaternion);
        
        // Move forward - simplified movement with no physics
        const movement = this.direction.clone().multiplyScalar(this.speed * delta * 30);
        this.object.position.add(movement);
        
        // Apply very simple movement pattern
        if (this.movementPattern === 1) { // Circular
            // Gradually turn in one direction
            this.object.rotation.y += this.turnSpeed * delta * 30;
        }
    }
    
    changeDirection(playerPosition) {
        // Randomly change movement pattern
        this.movementPattern = Math.floor(Math.random() * 3);
        
        // Sometimes target the player
        if (Math.random() < 0.3 && playerPosition) {
            // Calculate direction to player
            const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.object.position);
            // Set rotation to face player with some randomness
            this.object.rotation.y = Math.atan2(toPlayer.x, toPlayer.z) + (Math.random() - 0.5) * 0.5;
        } else {
            // Random new direction
            this.object.rotation.y = Math.random() * Math.PI * 2;
        }
        
        // Randomize speed
        this.speed = 0.5 + Math.random() * 1.5;
    }
    
    isWithinBoundary(position) {
        // Check if position is within the circular boundary
        const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
        return distanceFromCenter < this.boundaryRadius;
    }
    
    checkCollision(rocketPosition, explosionRadius) {
        if (this.destroyed) return false;
        
        // Calculate distance between rocket and enemy vehicle
        const distance = this.object.position.distanceTo(rocketPosition);
        
        // Check if within explosion radius
        return distance < (this.collisionRadius + explosionRadius);
    }
    
    destroy(explosionPosition) {
        if (this.destroyed) return;
        
        this.destroyed = true;
        
        // Create extremely simplified explosion effect
        this.createSimpleExplosion(explosionPosition || this.object.position);
        
        // Hide the model
        if (this.model) {
            this.model.visible = false;
        }
        
        // Mark explosion as complete after a short delay
        setTimeout(() => {
            this.explosionComplete = true;
        }, 500);
    }
    
    createSimpleExplosion(position) {
        // Create an enhanced flash effect
        this.createFlashEffect(position);
        
        // Create a single explosion sphere
        const explosionGeometry = new THREE.SphereGeometry(3, 8, 8);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff5500,
            transparent: true,
            opacity: 0.7
        });
        
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.copy(position);
        this.scene.add(explosion);
        
        // Animate the explosion sphere
        let scale = 0.1;
        const expandAndFade = () => {
            scale += 0.15;
            explosion.scale.set(scale, scale, scale);
            explosionMaterial.opacity -= 0.05;
            
            if (explosionMaterial.opacity > 0.05) {
                requestAnimationFrame(expandAndFade);
            } else {
                this.scene.remove(explosion);
                explosionGeometry.dispose();
                explosionMaterial.dispose();
            }
        };
        
        requestAnimationFrame(expandAndFade);
    }
    
    createFlashEffect(position) {
        // Create a flash light
        const flashLight = new THREE.PointLight(0xffaa00, 10, 15);
        flashLight.position.copy(position);
        this.scene.add(flashLight);
        
        // Create a visual flash sphere
        const flashGeometry = new THREE.SphereGeometry(2, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffaa,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const flashSphere = new THREE.Mesh(flashGeometry, flashMaterial);
        flashSphere.position.copy(position);
        this.scene.add(flashSphere);
        
        // Animate the flash
        let flashScale = 0.1;
        let intensity = 10;
        
        const animateFlash = () => {
            // Expand flash sphere
            flashScale += 0.2;
            flashSphere.scale.set(flashScale, flashScale, flashScale);
            
            // Fade out flash sphere
            flashMaterial.opacity -= 0.1;
            
            // Reduce light intensity
            intensity *= 0.8;
            flashLight.intensity = intensity;
            
            if (flashMaterial.opacity > 0.05) {
                requestAnimationFrame(animateFlash);
            } else {
                // Clean up
                this.scene.remove(flashSphere);
                this.scene.remove(flashLight);
                flashGeometry.dispose();
                flashMaterial.dispose();
            }
        };
        
        requestAnimationFrame(animateFlash);
    }
    
    updateExplosion(delta) {
        // Not needed anymore - explosion is handled by simple timeouts
    }
    
    dispose() {
        // Remove from scene
        this.scene.remove(this.object);
        
        // Dispose of model
        if (this.model) {
            this.model.traverse((child) => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    child.material.dispose();
                }
            });
        }
    }
} 