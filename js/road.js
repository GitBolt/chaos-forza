import * as THREE from 'three';

export class Road {
    constructor(scene) {
        this.scene = scene;
        this.segments = [];
        this.roadLength = 100;
        this.roadWidth = 20;
        this.totalSegments = 5;
        
        // Add circular boundary properties
        this.boundaryRadius = 1000; // Doubled from 500 to 1000
        this.boundaryHeight = 25; // Increased height for better visibility
        
        // Optimization properties
        this.visibleSectionAngle = Math.PI; // Increased to 180 degrees for better visibility
        this.boundaryWall = null; // Will store the continuous boundary wall
        this.boundaryEdge = null; // Will store the edge of the boundary
        this.pillarInstances = null; // For instanced meshes
        this.boundaryLights = []; // For boundary lights
        this.visibleDistance = 1200; // Increased visible distance
        
        // Rough terrain properties
        this.terrainBumps = [];
        this.terrainBumpMeshes = [];
        
        // Create materials
        this.createMaterials();
        
        // Create initial road segments
        this.createRoadSegments();
        
        // Create circular boundary and ground
        this.createCircularBoundary();
        
        // Create rough terrain across the boundary
        this.createBoundaryRoughTerrain();
        
        // Enable backface culling for all materials
        this.enableBackfaceCulling();
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
        
        // Load ground texture
        const groundTexture = textureLoader.load('textures/ground.jpg');
        groundTexture.wrapS = THREE.RepeatWrapping;
        groundTexture.wrapT = THREE.RepeatWrapping;
        
        // Increase repeat to avoid stretching and blurriness at a distance
        groundTexture.repeat.set(8, 8);
        
        // Improve texture quality at different distances
        groundTexture.minFilter = THREE.LinearMipMapLinearFilter;
        groundTexture.magFilter = THREE.LinearFilter;
        
        // Add anisotropic filtering to improve texture quality at oblique angles
        groundTexture.anisotropy = 16;
        
        // Create grass material with ground.jpg texture
        this.grassMaterial = new THREE.MeshStandardMaterial({ 
            map: groundTexture,
            color: 0xffffff,  // Use white color to show the texture as is
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
            wasRecycled: false,
            bumpMap: [], // Array to store bump positions and heights
            debugMeshes: [] // Array to store debug visualization meshes
        };
        
        // Road with bumps
        const roadGeometry = new THREE.PlaneGeometry(this.roadWidth, this.roadLength, 20, 20);
        
        // Add random bumps to the road
        this.addRoughTerrain(roadGeometry, segment.bumpMap);
        
        const road = new THREE.Mesh(roadGeometry, this.roadMaterial);
        road.rotation.x = -Math.PI / 2;
        road.position.z = zPosition;
        road.receiveShadow = true;
        this.scene.add(road);
        segment.meshes.push(road);
        
        // Add debug visualization for bumps
        this.addBumpVisualization(segment, zPosition);
        
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
        const grassGeometryLeft = new THREE.PlaneGeometry(50, this.roadLength, 1, 4);
        // Adjust UVs for better texture mapping
        const leftUVs = grassGeometryLeft.attributes.uv.array;
        for (let i = 0; i < leftUVs.length; i += 2) {
            // Scale UVs to repeat texture properly
            leftUVs[i] = leftUVs[i] * 2;
            leftUVs[i + 1] = leftUVs[i + 1] * 4;
        }
        grassGeometryLeft.attributes.uv.needsUpdate = true;
        
        const grassLeft = new THREE.Mesh(grassGeometryLeft, this.grassMaterial);
        grassLeft.rotation.x = -Math.PI / 2;
        grassLeft.position.x = -this.roadWidth/2 - 25;
        grassLeft.position.z = zPosition;
        grassLeft.receiveShadow = true;
        this.scene.add(grassLeft);
        segment.meshes.push(grassLeft);
        
        const grassGeometryRight = new THREE.PlaneGeometry(50, this.roadLength, 1, 4);
        // Adjust UVs for better texture mapping
        const rightUVs = grassGeometryRight.attributes.uv.array;
        for (let i = 0; i < rightUVs.length; i += 2) {
            // Scale UVs to repeat texture properly
            rightUVs[i] = rightUVs[i] * 2;
            rightUVs[i + 1] = rightUVs[i + 1] * 4;
        }
        grassGeometryRight.attributes.uv.needsUpdate = true;
        
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
    
    enableBackfaceCulling() {
        // Enable backface culling for all materials to improve performance
        this.roadMaterial.side = THREE.FrontSide;
        this.grassMaterial.side = THREE.FrontSide;
        this.markingMaterial.side = THREE.FrontSide;
    }
    
    createCircularBoundary() {
        // Create a large circular ground plane with more segments for better texture mapping
        const groundGeometry = new THREE.CircleGeometry(this.boundaryRadius, 128);
        
        // Adjust UV mapping for better texture distribution
        const uvs = groundGeometry.attributes.uv.array;
        for (let i = 0; i < uvs.length; i += 2) {
            // Scale UVs from [0,1] to [-4,4] for better texture distribution
            uvs[i] = (uvs[i] - 0.5) * 8;
            uvs[i + 1] = (uvs[i + 1] - 0.5) * 8;
        }
        groundGeometry.attributes.uv.needsUpdate = true;
        
        const ground = new THREE.Mesh(groundGeometry, this.grassMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1; // Slightly below the road to avoid z-fighting
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Create boundary wall segments instead of a single large wall
        this.createBoundaryWallSegments();
        
        // Create instanced pillars for better performance
        this.createInstancedPillars();
    }
    
    createBoundaryWallSegments() {
        // Create the boundary in segments for dynamic loading
        const segmentCount = 64; // Increased from 32 to 64 for smoother boundary
        const segmentAngle = (Math.PI * 2) / segmentCount;
        
        // Load wall texture
        const textureLoader = new THREE.TextureLoader();
        const wallTexture = textureLoader.load('textures/wall.jpg');
        wallTexture.wrapS = THREE.RepeatWrapping;
        wallTexture.wrapT = THREE.RepeatWrapping;
        wallTexture.repeat.set(16, 2); // Adjust repeat values as needed for proper scaling
        
        // Create a material for the boundary wall - make it opaque
        const wallMaterial = new THREE.MeshStandardMaterial({
            map: wallTexture,
            color: 0xffffff, // Use white color to show texture properly
            roughness: 0.7,
            metalness: 0.3,
            side: THREE.DoubleSide,
            transparent: false,
            opacity: 1.0
        });
        
        // Create a single continuous wall using CylinderGeometry instead of individual segments
        const wallGeometry = new THREE.CylinderGeometry(
            this.boundaryRadius, // top radius
            this.boundaryRadius + 10, // bottom radius slightly larger for a slope effect
            this.boundaryHeight, // height
            64, // radial segments - increased for smoother appearance
            1, // height segments
            true, // open-ended
            0, // start angle
            Math.PI * 2 // end angle - full circle
        );
        
        // Adjust UV mapping for better texture distribution on cylinder
        const uvs = wallGeometry.attributes.uv.array;
        for (let i = 0; i < uvs.length; i += 2) {
            // Scale U coordinate based on circumference for proper horizontal tiling
            uvs[i] = uvs[i] * 16;
        }
        wallGeometry.attributes.uv.needsUpdate = true;
        
        const wall = new THREE.Mesh(wallGeometry, wallMaterial);
        wall.position.y = this.boundaryHeight / 2; // Position so bottom is at ground level
        wall.castShadow = true;
        wall.receiveShadow = true;
        this.scene.add(wall);
        
        // Store the wall for reference
        this.boundaryWall = wall;
        
        // Create a glowing edge at the top of the wall
        const edgeGeometry = new THREE.TorusGeometry(
            this.boundaryRadius, // radius
            1.0, // tube radius - increased for better visibility
            16, // radial segments
            64 // tubular segments
        );
        
        const edgeMaterial = new THREE.MeshStandardMaterial({
            color: 0x00aaff,
            emissive: 0x0088ff,
            emissiveIntensity: 0.8, // Increased for better visibility
            roughness: 0.3,
            metalness: 0.7
        });
        
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.rotation.x = Math.PI / 2;
        edge.position.y = this.boundaryHeight;
        edge.castShadow = true;
        this.scene.add(edge);
        
        // Store the edge for reference
        this.boundaryEdge = edge;
    }
    
    createInstancedPillars() {
        // Create instanced mesh for pillars (much more efficient than individual meshes)
        const pillarCount = 32; // Number of pillars around the boundary
        const pillarHeight = 25; // Increased height to match the taller wall
        const pillarRadius = 5; // Increased radius for better visibility
        const pillarDistance = this.boundaryRadius - 2; // Slightly inside the boundary wall
        
        // Create pillar geometry and material
        const pillarGeometry = new THREE.CylinderGeometry(
            pillarRadius, // top radius
            pillarRadius * 1.5, // bottom radius
            pillarHeight, // height
            8, // radial segments
            1 // height segments
        );
        
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.6,
            metalness: 0.4
        });
        
        // Create instanced mesh for pillars
        this.pillarInstances = new THREE.InstancedMesh(
            pillarGeometry,
            pillarMaterial,
            pillarCount
        );
        
        this.pillarInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.pillarInstances.castShadow = true;
        this.pillarInstances.receiveShadow = true;
        
        // Set up matrix for each instance
        const dummy = new THREE.Object3D();
        
        for (let i = 0; i < pillarCount; i++) {
            const angle = (i / pillarCount) * Math.PI * 2;
            const x = Math.cos(angle) * pillarDistance;
            const z = Math.sin(angle) * pillarDistance;
            
            dummy.position.set(x, pillarHeight / 2, z);
            dummy.updateMatrix();
            
            this.pillarInstances.setMatrixAt(i, dummy.matrix);
        }
        
        this.pillarInstances.instanceMatrix.needsUpdate = true;
        this.scene.add(this.pillarInstances);
        
        // Create point lights (reduced number for performance)
        this.createBoundaryLights(pillarCount, pillarDistance, pillarHeight);
    }
    
    createBoundaryLights(pillarCount, pillarDistance, pillarHeight) {
        // Create lights on top of every 4th pillar to reduce light count
        const lightCount = Math.floor(pillarCount / 4);
        
        // Create an array to store the lights
        this.boundaryLights = [];
        
        for (let i = 0; i < lightCount; i++) {
            const pillarIndex = i * 4; // Every 4th pillar
            const angle = (pillarIndex / pillarCount) * Math.PI * 2;
            const x = Math.cos(angle) * pillarDistance;
            const z = Math.sin(angle) * pillarDistance;
            
            const light = new THREE.PointLight(0x00aaff, 0.8, 100);
            light.position.set(x, pillarHeight + 1, z);
            light.visible = false; // Start with lights off
            this.scene.add(light);
            
            // Store the light with its angle for dynamic loading
            this.boundaryLights.push({
                light: light,
                angle: angle,
                position: new THREE.Vector3(x, pillarHeight + 1, z)
            });
        }
    }
    
    // Create rough terrain spots all around the boundary
    createBoundaryRoughTerrain() {
        // Number of rough spots to create
        const numSpots = 100; // Lots of spots across the boundary
        
        // Create debug material for the bumps
        const bumpMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.7,
            wireframe: false
        });
        
        // Clear any existing bumps
        this.terrainBumpMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
        });
        this.terrainBumpMeshes = [];
        this.terrainBumps = [];
        
        // Create random bumps across the boundary
        for (let i = 0; i < numSpots; i++) {
            // Random angle and distance from center
            const angle = Math.random() * Math.PI * 2;
            // Distribute bumps across the entire boundary, but avoid the very center
            const distance = Math.random() * (this.boundaryRadius * 0.95 - 50) + 50;
            
            // Calculate position
            const x = Math.cos(angle) * distance;
            const z = Math.sin(angle) * distance;
            
            // Random bump properties
            const bumpRadius = Math.random() * 3 + 1.5;
            const bumpHeight = Math.random() * 1.0 + 0.5;
            
            // Store bump information
            this.terrainBumps.push({
                position: new THREE.Vector3(x, 0, z),
                radius: bumpRadius,
                height: bumpHeight
            });
            
            // Create a visual representation of the bump
            const bumpGeometry = new THREE.SphereGeometry(bumpRadius, 16, 16);
            const bumpMesh = new THREE.Mesh(bumpGeometry, bumpMaterial);
            
            // Position the bump
            bumpMesh.position.set(x, bumpHeight * 0.5, z);
            
            // Scale the sphere to match the bump height
            bumpMesh.scale.y = bumpHeight * 0.5;
            
            // Add to scene and track
            this.scene.add(bumpMesh);
            this.terrainBumpMeshes.push(bumpMesh);
        }
    }
    
    // Add a method to check if a position is within the boundary
    isWithinBoundary(position) {
        // Calculate distance from center (0,0,0) to the position (x,z plane only)
        const distance = Math.sqrt(position.x * position.x + position.z * position.z);
        // Return true if within boundary, false otherwise
        return distance < this.boundaryRadius - 5; // 5 units buffer
    }
    
    // Update method to dynamically load boundary elements based on car position
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
                
                // Move this segment to be the new furthest segment
                const newZ = lastSegmentZ - this.roadLength;
                segment.position.z = newZ;
                
                // Update all meshes in the segment
                segment.meshes.forEach(mesh => {
                    mesh.position.z = newZ;
                });
                
                // Mark as recycled
                segment.wasRecycled = true;
                
                // If we have bump maps, regenerate them for the recycled segment
                if (segment.bumpMap) {
                    // Clear existing bump map
                    segment.bumpMap = [];
                    
                    // Remove debug visualization meshes
                    if (segment.debugMeshes) {
                        segment.debugMeshes.forEach(mesh => {
                            this.scene.remove(mesh);
                            mesh.geometry.dispose();
                            mesh.material.dispose();
                        });
                        segment.debugMeshes = [];
                    }
                    
                    // Get the road mesh (first mesh in the segment)
                    const roadMesh = segment.meshes[0];
                    
                    // Reset the geometry to flat
                    const newGeometry = new THREE.PlaneGeometry(this.roadWidth, this.roadLength, 20, 20);
                    
                    // Add new random bumps
                    this.addRoughTerrain(newGeometry, segment.bumpMap);
                    
                    // Update the mesh geometry
                    roadMesh.geometry.dispose(); // Clean up old geometry
                    roadMesh.geometry = newGeometry;
                    
                    // Add new debug visualization
                    this.addBumpVisualization(segment, newZ);
                }
            }
        }
        
        // Update dynamic boundary based on car position
        this.updateDynamicBoundary(carPosition);
        
        // Occasionally refresh boundary bumps for variety
        if (Math.random() < 0.005) { // Small chance each frame
            this.createBoundaryRoughTerrain();
        }
    }
    
    updateDynamicBoundary(carPosition) {
        // With a continuous wall, we don't need to update visibility of individual segments
        // The wall is always visible, and Three.js's built-in frustum culling will handle it
        
        // We can still update the lights based on car position for performance
        if (this.boundaryLights) {
            // Calculate angle from center to car position
            const carAngle = Math.atan2(carPosition.z, carPosition.x);
            
            // Update lights visibility
            this.boundaryLights.forEach(lightData => {
                // Calculate angle difference
                let angleDiff = Math.abs(lightData.angle - carAngle);
                angleDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
                
                // Calculate distance from car to light
                const lightPos = lightData.position;
                const distToLight = Math.sqrt(
                    Math.pow(carPosition.x - lightPos.x, 2) + 
                    Math.pow(carPosition.z - lightPos.z, 2)
                );
                
                // Only show lights within the visible section angle and within visible distance
                // Increased visible angle to 180 degrees for better lighting
                lightData.light.visible = (angleDiff < Math.PI) && (distToLight < this.visibleDistance);
            });
        }
    }
    
    // Add a method to visualize bumps
    addBumpVisualization(segment, zPosition) {
        // Create debug materials
        const debugMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.7, // Increased opacity
            wireframe: false // Solid instead of wireframe
        });
        
        // Add visualization for each bump
        for (const bump of segment.bumpMap) {
            // Create a sphere to represent the bump
            const bumpGeometry = new THREE.SphereGeometry(bump.radius, 16, 16);
            const bumpMesh = new THREE.Mesh(bumpGeometry, debugMaterial);
            
            // Position the sphere at the bump location
            bumpMesh.position.set(
                bump.position.x,
                bump.height * 0.5, // Set height to match bump height
                bump.position.y + zPosition // Adjust for segment position
            );
            
            // Scale the sphere to match the bump height
            bumpMesh.scale.y = bump.height * 0.5;
            
            // Add to scene and track in segment
            this.scene.add(bumpMesh);
            segment.debugMeshes.push(bumpMesh);
        }
    }
    
    // Add a new method to create rough terrain
    addRoughTerrain(geometry, bumpMap) {
        const vertices = geometry.attributes.position.array;
        const width = this.roadWidth;
        const length = this.roadLength;
        
        // Number of bumps to add - increased for more bumps
        const numBumps = Math.floor(Math.random() * 8) + 5; // 5-12 bumps per segment
        
        for (let i = 0; i < numBumps; i++) {
            // Random position for the bump
            const bumpX = (Math.random() * width) - (width / 2); // Position across road width
            const bumpZ = (Math.random() * length) - (length / 2); // Position along road length
            const bumpRadius = Math.random() * 3 + 1.5; // Increased radius between 1.5-4.5 units
            const bumpHeight = Math.random() * 1.0 + 0.5; // Significantly increased height between 0.5-1.5 units
            
            // Store bump information for physics calculations
            bumpMap.push({
                position: new THREE.Vector2(bumpX, bumpZ),
                radius: bumpRadius,
                height: bumpHeight
            });
            
            // Apply bump to vertices
            for (let j = 0; j < vertices.length; j += 3) {
                const vertX = vertices[j];
                const vertZ = vertices[j + 2];
                
                // Calculate distance from bump center
                const distance = Math.sqrt(
                    Math.pow(vertX - bumpX, 2) + 
                    Math.pow(vertZ - bumpZ, 2)
                );
                
                // Apply bump if vertex is within bump radius
                if (distance < bumpRadius) {
                    // Smooth falloff from center of bump
                    const falloff = 1 - (distance / bumpRadius);
                    vertices[j + 1] += bumpHeight * falloff * falloff;
                }
            }
        }
        
        // Update geometry
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
    }
    
    // Add a method to check if the car is on a boundary bump
    getBoundaryBumpAtPosition(position) {
        // Check if the car is on any bump in the boundary
        for (const bump of this.terrainBumps) {
            const distance = Math.sqrt(
                Math.pow(position.x - bump.position.x, 2) + 
                Math.pow(position.z - bump.position.z, 2)
            );
            
            if (distance < bump.radius) {
                // Calculate bump effect based on distance from center
                const falloff = 1 - (distance / bump.radius);
                const bumpEffect = bump.height * falloff * falloff;
                
                return {
                    height: bumpEffect,
                    normal: new THREE.Vector3(
                        (position.x - bump.position.x) / distance * falloff,
                        1,
                        (position.z - bump.position.z) / distance * falloff
                    ).normalize()
                };
            }
        }
        
        return null;
    }
    
    // Modify the existing getBumpAtPosition method to check both road and boundary bumps
    getBumpAtPosition(position) {
        // First check road segment bumps
        const roadBump = this.getRoadBumpAtPosition(position);
        if (roadBump) {
            return roadBump;
        }
        
        // Then check boundary bumps
        return this.getBoundaryBumpAtPosition(position);
    }
    
    // Rename the original method to getRoadBumpAtPosition
    getRoadBumpAtPosition(position) {
        // Find which segment the car is on
        const segment = this.segments.find(seg => 
            position.z >= seg.position.z - this.roadLength / 2 && 
            position.z <= seg.position.z + this.roadLength / 2
        );
        
        if (!segment || !segment.bumpMap) {
            return null;
        }
        
        // Convert world position to segment-local position
        const localX = position.x;
        const localZ = position.z - segment.position.z;
        
        // Check if the car is on any bump in this segment
        for (const bump of segment.bumpMap) {
            const distance = Math.sqrt(
                Math.pow(localX - bump.position.x, 2) + 
                Math.pow(localZ - bump.position.y, 2)
            );
            
            if (distance < bump.radius) {
                // Calculate bump effect based on distance from center
                const falloff = 1 - (distance / bump.radius);
                const bumpEffect = bump.height * falloff * falloff;
                
                return {
                    height: bumpEffect,
                    normal: new THREE.Vector3(
                        (localX - bump.position.x) / distance * falloff,
                        1,
                        (localZ - bump.position.y) / distance * falloff
                    ).normalize()
                };
            }
        }
        
        return null;
    }
}