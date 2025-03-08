import * as THREE from 'three';

// Device detection for performance optimization
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export class Car {
    constructor(object, model) {
        this.object = object;
        this.model = model;
        
        // Fix car orientation - rotate the model 180 degrees to face forward
        // this.model.rotation.y = Math.PI;
        
        // Make the car shiny by updating its materials
        this.applyMaterials();
        
        // Physics properties
        this.speed = 0;
        this.direction = new THREE.Vector3(0, 0, -1); // Forward direction
        this.maxForwardSpeed = 4;
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
        
        // Boundary check
        this.boundaryRadius = 995; // Updated to match the doubled road boundary (1000 - 5)
        this.lastValidPosition = new THREE.Vector3();
        
        // Bump physics properties - increased values for more noticeable effects
        this.verticalVelocity = 0;
        this.verticalPosition = 0;
        this.isOnGround = true;
        this.gravity = 0.03; // Increased gravity
        this.bumpForce = 0.8; // Significantly increased bump force
        this.suspensionStiffness = 0.1; // Increased stiffness
        this.suspensionDamping = 0.08; // Increased damping
        this.wheelbase = 2; // Distance between front and rear wheels
        this.pitchAngle = 0;
        this.pitchVelocity = 0;
        this.pitchDamping = 0.08; // Slightly reduced for more oscillation
    }
    
    applyMaterials() {
        if (isMobile) {
            this.applySimpleMaterials();
        } else {
            this.applyShinyMaterials();
        }
    }
    
    applySimpleMaterials() {
        console.log("Applying optimized materials for mobile device");
        
        // Apply simple materials to the car for better performance
        this.model.traverse((child) => {
            if (child.isMesh) {
                // Create a copy of the original material to preserve textures
                const originalMaterial = child.material;
                
                // Create a simpler material with lower quality settings
                const simpleMaterial = new THREE.MeshStandardMaterial({
                    map: originalMaterial.map,
                    color: originalMaterial.color || new THREE.Color(0x888888),
                    metalness: 0.6,
                    roughness: 0.4,
                    // No environment maps or complex properties for performance
                });
                
                // Apply the new material
                child.material = simpleMaterial;
            }
        });
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
    
    update(delta, keys, road) {
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
        
        // Apply bump physics if road is provided
        if (road) {
            this.applyBumpPhysics(delta, road);
        }
        
        // Update movement
        this.updateMovement();
        
        // Store last valid position if within boundary
        if (this.isWithinBoundary(this.object.position)) {
            this.lastValidPosition.copy(this.object.position);
        } else {
            // Reset to last valid position if out of bounds
            this.object.position.copy(this.lastValidPosition);
        }
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
        
        // Store current position before moving
        this.lastValidPosition.copy(this.object.position);
        
        // Move car in the direction it's facing
        if (this.speed !== 0) {
            this.object.position.x += this.direction.x * this.speed;
            this.object.position.z += this.direction.z * this.speed;
            
            // Check if car is within boundary
            if (!this.isWithinBoundary(this.object.position)) {
                // If outside boundary, revert to last valid position
                this.object.position.copy(this.lastValidPosition);
                // Reduce speed to prevent getting stuck at the boundary
                this.speed *= 0.5;
            }
        }
    }
    
    // Check if position is within the circular boundary
    isWithinBoundary(position) {
        // Calculate distance from center (0,0,0) to the position (x,z plane only)
        const distance = Math.sqrt(position.x * position.x + position.z * position.z);
        // Return true if within boundary, false otherwise
        return distance < this.boundaryRadius;
    }
    
    // Add a new method for bump physics
    applyBumpPhysics(delta, road) {
        // Get current position
        const position = this.object.position.clone();
        
        // Check if we're on a bump
        const bump = road.getBumpAtPosition(position);
        
        if (bump) {
            // Apply vertical force based on bump height and car speed
            const bumpForce = bump.height * this.bumpForce * Math.abs(this.speed);
            this.verticalVelocity += bumpForce;
            
            // Apply pitch based on bump normal and car speed
            const pitchForce = bump.height * this.bumpForce * 0.5 * Math.abs(this.speed) * 
                (this.speed > 0 ? 1 : -1); // Reverse pitch direction when going backwards
            this.pitchVelocity += pitchForce;
            
            // Reduce speed when on bumps
            this.speed *= (1 - bump.height * 0.3); // Increased slowdown effect
            
            // Debug output to console
            console.log("Hit bump! Height:", bump.height, "Force:", bumpForce);
        }
        
        // Apply gravity
        if (this.verticalPosition > 0 || this.verticalVelocity > 0) {
            this.verticalVelocity -= this.gravity;
        }
        
        // Update vertical position
        this.verticalPosition += this.verticalVelocity;
        
        // Ground check
        if (this.verticalPosition < 0) {
            this.verticalPosition = 0;
            
            // Apply suspension when hitting the ground
            if (this.verticalVelocity < 0) {
                // Bounce with damping
                this.verticalVelocity = -this.verticalVelocity * 0.4; // Increased bounce
                
                // If velocity is very small, stop bouncing
                if (Math.abs(this.verticalVelocity) < 0.01) {
                    this.verticalVelocity = 0;
                }
            }
        }
        
        // Apply suspension forces when on ground
        if (this.verticalPosition === 0) {
            // Suspension force tries to keep car at rest height
            const suspensionForce = -this.verticalPosition * this.suspensionStiffness;
            // Damping force opposes velocity
            const dampingForce = -this.verticalVelocity * this.suspensionDamping;
            
            this.verticalVelocity += suspensionForce + dampingForce;
        }
        
        // Update pitch angle
        this.pitchAngle += this.pitchVelocity;
        
        // Apply damping to pitch
        this.pitchVelocity *= (1 - this.pitchDamping);
        this.pitchAngle *= (1 - this.pitchDamping * 0.5);
        
        // Apply vertical position to the entire car object
        this.object.position.y = this.verticalPosition;
        
        // Only apply pitch rotation when the car is in the air
        if (this.verticalPosition > 0) {
            // Create a matrix to combine pitch with the car's current orientation
            // This is the most reliable way to apply pitch while preserving the car's yaw
            
            // Create a rotation matrix for the pitch
            const pitchMatrix = new THREE.Matrix4().makeRotationX(this.pitchAngle);
            
            // Get the car's current rotation matrix (preserves yaw)
            const carRotationMatrix = new THREE.Matrix4().makeRotationY(this.object.rotation.y);
            
            // Combine the rotations
            const combinedRotation = new THREE.Matrix4().multiplyMatrices(carRotationMatrix, pitchMatrix);
            
            // Apply the combined rotation to the model
            this.model.rotation.setFromRotationMatrix(combinedRotation);
        } else {
            // When on ground, reset to normal orientation (only yaw)
            this.model.rotation.set(0,0,0);
        }
        
        // Debug output
        if (this.verticalPosition > 0.05 || Math.abs(this.pitchAngle) > 0.05) {
            console.log("Car Y:", this.verticalPosition, "Pitch:", this.pitchAngle);
        }
    }
} 