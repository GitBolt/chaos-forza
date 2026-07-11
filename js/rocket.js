import * as THREE from 'three';
import { RocketParticles } from './rocketParticles.js';

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIntegratedLaptop = !isMobile && ((navigator.hardwareConcurrency || 4) <= 8 || (navigator.deviceMemory || 4) <= 8 || window.devicePixelRatio > 1.5);
const useDynamicRocketLights = !isMobile && !isIntegratedLaptop;

export class Rocket {
    constructor(scene) {
        this.scene = scene;
        this.object = new THREE.Object3D();
        this.speed = 0;
        this.maxSpeed = 65;
        this.acceleration = 50;
        this.active = false;
        this.distanceTraveled = 0; // Track distance traveled
        this.explosionRange = 220;
        this.exploded = false;
        this.explosionComplete = false; // Track when explosion animation is complete
        this.exhaustPosition = new THREE.Vector3();
        this.exhaustDirection = new THREE.Vector3();
        this.launchOffset = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
        this.moveDirection = new THREE.Vector3();

        // Create rocket body
        this.createRocketBody();
        this.particles = new RocketParticles(scene);

        // Add rocket to scene but make it invisible initially
        this.scene.add(this.object);
        this.object.visible = false;

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

        if (useDynamicRocketLights) {
            this.exhaustLight = new THREE.PointLight(0xff6600, 2, 5);
            this.exhaustLight.position.set(0, 0, 1.2); // Behind the rocket
            this.object.add(this.exhaustLight);
        }

        // Enable shadows
        this.body.castShadow = useDynamicRocketLights;
        this.nose.castShadow = useDynamicRocketLights;
    }

    launch(position, direction, carSpeed = 0, isCarInAir = false) {
        // Reset rocket state
        this.distanceTraveled = 0;
        this.exploded = false;
        this.explosionComplete = false;

        // Set rocket position slightly in front of the car
        this.launchOffset.copy(direction).multiplyScalar(3);
        this.object.position.copy(position).add(this.launchOffset);
        
        // Add a small upward offset to position the rocket slightly above the car
        this.object.position.y += 0.5; // Small upward offset for better visibility
        
        // Add slight randomization to the direction for more interesting trajectories
        const randomFactor = 0.1; // Adjust this value to control the amount of randomization
        this.moveDirection.copy(direction);
        const randomizedDirection = this.moveDirection;
        randomizedDirection.x += (Math.random() - 0.5) * randomFactor;
        
        // If car is in air, angle the missile slightly downward to hit ground targets
        if (isCarInAir) {
            randomizedDirection.y = -0.1; // Downward angle when in air
        } else {
            randomizedDirection.y = 0; // Force Y component to be 0 to maintain consistent height when on ground
        }
        
        randomizedDirection.z += (Math.random() - 0.5) * randomFactor;
        randomizedDirection.normalize(); // Ensure it's still a unit vector

        // Set rocket orientation to match the randomized direction
        this.targetPosition.copy(this.object.position).add(randomizedDirection);
        this.object.lookAt(this.targetPosition);

        // Activate rocket
        this.active = true;
        this.object.visible = true;

        // Store the direction for movement
        // Set initial speed based on car's speed plus base rocket speed
        // This ensures the rocket always moves faster than the car
        this.speed = Math.min(38 + Math.max(carSpeed, 0) * 0.45, this.maxSpeed);

        // Add slight randomization to the speed as well
        this.speed *= (0.9 + Math.random() * 0.2); // Speed varies by ±10%
    }

    explode() {
        if (this.exploded) return;

        this.exploded = true;
        this.active = false;
        this.object.visible = false;

        // Create simplified explosion effect with particles and smoke
        this.createEnhancedExplosion();

        // Mark explosion as complete after a short delay
        setTimeout(() => {
            this.explosionComplete = true;
        }, 1000);
    }

    createEnhancedExplosion() {
        const explosionPosition = this.object.position.clone();

        // Create a more prominent flash effect
        this.createEnhancedFlash(explosionPosition);

        // Create a simple explosion sphere
        const explosionGeometry = new THREE.SphereGeometry(6, 12, 12);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6600,
            transparent: true,
            opacity: 0.8
        });

        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.copy(explosionPosition);
        this.scene.add(explosion);

        // Animate the explosion sphere
        let scale = 0.1;
        const expandAndFade = () => {
            scale += 0.1;
            explosion.scale.set(scale, scale, scale);
            explosionMaterial.opacity -= 0.03;
            
            if (explosionMaterial.opacity > 0.05) {
                requestAnimationFrame(expandAndFade);
            } else {
                this.scene.remove(explosion);
                explosionGeometry.dispose();
                explosionMaterial.dispose();
            }
        };
        
        requestAnimationFrame(expandAndFade);
        
        // Add simplified particles (just a few for visual effect)
        this.addSimpleParticles(explosionPosition);
        
        // Add simplified smoke (just a few for visual effect)
        this.addSimpleSmoke(explosionPosition);
    }
    
    createEnhancedFlash(position) {
        let flashLight = null;
        let wideFlashLight = null;
        if (useDynamicRocketLights) {
            flashLight = new THREE.PointLight(0xffaa00, 15, 25);
            flashLight.position.copy(position);
            this.scene.add(flashLight);

            wideFlashLight = new THREE.PointLight(0xff5500, 8, 40);
            wideFlashLight.position.copy(position);
            this.scene.add(wideFlashLight);
        }
        
        // Create a visual flash sphere (bright glowing ball)
        const flashGeometry = new THREE.SphereGeometry(3, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffaa,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        
        const flashSphere = new THREE.Mesh(flashGeometry, flashMaterial);
        flashSphere.position.copy(position);
        this.scene.add(flashSphere);
        
        // Animate the flash with quick expansion and fade
        let flashScale = 0.1;
        let intensity1 = 15;
        let intensity2 = 8;
        
        const animateFlash = () => {
            // Expand flash sphere
            flashScale += 0.2;
            flashSphere.scale.set(flashScale, flashScale, flashScale);
            
            // Fade out flash sphere
            flashMaterial.opacity -= 0.05;
            
            // Reduce light intensity
            intensity1 *= 0.85;
            intensity2 *= 0.85;
            if (flashLight && wideFlashLight) {
                flashLight.intensity = intensity1;
                wideFlashLight.intensity = intensity2;
            }
            
            if (flashMaterial.opacity > 0.05) {
                requestAnimationFrame(animateFlash);
            } else {
                // Clean up
                this.scene.remove(flashSphere);
                if (flashLight && wideFlashLight) {
                    this.scene.remove(flashLight);
                    this.scene.remove(wideFlashLight);
                }
                flashGeometry.dispose();
                flashMaterial.dispose();
            }
        };
        
        requestAnimationFrame(animateFlash);
    }
    
    addSimpleParticles(position) {
        // Create just a few simple particles
        const particleCount = isMobile ? 6 : (isIntegratedLaptop ? 10 : 15);
        
        for (let i = 0; i < particleCount; i++) {
            // Create a simple sphere for each particle
            const size = 0.3 + Math.random() * 0.4;
            const geometry = new THREE.SphereGeometry(size, 4, 4); // Very low poly
            
            // Create a material with random orange/red color
            const hue = 0.05 + Math.random() * 0.05; // Orange-red range
            const color = new THREE.Color().setHSL(hue, 1.0, 0.5 + Math.random() * 0.3);
            
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8
            });
            
            const particle = new THREE.Mesh(geometry, material);
            
            // Position randomly around explosion center
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 4;
            particle.position.set(
                position.x + Math.cos(angle) * radius,
                position.y + Math.random() * 2 - 1,
                position.z + Math.sin(angle) * radius
            );
            
            this.scene.add(particle);
            
            // Animate particle with simple outward movement and fading
            const direction = new THREE.Vector3(
                Math.random() * 2 - 1,
                Math.random() * 2 - 1,
                Math.random() * 2 - 1
            ).normalize();
            
            const speed = 2 + Math.random() * 3;
            
            // Simple animation function
            const animateParticle = () => {
                // Move outward
                particle.position.x += direction.x * 0.1 * speed;
                particle.position.y += direction.y * 0.1 * speed;
                particle.position.z += direction.z * 0.1 * speed;
                
                // Fade out
                material.opacity -= 0.02;
                
                if (material.opacity > 0.05) {
                    requestAnimationFrame(animateParticle);
                } else {
                    // Clean up
                    this.scene.remove(particle);
                    geometry.dispose();
                    material.dispose();
                }
            };
            
            requestAnimationFrame(animateParticle);
        }
    }
    
    addSimpleSmoke(position) {
        // Create just a few simple smoke puffs
        const smokeCount = isMobile ? 3 : (isIntegratedLaptop ? 5 : 8);
        
        for (let i = 0; i < smokeCount; i++) {
            // Create a simple plane for each smoke puff
            const size = 2 + Math.random() * 3;
            const geometry = new THREE.PlaneGeometry(size, size);
            
            // Create a material with gray color
            const brightness = 0.2 + Math.random() * 0.3;
            const color = new THREE.Color(brightness, brightness, brightness);
            
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.4,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            
            const smoke = new THREE.Mesh(geometry, material);
            
            // Position randomly around explosion center
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 3;
            smoke.position.set(
                position.x + Math.cos(angle) * radius,
                position.y + Math.random() * 2 - 0.5,
                position.z + Math.sin(angle) * radius
            );
            
            // Random rotation
            smoke.rotation.z = Math.random() * Math.PI * 2;
            
            this.scene.add(smoke);
            
            // Animate smoke with rising and expanding
            const direction = new THREE.Vector3(
                Math.random() * 0.4 - 0.2,
                0.3 + Math.random() * 0.3, // Mostly upward
                Math.random() * 0.4 - 0.2
            );
            
            let scale = 0.5;
            
            // Simple animation function
            const animateSmoke = () => {
                // Move upward and outward
                smoke.position.x += direction.x * 0.1;
                smoke.position.y += direction.y * 0.1;
                smoke.position.z += direction.z * 0.1;
                
                // Expand
                scale += 0.02;
                smoke.scale.set(scale, scale, scale);
                
                // Fade out
                material.opacity -= 0.01;
                
                // Rotate slowly
                smoke.rotation.z += 0.01;
                
                if (material.opacity > 0.05) {
                    requestAnimationFrame(animateSmoke);
                } else {
                    // Clean up
                    this.scene.remove(smoke);
                    geometry.dispose();
                    material.dispose();
                }
            };
            
            requestAnimationFrame(animateSmoke);
        }
    }

    update(delta) {
        if (!this.active) return;

        // If exploded, update explosion particles
        if (this.exploded) {
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
        this.object.position.x += this.moveDirection.x * moveDistance;
        this.object.position.y += this.moveDirection.y * moveDistance;
        this.object.position.z += this.moveDirection.z * moveDistance;

        // Flicker the exhaust light for effect
        if (this.exhaustLight) {
            this.exhaustLight.intensity = 2 + Math.random();
        }

        // Calculate exhaust position - simplified approach
        // Create a position slightly behind the rocket in the opposite direction of travel
        this.exhaustPosition.copy(this.moveDirection)
            .multiplyScalar(-1.2)
            .add(this.object.position);

        // Emit particles from the exhaust
        this.particles.emitParticles(
            this.exhaustPosition,
            this.exhaustDirection.copy(this.moveDirection).negate(),
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
        this.exploded = false;
        this.explosionComplete = false;
        this.distanceTraveled = 0;
        this.speed = 0;
    }

    dispose() {
        // Clean up resources
        this.reset();
        
        // Remove from scene
        this.scene.remove(this.object);
        
        // Dispose of geometries and materials
        if (this.body) {
            this.body.geometry.dispose();
            this.body.material.dispose();
        }

        if (this.nose) {
            this.nose.geometry.dispose();
            this.nose.material.dispose();
        }
        
        // Dispose of particles
        if (this.particles) {
            this.particles.dispose();
        }
        
        // Force cleanup of any remaining objects
        // This is a safety measure to ensure no memory leaks
        setTimeout(() => {
            this.explosionComplete = true;
        }, 100);
    }
}
