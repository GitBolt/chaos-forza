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
        // Create road texture
        const roadTextureLoader = new THREE.TextureLoader();
        this.roadTexture = roadTextureLoader.load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
        this.roadTexture.wrapS = THREE.RepeatWrapping;
        this.roadTexture.wrapT = THREE.RepeatWrapping;
        this.roadTexture.repeat.set(5, 50);
        
        // Create road material
        this.roadMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.8
        });
        
        this.grassMaterial = new THREE.MeshStandardMaterial({ 
            map: this.roadTexture,
            color: 0x559944
        });
        
        this.markingMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff 
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
            position: new THREE.Vector3(0, 0, zPosition)
        };
        
        // Road
        const roadGeometry = new THREE.PlaneGeometry(this.roadWidth, this.roadLength);
        const road = new THREE.Mesh(roadGeometry, this.roadMaterial);
        road.rotation.x = -Math.PI / 2;
        road.position.z = zPosition;
        this.scene.add(road);
        segment.meshes.push(road);
        
        // Add road markings
        const markingGeometry = new THREE.PlaneGeometry(0.5, this.roadLength);
        const marking = new THREE.Mesh(markingGeometry, this.markingMaterial);
        marking.rotation.x = -Math.PI / 2;
        marking.position.y = 0.01; // Slightly above road
        marking.position.z = zPosition;
        this.scene.add(marking);
        segment.meshes.push(marking);
        
        // Add grass on sides
        const grassGeometryLeft = new THREE.PlaneGeometry(50, this.roadLength);
        const grassLeft = new THREE.Mesh(grassGeometryLeft, this.grassMaterial);
        grassLeft.rotation.x = -Math.PI / 2;
        grassLeft.position.x = -this.roadWidth/2 - 25;
        grassLeft.position.z = zPosition;
        this.scene.add(grassLeft);
        segment.meshes.push(grassLeft);
        
        const grassGeometryRight = new THREE.PlaneGeometry(50, this.roadLength);
        const grassRight = new THREE.Mesh(grassGeometryRight, this.grassMaterial);
        grassRight.rotation.x = -Math.PI / 2;
        grassRight.position.x = this.roadWidth/2 + 25;
        grassRight.position.z = zPosition;
        this.scene.add(grassRight);
        segment.meshes.push(grassRight);
        
        this.segments.push(segment);
        return segment;
    }
    
    update(carPosition) {
        // Recycle road segments for infinite road effect
        for (let i = 0; i < this.segments.length; i++) {
            const segment = this.segments[i];
            
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
            }
        }
    }
} 