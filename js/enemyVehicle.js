import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Device detection for performance optimization
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIntegratedLaptop = !isMobile && ((navigator.hardwareConcurrency || 4) <= 8 || (navigator.deviceMemory || 4) <= 8 || window.devicePixelRatio > 1.5);
const isSafari = /^((?!chrome|chromium|android).)*safari/i.test(navigator.userAgent);
const enemyModelPath = isSafari ? 'mclaren-lod.glb' : 'mclaren.glb';
let sharedEnemyModelPromise = null;
let sharedEnemyModel = null;

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
        this.speed = 11 + Math.random() * 6;
        this.direction = new THREE.Vector3(0, 0, -1); // Forward direction
        this.turnSpeed = 1.1 + Math.random() * 0.7;
        this.targetHeading = this.object.rotation.y;
        this.aggression = 0.35 + Math.random() * 0.6;
        this.preferredDistance = 20 + Math.random() * 35;
        this.orbitDirection = Math.random() < 0.5 ? -1 : 1;
        
        // Movement pattern
        this.movementPattern = Math.floor(Math.random() * 3); // 0: straight, 1: circular, 2: random
        this.directionChangeTimer = 0;
        this.directionChangeDuration = 1.2 + Math.random() * 2;
        
        // Boundary check
        this.boundaryRadius = road.boundaryRadius - 10; // Stay within road boundary with buffer
        this.lastValidPosition = new THREE.Vector3();
        this.movement = new THREE.Vector3();
        this.toPlayer = new THREE.Vector3();
        
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
        if (!sharedEnemyModelPromise) {
            const loader = new GLTFLoader();
            sharedEnemyModelPromise = new Promise((resolve, reject) => {
                loader.load(enemyModelPath, (gltf) => {
                    sharedEnemyModel = gltf.scene;
                    this.prepareSharedModel(sharedEnemyModel);
                    resolve(sharedEnemyModel);
                }, undefined, reject);
            });
        }

        sharedEnemyModelPromise.then((sourceModel) => {
            if (this.destroyed) return;

            this.model = sourceModel.clone(true);
            const scale = 1;
            this.model.scale.set(scale, scale, scale);
            this.model.rotation.y = Math.PI;
            this.object.add(this.model);
            this.lastValidPosition.copy(this.object.position);
        }).catch((error) => console.error('Error loading enemy vehicle model:', error));
    }
    
    prepareSharedModel(model) {
        // Use a simpler material for better performance with many vehicles
        model.traverse((child) => {
            if (child.isMesh) {
                // Create a copy of the original material to preserve textures
                const originalMaterial = child.material;
                
                // Create an even simpler material for mobile devices
                if (isMobile) {
                    const basicMaterial = new THREE.MeshBasicMaterial({
                        map: originalMaterial.map,
                        color: originalMaterial.color || new THREE.Color(0x888888),
                        // No lighting calculations for maximum performance
                    });
                    child.material = basicMaterial;
                } else {
                    // Standard material for better devices
                    const material = new THREE.MeshStandardMaterial({
                        map: originalMaterial.map,
                        color: originalMaterial.color || new THREE.Color(0x888888),
                        metalness: 0.6,
                        roughness: 0.4,
                        // Remove environment maps and complex properties for performance
                    });
                    child.material = material;
                }

                child.castShadow = !isMobile && !isIntegratedLaptop;
                child.receiveShadow = !isMobile && !isIntegratedLaptop;
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
        
        this.updateMovement(delta, playerPosition);
        
        // Check boundary
        if (!this.isWithinBoundary(this.object.position)) {
            // If outside boundary, return to last valid position and change direction
            this.object.position.copy(this.lastValidPosition);
            this.changeDirection(playerPosition);
        }
    }
    
    updateMovement(delta, playerPosition) {
        const radiusSquared = this.object.position.x * this.object.position.x +
            this.object.position.z * this.object.position.z;
        const boundarySteeringRadius = this.boundaryRadius * 0.86;

        if (radiusSquared > boundarySteeringRadius * boundarySteeringRadius) {
            // Begin turning toward the arena center before reaching the wall.
            this.targetHeading = Math.atan2(this.object.position.x, this.object.position.z);
        } else if (playerPosition) {
            this.toPlayer.subVectors(playerPosition, this.object.position);
            const distanceToPlayer = this.toPlayer.length();

            if (distanceToPlayer < 500 && this.aggression > 0.42) {
                const pursuitHeading = Math.atan2(-this.toPlayer.x, -this.toPlayer.z);
                // Circle instead of piling directly on top of the player.
                const orbitAmount = distanceToPlayer < this.preferredDistance
                    ? this.orbitDirection * Math.PI * 0.42
                    : 0;
                this.targetHeading = pursuitHeading + orbitAmount;
            }
        }

        const headingDelta = Math.atan2(
            Math.sin(this.targetHeading - this.object.rotation.y),
            Math.cos(this.targetHeading - this.object.rotation.y)
        );
        const maximumTurn = this.turnSpeed * delta;
        this.object.rotation.y += THREE.MathUtils.clamp(headingDelta, -maximumTurn, maximumTurn);

        // Update direction vector based on rotation
        this.direction.set(0, 0, -1).applyQuaternion(this.object.quaternion);
        
        this.movement.copy(this.direction).multiplyScalar(this.speed * delta);
        this.object.position.add(this.movement);
    }
    
    changeDirection(playerPosition) {
        if (playerPosition && Math.random() < this.aggression) {
            this.toPlayer.subVectors(playerPosition, this.object.position);
            this.targetHeading = Math.atan2(-this.toPlayer.x, -this.toPlayer.z) +
                (Math.random() - 0.5) * 0.35;
        } else {
            this.targetHeading += (Math.random() - 0.5) * Math.PI * 0.9;
        }

        this.speed = 11 + Math.random() * 7;
        this.directionChangeDuration = 1.2 + Math.random() * 2;
    }
    
    isWithinBoundary(position) {
        // Check if position is within the circular boundary
        const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
        return distanceFromCenter < this.boundaryRadius;
    }
    
    checkCollision(rocketPosition, explosionRadius) {
        if (this.destroyed) return false;
        
        // Calculate distance between rocket and enemy vehicle
        const collisionDistance = this.collisionRadius + explosionRadius;
        return this.object.position.distanceToSquared(rocketPosition) < collisionDistance * collisionDistance;
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
        }, isMobile ? 300 : 500); // Shorter explosion time on mobile
    }
    
    createSimpleExplosion(position) {
        // Create an enhanced flash effect
        this.createFlashEffect(position);
        
        // Skip additional explosion effects on mobile devices
        if (isMobile) {
            return;
        }
        
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
        // Create a flash light - only on desktop
        if (!isMobile) {
            const flashLight = new THREE.PointLight(0xffaa00, 10, 15);
            flashLight.position.copy(position);
            this.scene.add(flashLight);
            
            // Reduce light intensity quickly
            setTimeout(() => {
                this.scene.remove(flashLight);
            }, 100);
        }
        
        // Create a visual flash sphere - simpler on mobile
        const flashGeometry = new THREE.SphereGeometry(2, isMobile ? 4 : 8, isMobile ? 4 : 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffaa,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const flashSphere = new THREE.Mesh(flashGeometry, flashMaterial);
        flashSphere.position.copy(position);
        this.scene.add(flashSphere);
        
        // Animate the flash - simpler animation on mobile
        let flashScale = 0.1;
        let intensity = 10;
        
        const animateFlash = () => {
            // Expand flash sphere
            flashScale += isMobile ? 0.3 : 0.2;
            flashSphere.scale.set(flashScale, flashScale, flashScale);
            
            // Fade out flash sphere
            flashMaterial.opacity -= isMobile ? 0.2 : 0.1;
            
            // Reduce light intensity
            intensity *= 0.8;
            
            if (flashMaterial.opacity > 0.05) {
                requestAnimationFrame(animateFlash);
            } else {
                // Clean up
                this.scene.remove(flashSphere);
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
            this.object.remove(this.model);
            this.model = null;
        }
    }
}
