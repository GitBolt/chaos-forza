import * as THREE from 'three';

export class RocketParticles {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.particleCount = 100; // Increased particle count for better effect
        this.particleGeometry = new THREE.BufferGeometry();
        this.particleMaterial = new THREE.PointsMaterial({
            color: 0xff6600,
            size: 0.2,
            blending: THREE.AdditiveBlending,
            transparent: true,
            sizeAttenuation: true
        });
        
        // Create particle system
        this.createParticleSystem();
    }
    
    createParticleSystem() {
        // Create particles
        const positions = new Float32Array(this.particleCount * 3);
        const colors = new Float32Array(this.particleCount * 3);
        const sizes = new Float32Array(this.particleCount);
        
        // Initialize particles
        for (let i = 0; i < this.particleCount; i++) {
            // Initialize with zero positions - will be updated when active
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            
            // Random colors from orange to yellow
            colors[i * 3] = Math.random() * 0.5 + 0.5; // R: 0.5-1.0
            colors[i * 3 + 1] = Math.random() * 0.3 + 0.2; // G: 0.2-0.5
            colors[i * 3 + 2] = Math.random() * 0.1; // B: 0-0.1
            
            // Random sizes
            sizes[i] = Math.random() * 0.5 + 0.1;
            
            // Create particle data
            this.particles.push({
                position: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                size: sizes[i],
                life: 0,
                maxLife: Math.random() * 1 + 0.5, // 0.5 to 1.5 seconds
                active: false
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
    
    emitParticles(position, direction, count = 5) {
        // Find inactive particles to emit
        let emitted = 0;
        for (let i = 0; i < this.particles.length && emitted < count; i++) {
            const particle = this.particles[i];
            
            if (!particle.active) {
                // Activate particle
                particle.active = true;
                particle.life = 0;
                
                // Set position at rocket exhaust with slight randomness
                particle.position.copy(position);
                particle.position.x += (Math.random() - 0.5) * 0.2;
                particle.position.y += (Math.random() - 0.5) * 0.2;
                particle.position.z += (Math.random() - 0.5) * 0.2;
                
                // Add some randomness to the direction
                const spread = 0.4; // Increased spread for more dramatic effect
                particle.velocity.set(
                    direction.x + (Math.random() - 0.5) * spread,
                    direction.y + (Math.random() - 0.5) * spread,
                    direction.z + (Math.random() - 0.5) * spread
                );
                
                // Scale velocity
                const speed = Math.random() * 1.0 + 0.8; // Faster particles
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
                    // Update position
                    particle.position.x += particle.velocity.x * delta * 10;
                    particle.position.y += particle.velocity.y * delta * 10;
                    particle.position.z += particle.velocity.z * delta * 10;
                    
                    // Fade out based on life
                    const lifeRatio = particle.life / particle.maxLife;
                    sizes[i] = particle.size * (1 - lifeRatio * 0.8); // Slower size reduction
                    
                    // Adjust color as particle ages - fade to red/black
                    colors[i * 3] = 0.5 + 0.5 * (1 - lifeRatio); // Red fades less
                    colors[i * 3 + 1] = 0.2 * (1 - lifeRatio); // Green fades more
                    colors[i * 3 + 2] = 0.1 * (1 - lifeRatio); // Blue fades more
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
    }
} 