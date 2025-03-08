import * as THREE from 'three';
import { RocketParticles } from './rocketParticles.js';

export class Rocket {
    constructor(scene) {
        this.scene = scene;
        this.object = new THREE.Object3D();
        this.speed = 0;
        this.maxSpeed = 15; // Increased max speed
        this.acceleration = 3; // Increased acceleration
        this.active = false;
        this.distanceTraveled = 0; // Track distance traveled
        this.explosionRange = 10 ; // Distance after which rocket will explode
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
        
        // Explosion particles
        this.explosionParticles = [];
        this.debrisParticles = [];
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
        
        // Hide the rocket
        this.object.visible = false;
        
        // Play explosion sound if available
        // (You would add sound implementation here)
        
        // Reset the rocket after the explosion animation completes
        setTimeout(() => {
            this.reset();
        }, 3000); // Wait for explosion to finish
    }
    
    createExplosion() {
        const explosionPosition = this.object.position.clone();
        
        // Create explosion flash
        this.createExplosionFlash(explosionPosition);
        
        // Create explosion particles
        this.createExplosionParticles(explosionPosition);
        
        // Create debris particles
        this.createDebrisParticles(explosionPosition);
        
        // Create shockwave
        this.createShockwave(explosionPosition);
        
        // Create smoke cloud
        this.createSmokeCloud(explosionPosition);
    }
    
    createExplosionFlash(position) {
        // Create a bright flash at the explosion center
        const flashLight = new THREE.PointLight(0xffaa00, 15, 30);
        flashLight.position.copy(position);
        this.scene.add(flashLight);
        
        // Animate the flash - bright then fade out
        let intensity = 15;
        const flashAnimation = () => {
            intensity *= 0.9;
            flashLight.intensity = intensity;
            
            if (intensity > 0.1) {
                requestAnimationFrame(flashAnimation);
            } else {
                this.scene.remove(flashLight);
            }
        };
        
        flashAnimation();
    }
    
    createExplosionParticles(position) {
        // Create particle geometry for the explosion
        const particleCount = 300;
        const particleGeometry = new THREE.BufferGeometry();
        
        // Create a canvas texture for particles
        const particleTexture = this.createParticleTexture();
        
        // Create particle material
        const particleMaterial = new THREE.PointsMaterial({
            size: 1.2,
            map: particleTexture,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });
        
        // Create arrays for particle attributes
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        // Initialize particles with random positions in a sphere
        for (let i = 0; i < particleCount; i++) {
            // Random position in sphere - larger initial radius
            const radius = Math.random() * 1.0;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            // Convert spherical to cartesian coordinates
            positions[i * 3] = position.x + radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = position.y + radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = position.z + radius * Math.cos(phi);
            
            // Color gradient from yellow to orange to red
            const colorChoice = Math.random();
            if (colorChoice > 0.7) {
                // Bright center - white/yellow
                colors[i * 3] = 1.0;     // R
                colors[i * 3 + 1] = 1.0;  // G
                colors[i * 3 + 2] = 0.7;  // B
            } else if (colorChoice > 0.4) {
                // Mid flame - orange
                colors[i * 3] = 1.0;     // R
                colors[i * 3 + 1] = 0.6;  // G
                colors[i * 3 + 2] = 0.1;  // B
            } else {
                // Outer flame - deep red
                colors[i * 3] = 0.9;     // R
                colors[i * 3 + 1] = 0.2;  // G
                colors[i * 3 + 2] = 0.0;  // B
            }
            
            // Random sizes - larger
            sizes[i] = Math.random() * 2.5 + 1.0;
        }
        
        // Add attributes to geometry
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Create particle system
        const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(particleSystem);
        
        // Store particle data for animation
        this.explosionParticles.push({
            system: particleSystem,
            geometry: particleGeometry,
            material: particleMaterial,
            positions: positions,
            colors: colors,
            sizes: sizes,
            velocities: Array(particleCount).fill().map(() => new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            )),
            life: 0,
            maxLife: 2.5
        });
    }
    
    createDebrisParticles(position) {
        // Create debris particles - these are small pieces of the rocket
        const debrisCount = 50;
        const debrisGeometry = new THREE.BufferGeometry();
        const debrisMaterial = new THREE.PointsMaterial({
            size: 0.5,
            color: 0xaaaaaa,
            blending: THREE.NormalBlending,
            depthWrite: true,
            transparent: false
        });
        
        // Create arrays for debris attributes
        const positions = new Float32Array(debrisCount * 3);
        
        // Initialize debris with positions at explosion center
        for (let i = 0; i < debrisCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
        }
        
        // Add attributes to geometry
        debrisGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // Create debris system
        const debrisSystem = new THREE.Points(debrisGeometry, debrisMaterial);
        this.scene.add(debrisSystem);
        
        // Store debris data for animation
        this.debrisParticles.push({
            system: debrisSystem,
            geometry: debrisGeometry,
            positions: positions,
            velocities: Array(debrisCount).fill().map(() => new THREE.Vector3(
                (Math.random() - 0.5) * 25,
                Math.random() * 15 + 8,
                (Math.random() - 0.5) * 25
            )),
            gravity: 9.8,
            life: 0,
            maxLife: 3.5
        });
    }
    
    createShockwave(position) {
        // Create a shockwave ring that expands outward
        const ringGeometry = new THREE.RingGeometry(0.2, 0.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(position);
        
        // Orient the ring to be parallel to the ground
        ring.rotation.x = Math.PI / 2;
        
        this.scene.add(ring);
        
        // Animate the shockwave
        let scale = 1;
        const expandRate = 25;
        
        const expandShockwave = () => {
            scale += 0.3;
            ring.scale.set(scale, scale, scale);
            ringMaterial.opacity = 0.8 * (1 - (scale - 1) / expandRate);
            
            if (scale < expandRate) {
                requestAnimationFrame(expandShockwave);
            } else {
                this.scene.remove(ring);
                ringGeometry.dispose();
                ringMaterial.dispose();
            }
        };
        
        expandShockwave();
    }
    
    createSmokeCloud(position) {
        // Create a smoke cloud that rises and expands
        const smokeCount = 80;
        const smokeGeometry = new THREE.BufferGeometry();
        
        // Create a canvas texture for smoke particles
        const smokeTexture = this.createSmokeTexture();
        
        const smokeMaterial = new THREE.PointsMaterial({
            size: 3.0,
            map: smokeTexture,
            blending: THREE.NormalBlending,
            depthWrite: false,
            transparent: true,
            opacity: 0.7,
            color: 0x444444
        });
        
        // Create arrays for smoke attributes
        const positions = new Float32Array(smokeCount * 3);
        const sizes = new Float32Array(smokeCount);
        
        // Initialize smoke particles
        for (let i = 0; i < smokeCount; i++) {
            // Start at explosion center with wider spread
            positions[i * 3] = position.x + (Math.random() - 0.5) * 3;
            positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 3;
            positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 3;
            
            // Random sizes - larger
            sizes[i] = Math.random() * 5 + 2;
        }
        
        // Add attributes to geometry
        smokeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        smokeGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Create smoke system
        const smokeSystem = new THREE.Points(smokeGeometry, smokeMaterial);
        this.scene.add(smokeSystem);
        
        // Store smoke data for animation
        this.explosionParticles.push({
            system: smokeSystem,
            geometry: smokeGeometry,
            material: smokeMaterial,
            positions: positions,
            sizes: sizes,
            velocities: Array(smokeCount).fill().map(() => new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 3 + 1.5,
                (Math.random() - 0.5) * 3
            )),
            life: 0,
            maxLife: 6.0,
            isSmoke: true
        });
    }
    
    createParticleTexture() {
        // Create a canvas for the particle texture
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        
        const context = canvas.getContext('2d');
        
        // Create a radial gradient for a soft particle look
        const gradient = context.createRadialGradient(
            32, 32, 0,
            32, 32, 32
        );
        
        // Add color stops for a more realistic fire look
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 220, 100, 0.9)');
        gradient.addColorStop(0.4, 'rgba(255, 100, 50, 0.8)');
        gradient.addColorStop(0.8, 'rgba(200, 50, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        // Fill the canvas with the gradient
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        
        // Create a texture from the canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return texture;
    }
    
    createSmokeTexture() {
        // Create a canvas for the smoke texture
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        
        const context = canvas.getContext('2d');
        
        // Create a radial gradient for a soft smoke look
        const gradient = context.createRadialGradient(
            32, 32, 0,
            32, 32, 32
        );
        
        // Add color stops for a more realistic smoke look
        gradient.addColorStop(0, 'rgba(150, 150, 150, 0.9)');
        gradient.addColorStop(0.4, 'rgba(100, 100, 100, 0.7)');
        gradient.addColorStop(0.7, 'rgba(70, 70, 70, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        // Fill the canvas with the gradient
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        
        // Create a texture from the canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        
        return texture;
    }
    
    update(delta) {
        if (!this.active) return;
        
        // If exploded, update explosion particles
        if (this.exploded) {
            this.updateExplosionParticles(delta);
            return;
        }
        
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
        
        // Calculate exhaust position - simplified approach
        // Create a position slightly behind the rocket in the opposite direction of travel
        const exhaustPosition = new THREE.Vector3(
            this.object.position.x - this.moveDirection.x * 1.2,
            this.object.position.y - this.moveDirection.y * 1.2,
            this.object.position.z - this.moveDirection.z * 1.2
        );
        
        // Emit particles from the exhaust
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
    
    updateExplosionParticles(delta) {
        // Update explosion particles
        for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
            const particles = this.explosionParticles[i];
            
            // Update life
            particles.life += delta;
            
            if (particles.life >= particles.maxLife) {
                // Remove expired particle system
                this.scene.remove(particles.system);
                particles.geometry.dispose();
                particles.material.dispose();
                if (particles.material.map) {
                    particles.material.map.dispose();
                }
                this.explosionParticles.splice(i, 1);
            } else {
                // Update particle positions
                const positions = particles.positions;
                const colors = particles.colors;
                const sizes = particles.sizes;
                
                // Life ratio for animations
                const lifeRatio = particles.life / particles.maxLife;
                
                // Update each particle
                for (let j = 0; j < positions.length / 3; j++) {
                    // Apply velocity with decreasing speed over time
                    const speedFactor = particles.isSmoke ? 
                        (1 - lifeRatio * 0.5) : // Smoke slows down less
                        (1 - lifeRatio * 0.8);  // Fire slows down more
                    
                    positions[j * 3] += particles.velocities[j].x * delta * speedFactor;
                    positions[j * 3 + 1] += particles.velocities[j].y * delta * speedFactor;
                    positions[j * 3 + 2] += particles.velocities[j].z * delta * speedFactor;
                    
                    // For smoke, add upward drift and expansion
                    if (particles.isSmoke) {
                        // Upward drift
                        positions[j * 3 + 1] += delta * 0.5;
                        
                        // Expand size over time
                        sizes[j] = particles.sizes[j] * (1 + lifeRatio);
                        
                        // Fade out opacity
                        particles.material.opacity = 0.6 * (1 - lifeRatio);
                    } else if (colors) {
                        // For fire particles, transition color from bright to dark
                        if (lifeRatio < 0.3) {
                            // Initial phase - maintain color
                        } else if (lifeRatio < 0.7) {
                            // Middle phase - fade to red
                            colors[j * 3 + 1] *= 0.98; // Green fades
                            colors[j * 3 + 2] *= 0.98; // Blue fades
                        } else {
                            // Final phase - fade to black
                            colors[j * 3] *= 0.95; // Red fades
                            colors[j * 3 + 1] *= 0.9; // Green fades faster
                            colors[j * 3 + 2] *= 0.9; // Blue fades faster
                        }
                        
                        // Shrink size over time
                        sizes[j] = particles.sizes[j] * (1 - lifeRatio * 0.5);
                    }
                }
                
                // Mark attributes as needing update
                particles.geometry.attributes.position.needsUpdate = true;
                if (sizes) particles.geometry.attributes.size.needsUpdate = true;
                if (colors) particles.geometry.attributes.color.needsUpdate = true;
            }
        }
        
        // Update debris particles
        for (let i = this.debrisParticles.length - 1; i >= 0; i--) {
            const debris = this.debrisParticles[i];
            
            // Update life
            debris.life += delta;
            
            if (debris.life >= debris.maxLife) {
                // Remove expired debris
                this.scene.remove(debris.system);
                debris.geometry.dispose();
                this.debrisParticles.splice(i, 1);
            } else {
                // Update debris positions
                const positions = debris.positions;
                
                // Apply gravity to velocities
                for (let j = 0; j < debris.velocities.length; j++) {
                    debris.velocities[j].y -= debris.gravity * delta;
                }
                
                // Update each debris particle
                for (let j = 0; j < positions.length / 3; j++) {
                    positions[j * 3] += debris.velocities[j].x * delta;
                    positions[j * 3 + 1] += debris.velocities[j].y * delta;
                    positions[j * 3 + 2] += debris.velocities[j].z * delta;
                    
                    // Bounce off ground
                    if (positions[j * 3 + 1] < 0) {
                        positions[j * 3 + 1] = 0;
                        debris.velocities[j].y = -debris.velocities[j].y * 0.4; // Bounce with energy loss
                        
                        // Reduce horizontal velocity due to friction
                        debris.velocities[j].x *= 0.8;
                        debris.velocities[j].z *= 0.8;
                    }
                }
                
                // Mark attributes as needing update
                debris.geometry.attributes.position.needsUpdate = true;
            }
        }
    }
    
    reset() {
        this.active = false;
        this.object.visible = false;
        this.speed = 0;
        this.distanceTraveled = 0;
        this.exploded = false;
        
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
        
        // Dispose explosion particles
        for (const particles of this.explosionParticles) {
            this.scene.remove(particles.system);
            particles.geometry.dispose();
            particles.material.dispose();
            if (particles.material.map) {
                particles.material.map.dispose();
            }
        }
        
        // Dispose debris particles
        for (const debris of this.debrisParticles) {
            this.scene.remove(debris.system);
            debris.geometry.dispose();
        }
        
        this.explosionParticles = [];
        this.debrisParticles = [];
    }
} 