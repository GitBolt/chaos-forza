import * as THREE from 'three';

// Mock implementation of Florasynth for direct browser use without npm
// This will be replaced with actual Florasynth import when available
const FLORASYNTH = {
    Tree: class Tree {
        constructor(preset) {
            this.preset = preset;
            this.type = preset.type;
        }
        
        async generate() {
            // Create different tree types based on preset
            switch(this.type) {
                case 'pine':
                    return this.generatePineTree();
                case 'palm':
                    return this.generatePalmTree();
                case 'maple':
                    return this.generateMapleTree();
                case 'oak':
                    return this.generateOakTree();
                case 'ash':
                default:
                    return this.generateAshTree();
            }
        }
        
        async generateAshTree() {
            // Create a group to hold all parts
            const treeGroup = new THREE.Group();
            
            // Create trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.4, 5, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8B4513,
                roughness: 0.8,
                metalness: 0.2
            });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            trunk.position.y = 2.5; // Half of the height
            treeGroup.add(trunk);
            
            // Create main foliage
            const foliageGeometry = new THREE.SphereGeometry(2.5, 12, 12);
            const foliageMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x228B22,
                roughness: 0.9,
                metalness: 0.1
            });
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            foliage.position.y = 6; // Position above trunk
            treeGroup.add(foliage);
            
            // Add some branches
            this.addBranches(treeGroup, 3, 0.15, 1.5, 0x8B4513);
            
            return {
                mesh: trunk,
                foliageMesh: foliage,
                group: treeGroup,
                fruitMesh: null
            };
        }
        
        async generatePineTree() {
            // Create a group to hold all parts
            const treeGroup = new THREE.Group();
            
            // Create trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 6, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x5C4033,
                roughness: 0.8,
                metalness: 0.2
            });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            trunk.position.y = 3; // Half of the height
            treeGroup.add(trunk);
            
            // Create pine foliage (multiple cones)
            const foliageColor = 0x2E8B57; // Dark green
            
            // Bottom cone (largest)
            const cone1 = new THREE.Mesh(
                new THREE.ConeGeometry(3, 4, 8),
                new THREE.MeshStandardMaterial({ 
                    color: foliageColor,
                    roughness: 0.9,
                    metalness: 0.1
                })
            );
            cone1.castShadow = true;
            cone1.receiveShadow = true;
            cone1.position.y = 4;
            treeGroup.add(cone1);
            
            // Middle cone
            const cone2 = new THREE.Mesh(
                new THREE.ConeGeometry(2.2, 3.5, 8),
                new THREE.MeshStandardMaterial({ 
                    color: foliageColor,
                    roughness: 0.9,
                    metalness: 0.1
                })
            );
            cone2.castShadow = true;
            cone2.receiveShadow = true;
            cone2.position.y = 7;
            treeGroup.add(cone2);
            
            // Top cone (smallest)
            const cone3 = new THREE.Mesh(
                new THREE.ConeGeometry(1.5, 3, 8),
                new THREE.MeshStandardMaterial({ 
                    color: foliageColor,
                    roughness: 0.9,
                    metalness: 0.1
                })
            );
            cone3.castShadow = true;
            cone3.receiveShadow = true;
            cone3.position.y = 9.5;
            treeGroup.add(cone3);
            
            return {
                mesh: trunk,
                foliageMesh: cone1, // Just use the first cone as the main foliage
                group: treeGroup,
                fruitMesh: null
            };
        }
        
        async generatePalmTree() {
            // Create a group to hold all parts
            const treeGroup = new THREE.Group();
            
            // Create trunk (slightly curved)
            const trunkCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(0.3, 2, 0.2),
                new THREE.Vector3(0.5, 4, 0.3),
                new THREE.Vector3(0.2, 6, 0.1),
                new THREE.Vector3(0, 8, 0)
            ]);
            
            const trunkGeometry = new THREE.TubeGeometry(trunkCurve, 20, 0.3, 8, false);
            const trunkMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8B5A2B,
                roughness: 0.7,
                metalness: 0.2
            });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            treeGroup.add(trunk);
            
            // Create palm leaves
            const leafCount = 7;
            const leafColor = 0x32CD32;
            
            for (let i = 0; i < leafCount; i++) {
                const angle = (i / leafCount) * Math.PI * 2;
                const leafGroup = new THREE.Group();
                
                // Create leaf stem
                const stemCurve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(Math.sin(angle) * 1, 0.5, Math.cos(angle) * 1),
                    new THREE.Vector3(Math.sin(angle) * 2, 0.7, Math.cos(angle) * 2),
                    new THREE.Vector3(Math.sin(angle) * 3, 0.5, Math.cos(angle) * 3)
                ]);
                
                const stemGeometry = new THREE.TubeGeometry(stemCurve, 10, 0.1, 4, false);
                const stemMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x8B5A2B,
                    roughness: 0.7,
                    metalness: 0.2
                });
                const stem = new THREE.Mesh(stemGeometry, stemMaterial);
                stem.castShadow = true;
                stem.receiveShadow = true;
                leafGroup.add(stem);
                
                // Create leaf blade
                const leafShape = new THREE.Shape();
                leafShape.moveTo(0, 0);
                leafShape.bezierCurveTo(0.5, 0.5, 1.5, 0.5, 2, 0);
                leafShape.bezierCurveTo(1.5, -0.5, 0.5, -0.5, 0, 0);
                
                const leafGeometry = new THREE.ShapeGeometry(leafShape);
                const leafMaterial = new THREE.MeshStandardMaterial({ 
                    color: leafColor,
                    roughness: 0.8,
                    metalness: 0.1,
                    side: THREE.DoubleSide
                });
                
                // Create multiple leaf segments
                for (let j = 0; j < 5; j++) {
                    const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
                    leaf.scale.set(0.7, 1.5, 1);
                    leaf.position.set(Math.sin(angle) * (2 + j * 0.3), 0, Math.cos(angle) * (2 + j * 0.3));
                    leaf.rotation.x = Math.PI / 2;
                    leaf.rotation.y = angle + Math.PI / 2;
                    leaf.castShadow = true;
                    leaf.receiveShadow = true;
                    leafGroup.add(leaf);
                }
                
                leafGroup.position.y = 8;
                leafGroup.rotation.x = Math.random() * 0.3 - 0.15;
                treeGroup.add(leafGroup);
            }
            
            // Create coconuts
            const coconutCount = Math.floor(Math.random() * 3) + 1;
            const coconuts = new THREE.Group();
            
            for (let i = 0; i < coconutCount; i++) {
                const coconutAngle = Math.random() * Math.PI * 2;
                const coconutGeometry = new THREE.SphereGeometry(0.3, 8, 8);
                const coconutMaterial = new THREE.MeshStandardMaterial({ 
                    color: 0x8B4513,
                    roughness: 0.7,
                    metalness: 0.2
                });
                const coconut = new THREE.Mesh(coconutGeometry, coconutMaterial);
                coconut.position.set(
                    Math.sin(coconutAngle) * 0.5,
                    7.8,
                    Math.cos(coconutAngle) * 0.5
                );
                coconut.castShadow = true;
                coconut.receiveShadow = true;
                coconuts.add(coconut);
            }
            
            treeGroup.add(coconuts);
            
            return {
                mesh: trunk,
                foliageMesh: coconuts, // Use coconuts as foliage for reference
                group: treeGroup,
                fruitMesh: coconuts
            };
        }
        
        async generateMapleTree() {
            // Create a group to hold all parts
            const treeGroup = new THREE.Group();
            
            // Create trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.25, 0.5, 5, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x8B4513,
                roughness: 0.8,
                metalness: 0.2
            });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            trunk.position.y = 2.5; // Half of the height
            treeGroup.add(trunk);
            
            // Add branches
            this.addBranches(treeGroup, 5, 0.15, 2, 0x8B4513);
            
            // Create foliage (multiple spheres for maple shape)
            const foliageColor = 0xE25822; // Orange-red for maple
            const foliageGroup = new THREE.Group();
            
            // Create main foliage clusters
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const radius = 1.5 + Math.random() * 0.5;
                const x = Math.sin(angle) * radius;
                const z = Math.cos(angle) * radius;
                const y = 5 + Math.random() * 2;
                
                const foliageGeometry = new THREE.SphereGeometry(1.2 + Math.random() * 0.5, 8, 8);
                const foliageMaterial = new THREE.MeshStandardMaterial({ 
                    color: foliageColor,
                    roughness: 0.9,
                    metalness: 0.1
                });
                const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
                foliage.position.set(x, y, z);
                foliage.castShadow = true;
                foliage.receiveShadow = true;
                foliageGroup.add(foliage);
            }
            
            // Add top foliage
            const topFoliage = new THREE.Mesh(
                new THREE.SphereGeometry(1.5, 8, 8),
                new THREE.MeshStandardMaterial({ 
                    color: foliageColor,
                    roughness: 0.9,
                    metalness: 0.1
                })
            );
            topFoliage.position.y = 7.5;
            topFoliage.castShadow = true;
            topFoliage.receiveShadow = true;
            foliageGroup.add(topFoliage);
            
            treeGroup.add(foliageGroup);
            
            return {
                mesh: trunk,
                foliageMesh: foliageGroup,
                group: treeGroup,
                fruitMesh: null
            };
        }
        
        async generateOakTree() {
            // Create a group to hold all parts
            const treeGroup = new THREE.Group();
            
            // Create trunk
            const trunkGeometry = new THREE.CylinderGeometry(0.4, 0.7, 6, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x5C4033,
                roughness: 0.8,
                metalness: 0.2
            });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.castShadow = true;
            trunk.receiveShadow = true;
            trunk.position.y = 3; // Half of the height
            treeGroup.add(trunk);
            
            // Add branches
            this.addBranches(treeGroup, 7, 0.2, 2.5, 0x5C4033);
            
            // Create foliage (large, dense sphere for oak)
            const foliageGeometry = new THREE.SphereGeometry(4, 12, 12);
            const foliageMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x006400, // Dark green
                roughness: 0.9,
                metalness: 0.1
            });
            const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
            foliage.castShadow = true;
            foliage.receiveShadow = true;
            foliage.position.y = 7; // Position above trunk
            
            // Add some variation to the foliage shape
            foliage.scale.set(1, 0.8, 1); // Flatten slightly
            
            treeGroup.add(foliage);
            
            return {
                mesh: trunk,
                foliageMesh: foliage,
                group: treeGroup,
                fruitMesh: null
            };
        }
        
        // Helper method to add branches to trees
        addBranches(treeGroup, count, radius, length, color) {
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const height = 2 + Math.random() * 3;
                
                // Create branch curve
                const branchCurve = new THREE.CatmullRomCurve3([
                    new THREE.Vector3(0, height, 0),
                    new THREE.Vector3(
                        Math.sin(angle) * length * 0.3,
                        height + 0.5,
                        Math.cos(angle) * length * 0.3
                    ),
                    new THREE.Vector3(
                        Math.sin(angle) * length,
                        height + 0.2,
                        Math.cos(angle) * length
                    )
                ]);
                
                const branchGeometry = new THREE.TubeGeometry(branchCurve, 8, radius, 6, false);
                const branchMaterial = new THREE.MeshStandardMaterial({ 
                    color: color,
                    roughness: 0.8,
                    metalness: 0.2
                });
                const branch = new THREE.Mesh(branchGeometry, branchMaterial);
                branch.castShadow = true;
                branch.receiveShadow = true;
                treeGroup.add(branch);
            }
        }
    },
    
    Presets: {
        ASH: { type: 'ash' },
        PINE: { type: 'pine' },
        OAK: { type: 'oak' },
        PALM: { type: 'palm' },
        MAPLE: { type: 'maple' }
    }
};

export class TreeManager {
    constructor(scene, road) {
        this.scene = scene;
        this.road = road;
        this.trees = [];
        this.treeTypes = [
            FLORASYNTH.Presets.ASH,
            FLORASYNTH.Presets.PINE,
            FLORASYNTH.Presets.OAK,
            FLORASYNTH.Presets.MAPLE,
            FLORASYNTH.Presets.PALM
        ];
        
        // Tree density and placement parameters
        this.treeDensity = 0.5; // Trees per unit area
        this.minDistanceFromRoad = 15; // Minimum distance from road edge
        this.maxDistanceFromRoad = 40; // Maximum distance from road edge
        this.minDistanceBetweenTrees = 8; // Minimum distance between trees
        
        // Color variations for different tree types
        this.colorVariations = {
            ash: [0x228B22, 0x32CD32, 0x006400, 0x556B2F],  // Green variations
            pine: [0x2E8B57, 0x006400, 0x2F4F4F, 0x3CB371], // Dark green variations
            oak: [0x006400, 0x228B22, 0x355E3B, 0x4F7942],  // Green variations
            maple: [0xE25822, 0xFF4500, 0xFF6347, 0xCD5C5C], // Red/orange variations
            palm: [0x32CD32, 0x228B22, 0x7CFC00, 0x00FF00]  // Bright green variations
        };
        
        // Initialize trees
        this.init();
    }
    
    async init() {
        // Generate trees for each road segment
        for (const segment of this.road.segments) {
            await this.generateTreesForSegment(segment);
        }
    }
    
    async generateTreesForSegment(segment) {
        const segmentZ = segment.position.z;
        const roadWidth = this.road.roadWidth;
        const roadLength = this.road.roadLength;
        
        // Calculate area for tree placement
        const leftAreaStart = -(roadWidth/2 + this.minDistanceFromRoad);
        const leftAreaEnd = -(roadWidth/2 + this.maxDistanceFromRoad);
        const rightAreaStart = roadWidth/2 + this.minDistanceFromRoad;
        const rightAreaEnd = roadWidth/2 + this.maxDistanceFromRoad;
        
        // Number of trees to place on each side
        const treesPerSide = Math.floor(roadLength * (this.maxDistanceFromRoad - this.minDistanceFromRoad) * this.treeDensity / 2);
        
        // Place trees on left side
        for (let i = 0; i < treesPerSide; i++) {
            const x = THREE.MathUtils.randFloat(leftAreaEnd, leftAreaStart);
            const z = segmentZ - THREE.MathUtils.randFloat(0, roadLength);
            
            // Add some height variation to the terrain
            const y = Math.random() < 0.2 ? THREE.MathUtils.randFloat(-1, 1) : 0;
            
            await this.placeTree(x, y, z);
        }
        
        // Place trees on right side
        for (let i = 0; i < treesPerSide; i++) {
            const x = THREE.MathUtils.randFloat(rightAreaStart, rightAreaEnd);
            const z = segmentZ - THREE.MathUtils.randFloat(0, roadLength);
            
            // Add some height variation to the terrain
            const y = Math.random() < 0.2 ? THREE.MathUtils.randFloat(-1, 1) : 0;
            
            await this.placeTree(x, y, z);
        }
        
        // Occasionally place trees in clusters
        if (Math.random() < 0.3) {
            const clusterX = THREE.MathUtils.randFloat(leftAreaEnd - 10, leftAreaStart - 10);
            const clusterZ = segmentZ - THREE.MathUtils.randFloat(0, roadLength);
            
            // Create a cluster of 3-5 trees
            const clusterSize = Math.floor(Math.random() * 3) + 3;
            const treeType = this.treeTypes[Math.floor(Math.random() * this.treeTypes.length)];
            
            for (let i = 0; i < clusterSize; i++) {
                const offsetX = THREE.MathUtils.randFloat(-5, 5);
                const offsetZ = THREE.MathUtils.randFloat(-5, 5);
                await this.placeTree(
                    clusterX + offsetX, 
                    0, 
                    clusterZ + offsetZ, 
                    treeType
                );
            }
        }
        
        // Occasionally place trees in clusters on the right side
        if (Math.random() < 0.3) {
            const clusterX = THREE.MathUtils.randFloat(rightAreaStart + 10, rightAreaEnd + 10);
            const clusterZ = segmentZ - THREE.MathUtils.randFloat(0, roadLength);
            
            // Create a cluster of 3-5 trees
            const clusterSize = Math.floor(Math.random() * 3) + 3;
            const treeType = this.treeTypes[Math.floor(Math.random() * this.treeTypes.length)];
            
            for (let i = 0; i < clusterSize; i++) {
                const offsetX = THREE.MathUtils.randFloat(-5, 5);
                const offsetZ = THREE.MathUtils.randFloat(-5, 5);
                await this.placeTree(
                    clusterX + offsetX, 
                    0, 
                    clusterZ + offsetZ, 
                    treeType
                );
            }
        }
    }
    
    async placeTree(x, y, z, specificTreeType = null) {
        // Check if position is too close to existing trees
        for (const tree of this.trees) {
            const distance = Math.sqrt(
                Math.pow(tree.position.x - x, 2) + 
                Math.pow(tree.position.z - z, 2)
            );
            if (distance < this.minDistanceBetweenTrees) {
                return; // Too close to another tree
            }
        }
        
        // Select tree type (either specified or random)
        const treeType = specificTreeType || this.treeTypes[Math.floor(Math.random() * this.treeTypes.length)];
        
        // Generate tree
        const treeGenerator = new FLORASYNTH.Tree(treeType);
        const treeMeshes = await treeGenerator.generate();
        
        // Apply color variations
        this.applyColorVariation(treeMeshes, treeType.type);
        
        // Add random rotation and scale variation
        const rotation = Math.random() * Math.PI * 2;
        const scale = 0.7 + Math.random() * 0.6; // More variation in size
        
        treeMeshes.group.rotation.y = rotation;
        treeMeshes.group.scale.set(scale, scale, scale);
        treeMeshes.group.position.set(x, y, z);
        
        // Add to scene
        this.scene.add(treeMeshes.group);
        
        // Store reference with position for distance checking
        this.trees.push({
            meshes: treeMeshes,
            position: new THREE.Vector3(x, y, z),
            group: treeMeshes.group
        });
        
        return treeMeshes;
    }
    
    // Apply color variations to tree parts
    applyColorVariation(treeMeshes, treeType) {
        // Get color variations for this tree type
        const colorOptions = this.colorVariations[treeType] || this.colorVariations.ash;
        
        // Select a random color from the options
        const colorIndex = Math.floor(Math.random() * colorOptions.length);
        const color = colorOptions[colorIndex];
        
        // Apply to foliage if it exists
        if (treeMeshes.foliageMesh) {
            if (treeMeshes.foliageMesh.material) {
                treeMeshes.foliageMesh.material.color.setHex(color);
            } else if (treeMeshes.foliageMesh.children) {
                // For group-based foliage (like maple)
                treeMeshes.foliageMesh.children.forEach(child => {
                    if (child.material) {
                        child.material.color.setHex(color);
                    }
                });
            }
        }
        
        // Apply slight trunk color variation
        if (treeMeshes.mesh && treeMeshes.mesh.material) {
            // Slightly randomize trunk color
            const trunkColor = treeMeshes.mesh.material.color.getHex();
            const variation = 0.1; // 10% variation
            
            // Create a slight variation of the trunk color
            const r = ((trunkColor >> 16) & 255) / 255;
            const g = ((trunkColor >> 8) & 255) / 255;
            const b = (trunkColor & 255) / 255;
            
            const newR = Math.max(0, Math.min(1, r * (1 + (Math.random() * variation * 2 - variation))));
            const newG = Math.max(0, Math.min(1, g * (1 + (Math.random() * variation * 2 - variation))));
            const newB = Math.max(0, Math.min(1, b * (1 + (Math.random() * variation * 2 - variation))));
            
            treeMeshes.mesh.material.color.setRGB(newR, newG, newB);
        }
    }
    
    // Method to update trees when road segments are recycled
    async updateTrees(carPosition) {
        // Check if we need to generate new trees for recycled road segments
        for (const segment of this.road.segments) {
            // If this segment was recently recycled (moved forward)
            if (segment.wasRecycled) {
                // Generate trees for this segment
                await this.generateTreesForSegment(segment);
                segment.wasRecycled = false;
            }
        }
        
        // Remove trees that are too far behind the car
        const removalDistance = this.road.roadLength * this.road.totalSegments;
        const treesToRemove = [];
        
        for (let i = this.trees.length - 1; i >= 0; i--) {
            const tree = this.trees[i];
            if (tree.position.z > carPosition.z + removalDistance) {
                // Remove from scene
                this.scene.remove(tree.group);
                treesToRemove.push(i);
            }
        }
        
        // Remove trees from array
        for (const index of treesToRemove) {
            this.trees.splice(index, 1);
        }
    }
} 