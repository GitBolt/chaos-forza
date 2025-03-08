import * as THREE from 'three';
import { RocketParticles } from './rocketParticles.js';

export class Rocket {
    constructor(scene) {
        this.scene = scene;
        this.object = new THREE.Object3D();
        this.speed = 0;
        this.maxSpeed = 10  ; // Increased max speed
        this.acceleration = 2 ; // Increased acceleration
        this.active = false;
        this.distanceTraveled = 0; // Track distance traveled
        this.explosionRange = 4; // Distance after which rocket will explode
        this.exploded = false;
        
        // Create rocket body
        this.createRocketBody();
        
        // Create particle system for exhaust
        this.particles = new RocketParticles(scene);
        
        // Add rocket to scene but make it invisible initially
        this.scene.add(this.object);
        this.object.visible = false;
        
        // Sound effects (if needed)
        this.launchSound = null;
        this.flyingSound = null;
    }
    
    createRocketBody() {
        // Rocket body (cylinder) - oriented to point forward
        const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xdddddd,
            metalness: 0.7,
            roughness: 0.3
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.rotation.x = Math.PI / 2; // Rotate to point forward along Z axis
        this.body.position.y = 0;
        this.object.add(this.body);
        
        // Rocket nose cone
        const noseGeometry = new THREE.ConeGeometry(0.2, 0.5, 16);
        const noseMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            metalness: 0.5,
            roughness: 0.5
        });
        this.nose = new THREE.Mesh(noseGeometry, noseMaterial);
        this.nose.rotation.x = -Math.PI / 2; // Point forward along Z axis
        this.nose.position.z = -1.25; // Position at front of rocket
        this.object.add(this.nose);
        
        // Rocket fins (4 of them)
        const finGeometry = new THREE.BoxGeometry(0.05, 0.5, 0.5);
        const finMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            metalness: 0.6,
            roughness: 0.4
        });
        
        // Create 4 fins around the rocket
        for (let i = 0; i < 4; i++) {
            const fin = new THREE.Mesh(finGeometry, finMaterial);
            const angle = (i * Math.PI / 2);
            fin.position.set(
                Math.sin(angle) * 0.3,
                Math.cos(angle) * 0.3,
                0.5 // Back of the rocket
            );
            fin.rotation.z = angle;
            this.object.add(fin);
        }
        
        // Add exhaust point light
        this.exhaustLight = new THREE.PointLight(0xff6600, 2, 5);
        this.exhaustLight.position.set(0, 0, 1.2); // Behind the rocket
        this.object.add(this.exhaustLight);
        
        // Enable shadows
        this.body.castShadow = true;
        this.nose.castShadow = true;
    }
    
    launch(position, direction, carSpeed = 0) {
        // Reset rocket state
        this.distanceTraveled = 0;
        this.exploded = false;
        
        // Set rocket position slightly in front of the car
        const offset = direction.clone().multiplyScalar(3); // 3 units in front of car
        this.object.position.copy(position).add(offset);
        this.object.position.y += 1.0; // Position slightly above the ground
        
        // Set rocket orientation to match the car's forward direction
        // We need to point the rocket's -Z axis in the direction of travel
        const targetPos = new THREE.Vector3().copy(this.object.position).add(direction);
        this.object.lookAt(targetPos);
        
        // Activate rocket
        this.active = true;
        this.object.visible = true;
        
        // Store the direction for movement
        this.moveDirection = direction.clone().normalize();
        
        // Set initial speed based on car's speed plus base rocket speed
        // This ensures the rocket always moves faster than the car
        this.speed = 0.8 + carSpeed; // Base speed + car speed
        
        // Play launch sound if available
        if (this.launchSound) {
            this.launchSound.play();
        }
        
        console.log("Rocket launched from position:", position);
    }
    
    explode() {
        if (this.exploded) return;
        
        this.exploded = true;
        console.log("Rocket exploding at position:", this.object.position);
        
        // Create explosion effect
        this.createExplosion();
        
        // Reset the rocket
        this.reset();
    }
    
    createExplosion() {
        // Create a simple explosion effect
        const explosionLight = new THREE.PointLight(0xff5500, 5, 20);
        explosionLight.position.copy(this.object.position);
        this.scene.add(explosionLight);
        
        // Create explosion particles
        const explosionGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const explosionMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff5500,
            transparent: true,
            opacity: 1
        });
        const explosionMesh = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosionMesh.position.copy(this.object.position);
        this.scene.add(explosionMesh);
        
        // Animate explosion
        const expandAndFade = () => {
            explosionMesh.scale.multiplyScalar(1.1);
            explosionLight.intensity *= 0.9;
            explosionMaterial.opacity *= 0.9;
            
            if (explosionMaterial.opacity > 0.05) {
                requestAnimationFrame(expandAndFade);
            } else {
                // Clean up
                this.scene.remove(explosionMesh);
                this.scene.remove(explosionLight);
                explosionGeometry.dispose();
                explosionMaterial.dispose();
            }
        };
        
        expandAndFade();
    }
    
    update(delta) {
        if (!this.active) return;
        
        // If exploded, don't update
        if (this.exploded) return;
        
        // Accelerate the rocket
        if (this.speed < this.maxSpeed) {
            this.speed += this.acceleration * delta;
        }
        
        // Calculate movement distance for this frame
        const moveDistance = this.speed * delta;
        this.distanceTraveled += moveDistance;
        
        // Move the rocket forward in the stored direction
        this.object.position.x += this.moveDirection.x * this.speed;
        this.object.position.y += this.moveDirection.y * this.speed;
        this.object.position.z += this.moveDirection.z * this.speed;
        
        // Flicker the exhaust light for effect
        this.exhaustLight.intensity = 2 + Math.random() * 1;
        
        // Emit particles from the exhaust
        const exhaustPosition = new THREE.Vector3(0, 0, 1.2); // Local position of exhaust
        exhaustPosition.applyMatrix4(this.object.matrixWorld);
        
        this.particles.emitParticles(
            exhaustPosition,
            this.moveDirection.clone().negate(), // Particles go opposite direction
            Math.floor(5 + this.speed * 3) // More particles at higher speeds
        );
        
        // Update particles
        this.particles.update(delta);
        
        // Check if rocket has traveled the explosion range
        if (this.distanceTraveled >= this.explosionRange) {
            console.log("Rocket reached explosion range, exploding at distance:", this.distanceTraveled);
            this.explode();
            return;
        }
    }
    
    reset() {
        this.active = false;
        this.object.visible = false;
        this.speed = 0;
        this.distanceTraveled = 0;
        
        // Stop sounds if playing
        if (this.flyingSound && this.flyingSound.isPlaying) {
            this.flyingSound.stop();
        }
    }
    
    dispose() {
        // Clean up resources
        this.scene.remove(this.object);
        this.particles.dispose();
        
        // Dispose geometries and materials
        this.body.geometry.dispose();
        this.body.material.dispose();
        this.nose.geometry.dispose();
        this.nose.material.dispose();
    }
} 