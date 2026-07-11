import * as THREE from 'three';

// Device detection for performance optimization
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIntegratedLaptop = !isMobile && ((navigator.hardwareConcurrency || 4) <= 8 || (navigator.deviceMemory || 4) <= 8 || window.devicePixelRatio > 1.5);

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
        // Values are expressed per second, so handling is consistent at any FPS.
        this.maxForwardSpeed = 45;
        this.maxReverseSpeed = 11;
        this.acceleration = 24;
        this.deceleration = 10;
        this.brakeForce = 30;
        this.turnSpeed = 3.8;
        this.minimumSteering = 0.38;
        
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
        this.gravity = 16;
        this.bumpForce = 18;
        this.wheelbase = 2; // Distance between front and rear wheels
        this.pitchAngle = 0;
        this.pitchVelocity = 0;
        this.pitchDamping = 5;
        this.wasOnBump = false;
        this.upAxis = new THREE.Vector3(0, 1, 0);
        this.pitchMatrix = new THREE.Matrix4();
        this.carRotationMatrix = new THREE.Matrix4();
        this.combinedRotation = new THREE.Matrix4();
    }
    
    applyMaterials() {
        if (isMobile || isIntegratedLaptop) {
            this.applySimpleMaterials();
        } else {
            this.applyShinyMaterials();
        }
    }
    
    applySimpleMaterials() {
        console.log("Applying optimized car materials for this device");
        
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
        
        // Update movement
        this.updateMovement(delta);

        // Test jump pads at the new position so they respond on entry even at
        // higher speeds.
        if (road) {
            this.applyBumpPhysics(delta, road);
        }
        
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
            this.speed = Math.min(this.speed + this.acceleration * delta, this.maxForwardSpeed);
        }
        
        // Braking
        if (this.isBraking) {
            this.speed = Math.max(this.speed - this.brakeForce * delta, 0);
        }
        
        // Reversing
        if (this.isReversing) {
            this.speed = Math.max(this.speed - this.acceleration * delta, -this.maxReverseSpeed);
        }
        
        // Natural deceleration when no input
        if (!this.isAccelerating && !this.isReversing) {
            if (this.speed > 0) {
                this.speed = Math.max(this.speed - this.deceleration * delta, 0);
            } else if (this.speed < 0) {
                this.speed = Math.min(this.speed + this.deceleration * delta, 0);
            }
        }
    }
    
    updateMovement(delta) {
        // Only turn if we're moving
        if (this.speed !== 0) {
            // Calculate turn amount based on speed
            const speedFactor = Math.abs(this.speed) / this.maxForwardSpeed;
            // Steering remains responsive at low speed but softens slightly at
            // maximum speed to keep the car controllable.
            const steeringFactor = this.minimumSteering + (1 - speedFactor) * 0.35;
            const actualTurn = this.turnSpeed * steeringFactor * delta;
            
            // Apply turning - note the reverse direction when going backwards
            if (this.isTurningLeft) {
                this.object.rotation.y += actualTurn * (this.speed > 0 ? 1 : -1);
            }
            
            if (this.isTurningRight) {
                this.object.rotation.y -= actualTurn * (this.speed > 0 ? 1 : -1);
            }
        }
        
        // Update direction vector based on car's rotation
        this.direction.set(0, 0, -1);
        this.direction.applyAxisAngle(this.upAxis, this.object.rotation.y);
        
        // Store current position before moving
        this.lastValidPosition.copy(this.object.position);
        
        // Move car in the direction it's facing
        if (this.speed !== 0) {
            this.object.position.x += this.direction.x * this.speed * delta;
            this.object.position.z += this.direction.z * this.speed * delta;
            
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
        // Check if we're on a bump
        const bump = road.getBumpAtPosition(this.object.position);

        if (bump && !this.wasOnBump && this.verticalPosition <= 0.05) {
            const speedRatio = Math.min(Math.abs(this.speed) / this.maxForwardSpeed, 1);
            const padStrength = Math.max(bump.height, 0.75);
            this.verticalVelocity = padStrength * this.bumpForce * (0.65 + speedRatio * 0.75);
            this.pitchVelocity += padStrength * 1.8 * (this.speed >= 0 ? 1 : -1);
            this.speed *= 0.88;
        }
        this.wasOnBump = Boolean(bump);
        
        // Apply gravity
        if (this.verticalPosition > 0 || this.verticalVelocity > 0) {
            this.verticalVelocity -= this.gravity * delta;
        }
        
        // Update vertical position
        this.verticalPosition += this.verticalVelocity * delta;
        
        // Ground check
        if (this.verticalPosition < 0) {
            this.verticalPosition = 0;
            
            // Apply suspension when hitting the ground
            if (this.verticalVelocity < 0) {
                // Bounce with damping
                this.verticalVelocity = -this.verticalVelocity * 0.22;
                
                // If velocity is very small, stop bouncing
                if (Math.abs(this.verticalVelocity) < 0.35) {
                    this.verticalVelocity = 0;
                }
            }
        }
        
        // Update pitch angle
        this.pitchAngle += this.pitchVelocity * delta;
        
        const pitchDamping = Math.exp(-this.pitchDamping * delta);
        this.pitchVelocity *= pitchDamping;
        this.pitchAngle *= Math.exp(-2.5 * delta);
        
        // Apply vertical position to the entire car object
        this.object.position.y = this.verticalPosition;
        
        // Only apply pitch rotation when the car is in the air
        if (this.verticalPosition > 0) {
            // Create a matrix to combine pitch with the car's current orientation
            // This is the most reliable way to apply pitch while preserving the car's yaw
            
            // Create a rotation matrix for the pitch
            this.pitchMatrix.makeRotationX(this.pitchAngle);
            
            // Get the car's current rotation matrix (preserves yaw)
            this.carRotationMatrix.makeRotationY(this.object.rotation.y);
            
            // Combine the rotations
            this.combinedRotation.multiplyMatrices(this.carRotationMatrix, this.pitchMatrix);
            
            // Apply the combined rotation to the model
            this.model.rotation.setFromRotationMatrix(this.combinedRotation);
        } else {
            // When on ground, reset to normal orientation (only yaw)
            this.model.rotation.set(0,0,0);
        }
        
    }
}
