import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

export class SkyDome {
    constructor(scene) {
        this.scene = scene;
        this.envMap = null;
        this.sun = new THREE.Vector3(0, 1, 0); // Default sun position
        
        // Load HDR environment only
        this.loadHDREnvironment();
    }
    
    loadHDREnvironment() {
        // Create EXR loader for HDR textures
        const exrLoader = new EXRLoader();
        exrLoader.load('textures/sky.exr', (texture) => {
            // Configure texture for environment mapping
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.needsUpdate = true;
            
            // Set renderer environment map
            this.scene.environment = texture;
            this.envMap = texture;
            
            // Set scene background to HDR texture
            this.scene.background = texture;
            
            // Update materials in the scene to use the environment map
            this.scene.traverse((object) => {
                if (object.isMesh && object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => {
                            if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
                                material.envMap = texture;
                                material.envMapIntensity = 1.0; // Standard intensity
                                material.needsUpdate = true;
                            }
                        });
                    } else if (object.material.isMeshStandardMaterial || object.material.isMeshPhysicalMaterial) {
                        object.material.envMap = texture;
                        object.material.envMapIntensity = 1.0; // Standard intensity
                        object.material.needsUpdate = true;
                    }
                }
            });
        });
    }
    
    // Keep a minimal updateSunPosition method for compatibility with existing code
    updateSunPosition(timeOfDay) {
        // Do nothing - we're using the HDR for lighting
        // Just keep this method for compatibility
    }
}