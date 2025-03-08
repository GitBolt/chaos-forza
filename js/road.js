import * as THREE from 'three';

export class Road {
    constructor(scene) {
        this.scene = scene;
        this.segments = [];
        this.roadLength = 100;
        this.roadWidth = 20;
        this.totalSegments = 5;
        
        // Create materials
        this.createMaterials();
        
        // Create initial road segments
        this.createRoadSegments();
    }
    
    createMaterials() {
        // Create texture loader
        const textureLoader = new THREE.TextureLoader();
        
        // Load asphalt textures - use a more asphalt-like texture
        this.diffuseMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg');
        this.diffuseMap.wrapS = THREE.RepeatWrapping;
        this.diffuseMap.wrapT = THREE.RepeatWrapping;
        this.diffuseMap.repeat.set(2, 10);
        
        // Load normal map for asphalt - use a more subtle normal map
        this.normalMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/brick_bump.jpg');
        this.normalMap.wrapS = THREE.RepeatWrapping;
        this.normalMap.wrapT = THREE.RepeatWrapping;
        this.normalMap.repeat.set(8, 30);
        
        // Load roughness map - use a more detailed roughness map for asphalt
        this.roughnessMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg');
        this.roughnessMap.wrapS = THREE.RepeatWrapping;
        this.roughnessMap.wrapT = THREE.RepeatWrapping;
        this.roughnessMap.repeat.set(8, 30);
        
        // Create environment map for reflections
        const cubeTextureLoader = new THREE.CubeTextureLoader();
        this.envMap = cubeTextureLoader.load([
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/posx.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/negx.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/posy.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/negy.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/posz.jpg',
            'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/cube/Park2/negz.jpg'
        ]);
        
        // Create reflective asphalt material using MeshPhysicalMaterial for better reflections
        this.roadMaterial = new THREE.MeshPhysicalMaterial({ 
            map: this.diffuseMap,
            color: 0x222222,           // Darker color for asphalt
            normalMap: this.normalMap,
            normalScale: new THREE.Vector2(0.3, 0.3), // Reduced normal map intensity
            roughnessMap: this.roughnessMap,
            roughness: 0.5,            // Medium roughness for balanced reflections
            metalness: 0.2,            // Slight metalness for reflections
            envMap: this.envMap,
            envMapIntensity: 0.8,      // Increased reflection intensity
            clearcoat: 0.2,            // Slight clearcoat for reflective surface
            clearcoatRoughness: 0.4,   // Medium clearcoat roughness for realistic look
            reflectivity: 0.5,         // Medium reflectivity
        });
        
        // Create grass material
        this.grassMaterial = new THREE.MeshStandardMaterial({ 
            map: this.diffuseMap,
            color: 0x559944,
            roughness: 0.8,
            metalness: 0.0
        });
        
        // Create road marking material
        this.markingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.0,
            emissive: 0x333333
        });
    }
    
    createRoadSegments() {
        // Create road
        for (let i = 0; i < this.totalSegments; i++) {
            this.createSegment(-i * this.roadLength);
        }
    }
    
    createSegment(zPosition) {
        const segment = {
            meshes: [],
            position: new THREE.Vector3(0, 0, zPosition),
            wasRecycled: false
        };
        
        // Road
        const roadGeometry = new THREE.PlaneGeometry(this.roadWidth, this.roadLength, 20, 20);
        const road = new THREE.Mesh(roadGeometry, this.roadMaterial);
        road.rotation.x = -Math.PI / 2;
        road.position.z = zPosition;
        road.receiveShadow = true;
        this.scene.add(road);
        segment.meshes.push(road);
        
        // Add road markings - center line
        const markingGeometry = new THREE.PlaneGeometry(0.5, this.roadLength);
        const marking = new THREE.Mesh(markingGeometry, this.markingMaterial);
        marking.rotation.x = -Math.PI / 2;
        marking.position.y = 0.01; // Slightly above road
        marking.position.z = zPosition;
        this.scene.add(marking);
        segment.meshes.push(marking);
        
        // Add dashed lines on sides
        const dashLength = 5;
        const dashGap = 5;
        const dashesPerSide = Math.floor(this.roadLength / (dashLength + dashGap));
        const dashOffset = (this.roadLength - (dashesPerSide * (dashLength + dashGap) - dashGap)) / 2;
        
        for (let i = 0; i < dashesPerSide; i++) {
            const dashZ = zPosition - dashOffset - i * (dashLength + dashGap) - dashLength / 2;
            
            // Left dash
            const leftDashGeometry = new THREE.PlaneGeometry(0.3, dashLength);
            const leftDash = new THREE.Mesh(leftDashGeometry, this.markingMaterial);
            leftDash.rotation.x = -Math.PI / 2;
            leftDash.position.set(-this.roadWidth / 4, 0.01, dashZ);
            this.scene.add(leftDash);
            segment.meshes.push(leftDash);
            
            // Right dash
            const rightDashGeometry = new THREE.PlaneGeometry(0.3, dashLength);
            const rightDash = new THREE.Mesh(rightDashGeometry, this.markingMaterial);
            rightDash.rotation.x = -Math.PI / 2;
            rightDash.position.set(this.roadWidth / 4, 0.01, dashZ);
            this.scene.add(rightDash);
            segment.meshes.push(rightDash);
        }
        
        // Add grass on sides
        const grassGeometryLeft = new THREE.PlaneGeometry(50, this.roadLength);
        const grassLeft = new THREE.Mesh(grassGeometryLeft, this.grassMaterial);
        grassLeft.rotation.x = -Math.PI / 2;
        grassLeft.position.x = -this.roadWidth/2 - 25;
        grassLeft.position.z = zPosition;
        grassLeft.receiveShadow = true;
        this.scene.add(grassLeft);
        segment.meshes.push(grassLeft);
        
        const grassGeometryRight = new THREE.PlaneGeometry(50, this.roadLength);
        const grassRight = new THREE.Mesh(grassGeometryRight, this.grassMaterial);
        grassRight.rotation.x = -Math.PI / 2;
        grassRight.position.x = this.roadWidth/2 + 25;
        grassRight.position.z = zPosition;
        grassRight.receiveShadow = true;
        this.scene.add(grassRight);
        segment.meshes.push(grassRight);
        
        this.segments.push(segment);
        return segment;
    }
    
    update(carPosition) {
        // Recycle road segments for infinite road effect
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            
            // Reset wasRecycled flag at the beginning of each update
            segment.wasRecycled = false;
            
            // If car has passed this segment by a certain distance
            if (carPosition.z < segment.position.z - this.roadLength * 1.5) {
                // Find the furthest segment in the direction of travel
                const lastSegmentZ = this.segments.reduce((min, seg) => 
                    seg.position.z < min ? seg.position.z : min, 0);
                
                // Move this segment to the front
                const newZ = lastSegmentZ - this.roadLength;
                segment.position.z = newZ;
                
                // Update all meshes in this segment
                segment.meshes.forEach(mesh => {
                    mesh.position.z = newZ;
                });
                
                // Mark segment as recycled
                segment.wasRecycled = true;
            }
        }
    }
}