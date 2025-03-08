import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export class SkyDome {
    constructor(scene) {
        this.scene = scene;
        this.sky = null;
        this.sun = new THREE.Vector3();
        this.atmosphereMesh = null;
        
        // Fixed evening time
        this.eveningTime = 0.78; // Slightly later than sunset for warmer colors
        
        this.initSky();
        this.createStars();
        this.createAtmosphericEffect();
    }
    
    initSky() {
        // Create Sky
        this.sky = new Sky();
        this.sky.scale.setScalar(450000);
        this.scene.add(this.sky);
        
        // Set sky parameters for enhanced orange and cozy evening colors
        const skyUniforms = this.sky.material.uniforms;
        skyUniforms['turbidity'].value = 3.8; // Lower for clearer sky
        skyUniforms['rayleigh'].value = 2.5; // Higher for more vibrant orange colors
        skyUniforms['mieCoefficient'].value = 0.035; // Adjusted for warmer glow
        skyUniforms['mieDirectionalG'].value = 0.85; // Adjusted for softer sun glow
        
        // Set initial sun position (evening)
        this.updateSunPosition(this.eveningTime);
    }
    
    createStars() {
        // Create a star field for night time with improved visuals
        const starGeometry = new THREE.BufferGeometry();
        
        // Create a more realistic star material with custom shaders
        const starMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.2,
            transparent: true,
            opacity: 0.6, // Reduced opacity for evening
            map: this.createStarTexture(),
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true
        });
        
        const starVertices = [];
        const starColors = [];
        
        // Create more stars with varied colors
        for (let i = 0; i < 8000; i++) {
            const x = THREE.MathUtils.randFloatSpread(2000);
            const y = THREE.MathUtils.randFloatSpread(2000);
            const z = THREE.MathUtils.randFloatSpread(2000);
            
            // Keep stars above horizon and more concentrated higher up
            if (y > 0) {
                starVertices.push(x, y, z);
                
                // Add slight color variation to stars
                const colorChoice = Math.random();
                if (colorChoice > 0.95) {
                    // Reddish stars
                    starColors.push(1.0, 0.7, 0.7);
                } else if (colorChoice > 0.9) {
                    // Bluish stars
                    starColors.push(0.7, 0.7, 1.0);
                } else if (colorChoice > 0.8) {
                    // Yellowish stars
                    starColors.push(1.0, 0.9, 0.7);
                } else {
                    // White stars with slight variations
                    const brightness = 0.7 + Math.random() * 0.3;
                    starColors.push(brightness, brightness, brightness);
                }
            }
        }
        
        starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
        starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
        
        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.stars);
    }
    
    createStarTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        
        const context = canvas.getContext('2d');
        const gradient = context.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, canvas.width / 2
        );
        
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.2, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.4, 'rgba(200,200,255,0.6)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    
    createAtmosphericEffect() {
        // Create a custom atmospheric effect using shaders
        const atmosphereGeometry = new THREE.SphereGeometry(449000, 32, 32);
        
        // Custom shader for atmospheric scattering effect with enhanced orange evening colors
        const atmosphereShader = {
            vertexShader: `
                varying vec3 vWorldPosition;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    vNormal = normalize(normalMatrix * normal);
                    
                    vec4 mvPosition = viewMatrix * worldPosition;
                    vViewPosition = -mvPosition.xyz;
                    
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 sunPosition;
                uniform vec3 sunColor;
                uniform float intensity;
                
                varying vec3 vWorldPosition;
                varying vec3 vNormal;
                varying vec3 vViewPosition;
                
                void main() {
                    vec3 worldNormal = normalize(vNormal);
                    vec3 sunDir = normalize(sunPosition);
                    
                    // Fresnel effect for edge glow
                    vec3 viewDir = normalize(vViewPosition);
                    float fresnel = pow(1.0 - dot(worldNormal, viewDir), 4.0);
                    
                    // Sun glow effect
                    float sunDot = max(0.0, dot(worldNormal, sunDir));
                    float sunGlow = pow(sunDot, 12.0) * intensity; // Softer glow
                    
                    // Horizon glow
                    float horizonGlow = 1.0 - abs(worldNormal.y);
                    horizonGlow = pow(horizonGlow, 6.0) * 0.7; // Enhanced horizon glow
                    
                    // Combine effects with warmer colors for cozy evening
                    vec3 eveningColor = mix(
                        vec3(1.0, 0.6, 0.2),  // Deep orange
                        vec3(0.9, 0.4, 0.3),  // Reddish orange
                        horizonGlow * 0.5
                    );
                    
                    // Add purple/pink tones to upper sky
                    vec3 upperSkyColor = vec3(0.7, 0.3, 0.5); // Purple/pink
                    
                    // Blend between evening colors and upper sky based on height
                    float heightFactor = smoothstep(0.0, 0.7, worldNormal.y);
                    vec3 blendedColor = mix(eveningColor, upperSkyColor, heightFactor * 0.7);
                    
                    vec3 finalColor = blendedColor * (fresnel * 0.6 + sunGlow + horizonGlow);
                    
                    // Add a subtle warm glow overall
                    finalColor += vec3(0.2, 0.05, 0.0) * intensity * 0.3;
                    
                    gl_FragColor = vec4(finalColor, fresnel * 0.4 + horizonGlow * 0.3);
                }
            `,
            uniforms: {
                sunPosition: { value: new THREE.Vector3() },
                sunColor: { value: new THREE.Color(1.0, 0.6, 0.2) }, // Warmer orange sun color
                intensity: { value: 1.2 } // Increased base intensity
            }
        };
        
        const atmosphereMaterial = new THREE.ShaderMaterial({
            uniforms: atmosphereShader.uniforms,
            vertexShader: atmosphereShader.vertexShader,
            fragmentShader: atmosphereShader.fragmentShader,
            side: THREE.BackSide,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        
        this.atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
        this.scene.add(this.atmosphereMesh);
    }
    
    updateSunPosition(timeOfDay) {
        // Use fixed evening time instead of the passed timeOfDay
        const fixedTime = this.eveningTime;
        
        // Calculate sun elevation (phi) and azimuth (theta)
        // Adjusted for perfect evening position
        const phi = THREE.MathUtils.degToRad(8); // Lower angle for evening (8 degrees above horizon)
        const theta = THREE.MathUtils.degToRad(260); // Slightly south of west for better orange colors
        
        this.sun.setFromSphericalCoords(1, phi, theta);
        
        // Update sky with new sun position
        this.sky.material.uniforms['sunPosition'].value.copy(this.sun);
        
        // Update atmospheric effect with sun position
        if (this.atmosphereMesh) {
            this.atmosphereMesh.material.uniforms.sunPosition.value.copy(this.sun);
            
            // Animate intensity with gentle pulsing for more dynamic effect
            const pulseFactor = 0.08 * Math.sin(Date.now() * 0.0003) + 1.2;
            this.atmosphereMesh.material.uniforms.intensity.value = pulseFactor;
        }
        
        // Update star visibility based on time of day
        if (this.stars) {
            // Stars should be slightly visible during evening
            const starOpacity = 0.2 + 0.1 * Math.sin(Date.now() * 0.0001);
            this.stars.material.opacity = starOpacity;
        }
    }
}