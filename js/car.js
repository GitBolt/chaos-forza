import * as THREE from 'three';

export class Car {
    constructor(object, model) {
        this.object = object;
        this.model = model;
        
        // Fix car orientation - rotate the model 180 degrees to face forward
        // this.model.rotation.y = Math.PI;
        
        // Make the car shiny by updating its materials
        this.applyShinyMaterials();
        
        // Physics properties
        this.speed = 0;
        this.direction = new THREE.Vector3(0, 0, -1); // Forward direction
        this.maxForwardSpeed = 6;
        this.maxReverseSpeed = 0.5;
        this.acceleration = 0.008;
        this.deceleration = 0.005;
        this.brakeForce = 0.03;
        this.turnSpeed = 0.04;
        this.turnSpeedDecay = 0.2; // Turn less at lower speeds
        
        // Car state
        this.isAccelerating = false;
        this.isBraking = false;
        this.isReversing = false;
        this.isTurningLeft = false;
        this.isTurningRight = false;
    }
    
    applyShinyMaterials() {
        // Create environment map for reflections
        const cubeTextureLoader = new THREE.CubeTextureLoader();
        const envMap = cubeTextureLoader.load([
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/posx.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/negx.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/posy.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/negy.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/posz.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/negz.jpg'
        ]);
        
        // Apply shiny materials to the car
        this.model.traverse((child) => {
            if (child.isMesh) {
                // Create a copy of the original material to preserve textures
                const originalMaterial = child.material;
                
                // Create a new physical material
                const shinyMaterial = new THREE.MeshPhysicalMaterial({
                    map: originalMaterial.map,
                    color: originalMaterial.color || new THREE.Color(0x888888),
                    metalness: 0.8,           // High metalness for car paint
                    roughness: 0.2,           // Low roughness for shiny look
                    clearcoat: 0.5,           // Add clearcoat for car paint effect
                    clearcoatRoughness: 0.1,  // Smooth clearcoat
                    envMap: envMap,           // Environment map for reflections
                    envMapIntensity: 1.0      // Reflection intensity
                });
                
                // Apply the new material
                child.material = shinyMaterial;
            }
        });
    }
    
    update(delta, keys) {
        // Reset state
        this.isAccelerating = false;
        this.isBraking = false;
        this.isReversing = false;
        this.isTurningLeft = false;
        this.isTurningRight = false;
        
        // Handle input
        if (keys['w']) {
            this.isAccelerating = true;
        }
        
        if (keys['s']) {
            // If we're moving forward, brake
            if (this.speed > 0) {
                this.isBraking = true;
            } else {
                // Otherwise reverse
                this.isReversing = true;
            }
        }
        
        if (keys['a']) {
            this.isTurningLeft = true;
        }
        
        if (keys['d']) {
            this.isTurningRight = true;
        }
        
        // Apply physics
        this.applyPhysics(delta);
        
        // Update position and rotation
        this.updateMovement();
    }
    
    applyPhysics(delta) {
        // Acceleration
        if (this.isAccelerating) {
            this.speed = Math.min(this.speed + this.acceleration, this.maxForwardSpeed);
        }
        
        // Braking
        if (this.isBraking) {
            this.speed = Math.max(this.speed - this.brakeForce, 0);
        }
        
        // Reversing
        if (this.isReversing) {
            this.speed = Math.max(this.speed - this.acceleration, -this.maxReverseSpeed);
        }
        
        // Natural deceleration when no input
        if (!this.isAccelerating && !this.isReversing) {
            if (this.speed > 0) {
                this.speed = Math.max(this.speed - this.deceleration, 0);
            } else if (this.speed < 0) {
                this.speed = Math.min(this.speed + this.deceleration, 0);
            }
        }
    }
    
    updateMovement() {
        // Only turn if we're moving
        if (this.speed !== 0) {
            // Calculate turn amount based on speed
            const speedFactor = Math.abs(this.speed) / this.maxForwardSpeed;
            const actualTurnSpeed = this.turnSpeed * Math.max(speedFactor, this.turnSpeedDecay);
            
            // Apply turning - note the reverse direction when going backwards
            if (this.isTurningLeft) {
                this.object.rotation.y += actualTurnSpeed * (this.speed > 0 ? 1 : -1);
            }
            
            if (this.isTurningRight) {
                this.object.rotation.y -= actualTurnSpeed * (this.speed > 0 ? 1 : -1);
            }
        }
        
        // Update direction vector based on car's rotation
        this.direction.set(0, 0, -1);
        this.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.object.rotation.y);
        
        // Move car in the direction it's facing
        if (this.speed !== 0) {
            this.object.position.x += this.direction.x * this.speed;
            this.object.position.z += this.direction.z * this.speed;
        }
    }
} 