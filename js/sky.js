import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

// Device detection for performance optimization
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

export class SkyDome {
    constructor(scene) {
        this.scene = scene;
        this.envMap = null;
        this.sun = new THREE.Vector3(0, 1, 0); // Default sun position
        
        // Load HDR environment based on device capability
        if (isMobile) {
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
        console.log("Loading optimized sky for mobile device");
        
        // Create a simple cube texture loader (much lighter than EXR)
        const cubeTextureLoader = new THREE.CubeTextureLoader();
        
        // Load a simple cubemap (you may need to create these simpler textures)
        // For now, we'll use a simple color for the background
        const simpleSkyColor = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.background = simpleSkyColor;
        
        // Create a simple environment map for reflections
        const envMapTexture = cubeTextureLoader.load([
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/posx.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/negx.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/posy.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/negy.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/posz.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/negz.jpg'
        ]);
        
        // Set the environment map for the scene
        this.scene.environment = envMapTexture;
        this.envMap = envMapTexture;
        
        // Update materials with lower intensity for better performance
        this.scene.traverse((object) => {
            if (object.isMesh && object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => {
                        if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
                            material.envMap = envMapTexture;
                            material.envMapIntensity = 0.5; // Lower intensity for performance
                            material.needsUpdate = true;
                        }
                    });
                } else if (object.material.isMeshStandardMaterial || object.material.isMeshPhysicalMaterial) {
                    object.material.envMap = envMapTexture;
                    object.material.envMapIntensity = 0.5; // Lower intensity for performance
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