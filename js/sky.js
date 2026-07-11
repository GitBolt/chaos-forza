import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

// Device detection for performance optimization
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
// Additional check for low-end mobile devices
const isLowEndMobile = isMobile && (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const isIntegratedLaptop = !isMobile && ((navigator.hardwareConcurrency || 4) <= 8 || (navigator.deviceMemory || 4) <= 8 || window.devicePixelRatio > 1.5);

export class SkyDome {
    constructor(scene) {
        this.scene = scene;
        this.envMap = null;
        this.sun = new THREE.Vector3(0, 1, 0); // Default sun position
        
        // Load HDR environment based on device capability
        if (isMobile || isIntegratedLaptop) {
            this.loadLowQualitySky();
        } else {
            this.loadHDREnvironment();
        }
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
    
    loadLowQualitySky() {
        console.log("Loading lightweight HDR sky for this device");
        
        // Use the lightweight sky_phone.exr for mobile devices
        const exrLoader = new EXRLoader();
        exrLoader.load('textures/sky_phone.exr', (texture) => {
            // Configure texture for environment mapping
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.needsUpdate = true;
            
            // Apply mobile optimizations to the texture
            if (isLowEndMobile || isIntegratedLaptop) {
                texture.minFilter = THREE.LinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = false;
            } else {
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
                texture.generateMipmaps = true;
            }
            
            // Set renderer environment map
            this.scene.environment = texture;
            this.envMap = texture;
            
            // Set scene background to HDR texture
            this.scene.background = texture;
            
            // Apply to materials with appropriate intensity based on device capability
            const envMapIntensity = (isLowEndMobile || isIntegratedLaptop) ? 0.5 : 0.8;
            this.applyMinimalEnvMap(texture, envMapIntensity);
        });
    }
    
    // Helper method to apply environment map with minimal settings
    applyMinimalEnvMap(envMap, intensity) {
        this.scene.traverse((object) => {
            if (object.isMesh && object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => {
                        if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
                            material.envMap = envMap;
                            material.envMapIntensity = intensity;
                            material.needsUpdate = true;
                        }
                    });
                } else if (object.material.isMeshStandardMaterial || object.material.isMeshPhysicalMaterial) {
                    object.material.envMap = envMap;
                    object.material.envMapIntensity = intensity;
                    object.material.needsUpdate = true;
                }
            }
        });
    }
    
    // Keep a minimal updateSunPosition method for compatibility with existing code
    updateSunPosition(timeOfDay) {
        // Do nothing - we're using the HDR for lighting
        // Just keep this method for compatibility
    }
}
