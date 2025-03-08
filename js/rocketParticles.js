import * as THREE from 'three';

export class RocketParticles {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.particleCount = 300; // Significantly increased particle count for better effect
        this.particleGeometry = new THREE.BufferGeometry();
        
        // Create a custom texture for better-looking particles
        const particleTexture = this.createParticleTexture();
        
        this.particleMaterial = new THREE.PointsMaterial({
            size: 0.3,
            map: particleTexture,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false, // Prevents particles from clipping each other
            sizeAttenuation: true,
            vertexColors: true // Enable vertex colors
        });
        
        // Create particle system
        this.createParticleSystem();
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
        
        // Add color stops for a more realistic fire/exhaust look
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 220, 100, 1)');
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
    
    createParticleSystem() {
        // Create particles
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);
        
        // Initialize particles
        for (let i = 0; i < this.particleCount; i++) {
            // Initialize with positions far below the scene
            positions[i * 3] = 0;
            positions[i * 3 + 1] = -1000;
            positions[i * 3 + 2] = 0;
            
            // Create a range of colors from bright yellow/white to deep orange/red
            // This creates a more realistic flame effect
            const colorChoice = Math.random();
            if (colorChoice > 0.8) {
                // Bright center - white/yellow
                colors[i * 3] = 1.0;     // R: 1.0
                colors[i * 3 + 1] = 0.9;  // G: 0.9
                colors[i * 3 + 2] = 0.5;  // B: 0.5
            } else if (colorChoice > 0.5) {
                // Mid flame - orange
                colors[i * 3] = 1.0;     // R: 1.0
                colors[i * 3 + 1] = 0.6;  // G: 0.6
                colors[i * 3 + 2] = 0.1;  // B: 0.1
            } else {
                // Outer flame - deep red
                colors[i * 3] = 0.9;     // R: 0.9
                colors[i * 3 + 1] = 0.3;  // G: 0.3
                colors[i * 3 + 2] = 0.0;  // B: 0.0
            }
            
            // Varied sizes for more natural look
            sizes[i] = Math.random() * 0.6 + 0.2;
            
            // Create particle data
            this.particles.push({
                position: new THREE.Vector3(0, -1000, 0), // Start far below the scene
                velocity: new THREE.Vector3(),
                size: sizes[i],
                color: new THREE.Color(colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2]),
                life: 0,
                maxLife: Math.random() * 1.5 + 0.5, // 0.5 to 2.0 seconds
                active: false,
                turbulence: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.1,
                    (Math.random() - 0.5) * 0.1,
                    (Math.random() - 0.5) * 0.1
                )
            });
        }
        
        // Set attributes
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // Create the particle system
        this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
        this.scene.add(this.particleSystem);
    }
    
    emitParticles(position, direction, count = 15) {
        // Simple validation to avoid errors
        if (!position || !direction) {
            console.error("Invalid position or direction for particle emission");
            return;
        }
        
        // Find inactive particles to emit
        let emitted = 0;
        for (let i = 0; i < this.particles.length && emitted < count; i++) {
            const particle = this.particles[i];
            
            if (!particle.active) {
                // Activate particle
                particle.active = true;
                particle.life = 0;
                
                // Set position at rocket exhaust with slight randomness
                particle.position.set(
                    position.x + (Math.random() - 0.5) * 0.3,
                    position.y + (Math.random() - 0.5) * 0.3,
                    position.z + (Math.random() - 0.5) * 0.3
                );
                
                // Add some randomness to the direction
                const spread = 0.5; // Increased spread for more dramatic effect
                particle.velocity.set(
                    direction.x + (Math.random() - 0.5) * spread,
                    direction.y + (Math.random() - 0.5) * spread,
                    direction.z + (Math.random() - 0.5) * spread
                );
                
                // Scale velocity - varied speeds for more natural look
                const speed = Math.random() * 1.5 + 1.0; // Faster particles
                particle.velocity.multiplyScalar(speed);
                
                emitted++;
            }
        }
    }
    
    update(delta) {
        // Update particle positions
        const positions = this.particleGeometry.attributes.position.array;
        const sizes = this.particleGeometry.attributes.size.array;
        const colors = this.particleGeometry.attributes.color.array;
        
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            
            if (particle.active) {
                // Update life
                particle.life += delta;
                
                if (particle.life >= particle.maxLife) {
                    // Deactivate particle
                    particle.active = false;
                    // Move it out of view
                    particle.position.set(0, -1000, 0);
                } else {
                    // Add some turbulence for more realistic movement
                    const turbulenceStrength = Math.sin(particle.life * 10) * 0.05;
                    
                    // Update position with velocity and turbulence
                    particle.position.x += (particle.velocity.x + particle.turbulence.x * turbulenceStrength) * delta * 10;
                    particle.position.y += (particle.velocity.y + particle.turbulence.y * turbulenceStrength) * delta * 10;
                    particle.position.z += (particle.velocity.z + particle.turbulence.z * turbulenceStrength) * delta * 10;
                    
                    // Add slight upward drift for hot gas effect
                    particle.position.y += delta * 0.5;
                    
                    // Fade out based on life
                    const lifeRatio = particle.life / particle.maxLife;
                    sizes[i] = particle.size * (1 - lifeRatio * 0.7); // Slower size reduction
                    
                    // Adjust color as particle ages - transition from bright to dark
                    if (lifeRatio < 0.3) {
                        // Initial phase - bright yellow/white
                        colors[i * 3] = particle.color.r;
                        colors[i * 3 + 1] = particle.color.g;
                        colors[i * 3 + 2] = particle.color.b;
                    } else if (lifeRatio < 0.6) {
                        // Middle phase - orange
                        colors[i * 3] = particle.color.r;
                        colors[i * 3 + 1] = particle.color.g * (1 - (lifeRatio - 0.3) / 0.3);
                        colors[i * 3 + 2] = particle.color.b * (1 - (lifeRatio - 0.3) / 0.3);
                    } else {
                        // Final phase - red to black
                        colors[i * 3] = particle.color.r * (1 - (lifeRatio - 0.6) / 0.4);
                        colors[i * 3 + 1] = particle.color.g * 0.3 * (1 - (lifeRatio - 0.6) / 0.4);
                        colors[i * 3 + 2] = 0;
                    }
                }
                
                // Update position in buffer
                positions[i * 3] = particle.position.x;
                positions[i * 3 + 1] = particle.position.y;
                positions[i * 3 + 2] = particle.position.z;
            }
        }
        
        // Mark attributes as needing update
        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.size.needsUpdate = true;
        this.particleGeometry.attributes.color.needsUpdate = true;
    }
    
    dispose() {
        this.scene.remove(this.particleSystem);
        this.particleGeometry.dispose();
        this.particleMaterial.dispose();
        if (this.particleMaterial.map) {
            this.particleMaterial.map.dispose();
        }
    }
} 