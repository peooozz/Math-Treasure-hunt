/**
 * Enemies module handling PBR Low-Poly Insect rendering, animations, billboard health tags, fireballs, and health kit drops
 */
import * as THREE from 'three';
import Particles from './particles';
import { Sound } from './sound';
import Player from './player';
import { LEVELS, getAssetUrl } from './levels';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import Physics from './physics';

const Enemies = (() => {
    let sceneRef;
    const activeEnemies = [];
    const activeDrops = [];
    const activeFireballs = [];
    let currentLevelIndex = 1;
    let enemyModelTemplate = null;
    let isModelLoading = false;
    let frameCount = 0;
    let cachedEnvironmentModel = null;
    const heightCache = new Map();
    
    // Combat balance parameters (slower fireballs, lighter damage)
    const fireballSpeed = 10.5;
    const fireballDamage = 6.0; // Reduced from 15 to 6!
    
    // Cache geometries & materials
    let orbGeometry;
    let orbMaterial;
    let hpKitGeometry;
    let hpKitMaterial;
    let crossMaterial;
    let fireballGeo;
    let fireballMat;
    let keyTorusGeo;
    let keyShaftGeo;
    let keyTeethGeo;
    let goldMaterial;

    function replaceProceduralMeshWithGLB(enemy) {
        if (!enemyModelTemplate) return;
        
        const toRemove = [];
        enemy.mesh.children.forEach(child => {
            if (child !== enemy.hbGroup && child !== enemy.sprite) {
                toRemove.push(child);
            }
        });
        
        toRemove.forEach(child => {
            enemy.mesh.remove(child);
            child.traverse(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
        });
        
        const enemyModelMesh = SkeletonUtils.clone(enemyModelTemplate);
        enemyModelMesh.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(enemyModelMesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleFactor = 1.6 / maxDim;
        enemyModelMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

        const center = new THREE.Vector3();
        box.getCenter(center);
        enemyModelMesh.position.set(
            -center.x * scaleFactor,
            -box.min.y * scaleFactor - 0.25,
            -center.z * scaleFactor
        );
        enemyModelMesh.rotation.y = Math.PI;

        enemy.mesh.add(enemyModelMesh);
        
        enemy.isProcedural = false;
        enemy.legs = [];
        enemy.pincerL = null;
        enemy.pincerR = null;
        enemy.antL = null;
        enemy.antR = null;
        enemy.venomSac = null;
        enemy.leftWing = null;
        enemy.rightWing = null;
    }

    function init(scene, levelIndex = 1) {
        sceneRef = scene;
        currentLevelIndex = levelIndex;
        cachedEnvironmentModel = null;
        heightCache.clear();

        // Load enemy GLB model if not loaded yet
        if (!enemyModelTemplate && !isModelLoading) {
            isModelLoading = true;
            const loader = new GLTFLoader();
            loader.load(getAssetUrl('/plasmas_mechagodzilla_anime_trilogy.glb'), (gltf) => {
                enemyModelTemplate = gltf.scene;
                enemyModelTemplate.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                isModelLoading = false;
                
                // Swap active procedural enemies
                activeEnemies.forEach(enemy => {
                    if (enemy.isProcedural) {
                        replaceProceduralMeshWithGLB(enemy);
                    }
                });
            }, undefined, (err) => {
                console.error("Error loading enemy GLB:", err);
                isModelLoading = false;
            });
        }
        
        if (orbGeometry) return;
        
        // Enemy orb — fiery RED icosahedron with inner core glow
        orbGeometry = new THREE.IcosahedronGeometry(0.45, 1);
        orbMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xcc0000,
            roughness: 0.05,
            metalness: 0.9
        });

        // Health kit box
        hpKitGeometry = new THREE.BoxGeometry(0.55, 0.55, 0.55);
        hpKitMaterial = new THREE.MeshStandardMaterial({
            color: 0x0ea5e9, // Bright medical teal-blue
            emissive: 0x0284c7,
            roughness: 0.2,
            metalness: 0.5
        });
        crossMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // Fireballs (red plasma)
        fireballGeo = new THREE.SphereGeometry(0.24, 8, 8);
        fireballMat = new THREE.MeshBasicMaterial({
            color: 0xff2200,
            toneMapped: false
        });

        // Key geometries and materials
        keyTorusGeo = new THREE.TorusGeometry(0.22, 0.05, 12, 32);
        keyShaftGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8);
        keyTeethGeo = new THREE.BoxGeometry(0.14, 0.12, 0.04);
        goldMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            metalness: 0.95,
            roughness: 0.05,
            emissive: 0x6b5a00
        });
    }

    const raycaster = new THREE.Raycaster();
    const downVector = new THREE.Vector3(0, -1, 0);

    function getGroundHeight(x, z) {
        if (!sceneRef) return 0;
        if (!cachedEnvironmentModel) {
            cachedEnvironmentModel = sceneRef.getObjectByName("environment_model");
        }
        if (!cachedEnvironmentModel) return 0;
        
        // Round to 0.2 unit grid to cache effectively
        const rx = Math.round(x * 5) / 5;
        const rz = Math.round(z * 5) / 5;
        const key = `${rx},${rz}`;
        if (heightCache.has(key)) {
            return heightCache.get(key);
        }
        
        // Primary: Cast ray downward from high up
        const origin = new THREE.Vector3(rx, 200, rz);
        raycaster.set(origin, downVector);
        raycaster.far = 250;
        
        const intersects = raycaster.intersectObject(cachedEnvironmentModel, true);
        let height = 0;
        if (intersects.length > 0) {
            // Skip roofs, balconies, and upper structures (filter for street level)
            const lvl = LEVELS[currentLevelIndex - 1];
            const maxH = (lvl && lvl.theme === 'arabic_city') ? 11.0 : 5.0;
            const minH = (lvl && lvl.theme === 'arabic_city') ? 2.0 : -2.0;
            
            let lowestY = Infinity;
            for (let i = 0; i < intersects.length; i++) {
                const yVal = intersects[i].point.y;
                if (yVal > minH && yVal < maxH) {
                    if (yVal < lowestY) {
                        lowestY = yVal;
                    }
                }
            }
            if (lowestY !== Infinity) {
                height = lowestY;
            } else {
                // Fallback to the intersection point closest to y = 0
                let closestY = intersects[0].point.y;
                let minDist = Math.abs(closestY);
                for (let i = 1; i < intersects.length; i++) {
                    const yVal = intersects[i].point.y;
                    const dist = Math.abs(yVal);
                    if (dist < minDist) {
                        minDist = dist;
                        closestY = yVal;
                    }
                }
                height = closestY;
            }
        }
        heightCache.set(key, height);
        return height;
    }

    function checkGridCollision(x, z) {
        const lvl = LEVELS[currentLevelIndex - 1];
        if (!lvl || !lvl.grid) return false;
        
        if (lvl.theme === "arabic_city" || lvl.openWorld) {
            // Strict boundaries for open world levels (Level 1: Arabic City)
            const limit = 40.0;
            if (x < -limit || x > limit || z < -limit || z > limit) {
                return true;
            }
            return Physics.checkStaticCollision(x, z, 1.2);
        }
        
        const gridRows = lvl.grid.length;
        const gridCols = lvl.grid[0].length;
        const halfW = (gridCols * 4) / 2;
        const halfD = (gridRows * 4) / 2;
        
        // Convert world coords to cell coords
        const cellX = Math.floor((x + halfW) / 4);
        const cellZ = Math.floor((z + halfD) / 4);
        
        if (cellX < 0 || cellX >= gridCols || cellZ < 0 || cellZ >= gridRows) {
            return true; // Out of bounds is wall
        }
        
        const cellType = lvl.grid[cellZ][cellX];
        return (cellType === 1 || cellType === 2);
    }

    function createTextSprite(text, color = '#ff0055') {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'Bold 14px Orbitron';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(2, 0.5, 1);
        return sprite;
    }

    /**
     * Spawns a highly detailed, 1.4x scale, flat-shaded PBR Insect
     */
    function spawnInsect(x, y, z, labelText, typeId, hpVal = 60) {
        const lvl = LEVELS[currentLevelIndex - 1];
        let dirX = 1;
        let dirZ = 0;
        let finalX = x;
        let finalZ = z;
        
        if (lvl && lvl.grid) {
            const gridRows = lvl.grid.length;
            const gridCols = lvl.grid[0].length;
            const halfW = (gridCols * 4) / 2;
            const halfD = (gridRows * 4) / 2;
            const cellX = Math.floor((x + halfW) / 4);
            const cellZ = Math.floor((z + halfD) / 4);
            
            // Check if vertical corridor is open
            const isVerticalOpen = (cellZ - 1 >= 0 && lvl.grid[cellZ - 1] && lvl.grid[cellZ - 1][cellX] === 0) || 
                                   (cellZ + 1 < gridRows && lvl.grid[cellZ + 1] && lvl.grid[cellZ + 1][cellX] === 0);
            
            if (isVerticalOpen) {
                dirX = 0;
                dirZ = 1;
                // Snap X coordinate to center of cell
                finalX = -halfW + cellX * 4 + 2;
            } else {
                dirX = 1;
                dirZ = 0;
                // Snap Z coordinate to center of cell
                finalZ = -halfD + cellZ * 4 + 2;
            }
        }

        const group = new THREE.Group();
        let spawnY = y;
        if (lvl && lvl.modelPath) {
            spawnY = getGroundHeight(finalX, finalZ);
        }
        group.position.set(finalX, spawnY + 0.3, finalZ);
        
        // Scale to 1.4x (menacing giant insect!)
        group.scale.set(1.4, 1.4, 1.4);

        let legs = [];
        let pincerLGroup = null;
        let pincerRGroup = null;
        let antLGroup = null;
        let antRGroup = null;
        let venomSac = null;
        let leftWingGroup = null;
        let rightWingGroup = null;
        let isProcedural = false;

        if (enemyModelTemplate) {
            const enemyModelMesh = SkeletonUtils.clone(enemyModelTemplate);
            enemyModelMesh.updateMatrixWorld(true);
            // Scale and center the loaded model
            const box = new THREE.Box3().setFromObject(enemyModelMesh);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scaleFactor = 1.6 / maxDim;
            enemyModelMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);

            const center = new THREE.Vector3();
            box.getCenter(center);
            enemyModelMesh.position.set(
                -center.x * scaleFactor,
                -box.min.y * scaleFactor - 0.25,
                -center.z * scaleFactor
            );

            // Rotate model to face forward
            enemyModelMesh.rotation.y = Math.PI;

            group.add(enemyModelMesh);
        } else {
            isProcedural = true;
            // High Quality Flat-Shaded PBR Materials (Glossy White Chitin + Hot Pink)
            const insectChassisMat = new THREE.MeshStandardMaterial({
                color: 0xffffff, // Polished white chitin shell
                metalness: 0.85,
                roughness: 0.15,
                flatShading: true
            });
            const metalChrome = new THREE.MeshStandardMaterial({
                color: 0x8a95a5,
                metalness: 0.95,
                roughness: 0.05,
                flatShading: true
            });
            const emissivePink = new THREE.MeshBasicMaterial({
                color: 0xff007a,
                toneMapped: false
            });

            // 1. Thorax / Body
            const bodyGeo = new THREE.CylinderGeometry(0.5, 0.75, 1.4, 6, 2);
            const bodyMesh = new THREE.Mesh(bodyGeo, insectChassisMat);
            bodyMesh.rotation.x = Math.PI / 2;
            bodyMesh.castShadow = true;
            bodyMesh.receiveShadow = true;
            group.add(bodyMesh);

            // Segmented Chest Armor Plates (high detail)
            for (let j = 0; j < 3; j++) {
                const plateGeo = new THREE.CylinderGeometry(0.58 - j * 0.05, 0.65 - j * 0.05, 0.35, 6);
                const plateMesh = new THREE.Mesh(plateGeo, insectChassisMat);
                plateMesh.rotation.x = Math.PI / 2;
                plateMesh.position.set(0, 0.12 - j * 0.08, -0.4 + j * 0.4);
                plateMesh.castShadow = true;
                group.add(plateMesh);
            }

            // 2. Abdomen (Segmented back)
            const abdomenGeo = new THREE.ConeGeometry(0.65, 1.2, 5);
            const abdomen = new THREE.Mesh(abdomenGeo, insectChassisMat);
            abdomen.position.set(0, 0, 1.1);
            abdomen.rotation.x = -Math.PI / 2;
            abdomen.castShadow = true;
            group.add(abdomen);

            // Segmented Abdomen plates (extra detail)
            for (let j = 0; j < 4; j++) {
                const segGeo = new THREE.CylinderGeometry(0.62 - j * 0.1, 0.58 - j * 0.1, 0.25, 5);
                const segMesh = new THREE.Mesh(segGeo, insectChassisMat);
                segMesh.rotation.x = Math.PI / 2;
                segMesh.position.set(0, 0.05, 0.6 + j * 0.22);
                segMesh.castShadow = true;
                group.add(segMesh);
            }

            // Creepy glowing pink venom core sac on abdomen
            const venomGeo = new THREE.SphereGeometry(0.35, 6, 6);
            venomSac = new THREE.Mesh(venomGeo, emissivePink);
            venomSac.position.set(0, 0.3, 1.0);
            group.add(venomSac);

            // 3. Head
            const headGeo = new THREE.SphereGeometry(0.4, 6, 6);
            const head = new THREE.Mesh(headGeo, insectChassisMat);
            head.position.set(0, 0.15, -0.9);
            head.castShadow = true;
            group.add(head);

            // Glowing pink compound eye clusters (6 eyes for detail!)
            const eyeGeo = new THREE.SphereGeometry(0.07, 6, 6);
            const eyePositions = [
                [-0.22, 0.28, -1.15],
                [0.22, 0.28, -1.15],
                [-0.32, 0.18, -1.05],
                [0.32, 0.18, -1.05],
                [-0.15, 0.38, -1.05],
                [0.15, 0.38, -1.05]
            ];
            eyePositions.forEach(pos => {
                const eye = new THREE.Mesh(eyeGeo, emissivePink);
                eye.position.set(pos[0], pos[1], pos[2]);
                group.add(eye);
            });

            // Twitching Antennae (Vibrating wires)
            antLGroup = new THREE.Group();
            antLGroup.position.set(-0.15, 0.3, -1.1);
            
            const antGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.6, 4);
            const antL = new THREE.Mesh(antGeo, metalChrome);
            antL.position.y = 0.25;
            antL.rotation.z = -Math.PI / 6;
            antL.rotation.x = -Math.PI / 8;
            antLGroup.add(antL);
            group.add(antLGroup);

            antRGroup = new THREE.Group();
            antRGroup.position.set(0.15, 0.3, -1.1);
            
            const antR = new THREE.Mesh(antGeo, metalChrome);
            antR.position.y = 0.25;
            antR.rotation.z = Math.PI / 6;
            antR.rotation.x = -Math.PI / 8;
            antRGroup.add(antR);
            group.add(antRGroup);

            // Snapping Pincers
            pincerLGroup = new THREE.Group();
            pincerLGroup.position.set(-0.15, 0.05, -1.2);
            
            const pincerGeo = new THREE.BoxGeometry(0.05, 0.08, 0.25);
            const pincerL = new THREE.Mesh(pincerGeo, metalChrome);
            pincerL.position.z = -0.1;
            pincerL.rotation.y = Math.PI / 6;
            pincerLGroup.add(pincerL);
            group.add(pincerLGroup);

            pincerRGroup = new THREE.Group();
            pincerRGroup.position.set(0.15, 0.05, -1.2);
            
            const pincerR = new THREE.Mesh(pincerGeo, metalChrome);
            pincerR.position.z = -0.1;
            pincerR.rotation.y = -Math.PI / 6;
            pincerRGroup.add(pincerR);
            group.add(pincerRGroup);

            // Translucent Glowing Cyber Wings (High Graphics detail)
            const wingMat = new THREE.MeshStandardMaterial({
                color: 0xff007a,
                emissive: 0xff007a,
                roughness: 0.1,
                metalness: 0.9,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            leftWingGroup = new THREE.Group();
            leftWingGroup.position.set(-0.4, 0.5, -0.2);
            rightWingGroup = new THREE.Group();
            rightWingGroup.position.set(0.4, 0.5, -0.2);

            const wingShapeGeo = new THREE.ConeGeometry(0.25, 2.2, 4);
            wingShapeGeo.scale(1, 1, 0.05); // flatten into blade
            
            const wingL1 = new THREE.Mesh(wingShapeGeo, wingMat);
            wingL1.rotation.set(Math.PI / 4, 0, Math.PI / 3);
            wingL1.position.set(-0.9, 0, 0);
            leftWingGroup.add(wingL1);

            const wingL2 = new THREE.Mesh(wingShapeGeo, wingMat);
            wingL2.rotation.set(Math.PI / 6, 0, Math.PI / 2.2);
            wingL2.position.set(-0.8, -0.2, 0.2);
            leftWingGroup.add(wingL2);

            const wingR1 = new THREE.Mesh(wingShapeGeo, wingMat);
            wingR1.rotation.set(Math.PI / 4, 0, -Math.PI / 3);
            wingR1.position.set(0.9, 0, 0);
            rightWingGroup.add(wingR1);

            const wingR2 = new THREE.Mesh(wingShapeGeo, wingMat);
            wingR2.rotation.set(Math.PI / 6, 0, -Math.PI / 2.2);
            wingR2.position.set(0.8, -0.2, 0.2);
            rightWingGroup.add(wingR2);

            group.add(leftWingGroup);
            group.add(rightWingGroup);

            // 4. Six jointed legs (Segmented tibia, femur, tarsus claw)
            const legOffsets = [
                { x: -0.65, z: -0.4, phase: 0 },
                { x: -0.75, z: 0.1, phase: Math.PI / 3 },
                { x: -0.65, z: 0.6, phase: Math.PI * 2 / 3 },
                { x: 0.65, z: -0.4, phase: Math.PI },
                { x: 0.75, z: 0.1, phase: Math.PI + Math.PI / 3 },
                { x: 0.65, z: 0.6, phase: Math.PI + Math.PI * 2 / 3 }
            ];

            legOffsets.forEach((offset) => {
                const legRoot = new THREE.Group();
                legRoot.position.set(offset.x, -0.15, offset.z);
                
                const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.55, 6), metalChrome);
                upperLeg.position.y = -0.15;
                upperLeg.rotation.z = offset.x < 0 ? -Math.PI / 3 : Math.PI / 3;
                upperLeg.castShadow = true;
                legRoot.add(upperLeg);
                
                const midLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.55, 5), metalChrome);
                midLeg.position.set(offset.x < 0 ? -0.22 : 0.22, -0.42, 0);
                midLeg.rotation.z = offset.x < 0 ? Math.PI / 6 : -Math.PI / 6;
                midLeg.castShadow = true;
                legRoot.add(midLeg);

                // Claw tip
                const clawTip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.25, 4), insectChassisMat);
                clawTip.position.set(offset.x < 0 ? -0.32 : 0.32, -0.72, 0.08);
                clawTip.rotation.z = offset.x < 0 ? Math.PI / 4 : -Math.PI / 4;
                clawTip.castShadow = true;
                legRoot.add(clawTip);

                group.add(legRoot);
                legs.push({
                    mesh: legRoot,
                    baseX: offset.x,
                    baseZ: offset.z,
                    phase: offset.phase,
                    isLeft: offset.x < 0
                });
            });
        }

        // 5. Billboard style Health Bar above head
        const healthBarGroup = new THREE.Group();
        healthBarGroup.position.set(0, 1.6, 0);
        group.add(healthBarGroup);

        const hbBg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.02), new THREE.MeshBasicMaterial({ color: 0x990000 }));
        healthBarGroup.add(hbBg);

        const hbFg = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.09, 0.03), new THREE.MeshBasicMaterial({ color: 0xff007a }));
        hbFg.position.z = 0.01;
        healthBarGroup.add(hbFg);

        // Floating name tag
        const sprite = createTextSprite(labelText, '#ff007a');
        sprite.position.set(0, 2.0, 0);
        group.add(sprite);

        sceneRef.add(group);

        activeEnemies.push({
            id: typeId,
            type: 'insect',
            mesh: group,
            startX: finalX,
            startY: spawnY + 1.1,
            startZ: finalZ,
            dirX: dirX,
            dirZ: dirZ,
            patrolRadius: 6,
            speed: 1.6,
            patrolAngle: Math.random() * Math.PI * 2,
            health: hpVal,
            maxHealth: hpVal,
            radius: 2.1, // Larger hit radius for 1.4x scale
            legs: legs,
            pincerL: pincerLGroup,
            pincerR: pincerRGroup,
            antL: antLGroup,
            antR: antRGroup,
            venomSac: venomSac,
            leftWing: leftWingGroup,
            rightWing: rightWingGroup,
            hbFg: hbFg,
            hbGroup: healthBarGroup,
            sprite: sprite,
            lastShotTime: 0,
            shootInterval: 2500 + Math.random() * 800, // Slower cooldown! (2.5s - 3.3s)
            isProcedural: isProcedural,
            lastSamplePos: new THREE.Vector3(finalX, spawnY + 1.1, finalZ),
            lastSamplePosGroundY: spawnY
        });
    }

    function checkBulletCollisions(bulletPos, hitRadius) {
        for (let i = 0; i < activeEnemies.length; i++) {
            const enemy = activeEnemies[i];
            const dist = enemy.mesh.position.distanceTo(bulletPos);
            
            if (dist < (enemy.radius + hitRadius)) {
                return enemy;
            }
        }
        return null;
    }

    /**
     * Spawn either an Orb (60% chance) or a Health Kit (40% chance)
     */
    /**
     * Spawn key drop guaranteed, and optionally an Orb or a Health Kit
     */
    function spawnDrop(pos) {
        // 1. Guaranteed Key Drop — golden key on the ground with glow ring
        const keyGroundY = getGroundHeight(pos.x, pos.z);
        
        const keyGroup = new THREE.Group();
        keyGroup.position.copy(pos);
        keyGroup.position.y = keyGroundY + 0.35;
        
        const handle = new THREE.Mesh(keyTorusGeo, goldMaterial);
        handle.position.y = 0.35;
        keyGroup.add(handle);

        const shaft = new THREE.Mesh(keyShaftGeo, goldMaterial);
        shaft.position.y = 0;
        keyGroup.add(shaft);

        const teeth = new THREE.Mesh(keyTeethGeo, goldMaterial);
        teeth.position.set(0.08, -0.18, 0);
        keyGroup.add(teeth);

        // Glowing halo ring around key
        const keyRingGeo = new THREE.TorusGeometry(0.55, 0.03, 8, 32);
        const keyRingMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.5 });
        const keyRing = new THREE.Mesh(keyRingGeo, keyRingMat);
        keyRing.rotation.x = Math.PI / 2;
        keyRing.position.y = 0.15;
        keyGroup.add(keyRing);
        
        sceneRef.add(keyGroup);
        
        const light = new THREE.PointLight(0xffd700, 3.0, 6);
        light.position.copy(keyGroup.position);
        sceneRef.add(light);
        
        activeDrops.push({
            type: 'key',
            mesh: keyGroup,
            light: light,
            baseY: keyGroundY + 0.35,
            time: 0
        });

        // 2. Extra random drop (50% chance of Orb or Health Kit)
        if (Math.random() < 0.5) {
            const rand = Math.random();
            const extraPos = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5));
            const extraGroundY = getGroundHeight(extraPos.x, extraPos.z);
            extraPos.y = extraGroundY + 0.6;
            
            if (rand < 0.5) {
                // Drop Red Enemy Orb with spinning ring + inner core
                const orbGroup = new THREE.Group();
                orbGroup.position.copy(extraPos);

                const outerMesh = new THREE.Mesh(orbGeometry, orbMaterial);
                orbGroup.add(outerMesh);

                // Inner glowing core
                const coreGeo = new THREE.SphereGeometry(0.2, 16, 16);
                const coreMat = new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.8 });
                const core = new THREE.Mesh(coreGeo, coreMat);
                orbGroup.add(core);

                // Spinning ring around orb
                const ringGeo = new THREE.TorusGeometry(0.6, 0.025, 8, 32);
                const ringMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.6 });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.rotation.x = Math.PI / 2;
                orbGroup.add(ring);

                sceneRef.add(orbGroup);

                const extraLight = new THREE.PointLight(0xff0000, 2.5, 5);
                extraLight.position.copy(orbGroup.position);
                sceneRef.add(extraLight);

                activeDrops.push({
                    type: 'orb',
                    mesh: orbGroup,
                    light: extraLight,
                    baseY: extraPos.y,
                    time: 0
                });
            } else {
                // Drop Health Kit
                const hpGroup = new THREE.Group();
                hpGroup.position.copy(extraPos);

                const box = new THREE.Mesh(hpKitGeometry, hpKitMaterial);
                hpGroup.add(box);

                const cross = new THREE.Mesh(hpCrossGeometry, hpCrossMaterial);
                cross.position.z = 0.16;
                hpGroup.add(cross);

                const crossBack = new THREE.Mesh(hpCrossGeometry, hpCrossMaterial);
                crossBack.position.z = -0.16;
                hpGroup.add(crossBack);

                sceneRef.add(hpGroup);

                const extraLight = new THREE.PointLight(0x00ff00, 1.8, 4);
                extraLight.position.copy(hpGroup.position);
                sceneRef.add(extraLight);

                activeDrops.push({
                    type: 'health',
                    mesh: hpGroup,
                    light: extraLight,
                    baseY: extraPos.y,
                    time: 0
                });
            }
        }
    }

    function enemyShootFireball(enemy, playerPos) {
        // Play scary screech sound!
        Sound.playScreech();

        const fireballMesh = new THREE.Mesh(fireballGeo, fireballMat);
        
        const headOffset = new THREE.Vector3(0, 0.2, -1.6);
        headOffset.applyQuaternion(enemy.mesh.quaternion);
        
        const spawnPos = enemy.mesh.position.clone().add(headOffset);
        fireballMesh.position.copy(spawnPos);
        
        sceneRef.add(fireballMesh);

        // Pink light
        const light = new THREE.PointLight(0xff007a, 1.8, 5);
        light.castShadow = false; // Disable point shadow for lag reduction!
        light.position.copy(spawnPos);
        sceneRef.add(light);

        const dir = new THREE.Vector3().subVectors(playerPos, spawnPos).normalize();
        
        activeFireballs.push({
            mesh: fireballMesh,
            light: light,
            velocity: dir.multiplyScalar(fireballSpeed)
        });
    }

    function damageEnemy(enemy, amount) {
        enemy.health -= amount;
        if (enemy.health < 0) enemy.health = 0;

        const pct = enemy.health / enemy.maxHealth;
        enemy.hbFg.scale.x = pct;
        enemy.hbFg.position.x = -1.0 * (1 - pct) / 2;

        if (enemy.health <= 0) {
            enemy.dead = true;
        }
    }

    function update(deltaTime, playerPos, camera) {
        const timeNow = performance.now() * 0.001;
        frameCount++;
        
        // 1. Update Insects (Crawling, vibrating antennae, pulsing core)
        const lvl = LEVELS[currentLevelIndex - 1];
        for (let i = activeEnemies.length - 1; i >= 0; i--) {
            const enemy = activeEnemies[i];
            const currentPos = enemy.mesh.position;
            
            if (enemy.dead) {
                Sound.playExplosion();
                Particles.spawnSparks(enemy.mesh.position, 0xff007a, 22);
                spawnDrop(enemy.mesh.position);
                
                sceneRef.remove(enemy.mesh);
                activeEnemies.splice(i, 1);
                continue;
            }

            if (camera) {
                enemy.hbGroup.quaternion.copy(camera.quaternion);
            }

            // Pulsing Venom core sac glow
            if (enemy.venomSac && enemy.venomSac.material) {
                const pulseIntensity = 0.5 + Math.sin(timeNow * 8) * 0.5;
                enemy.venomSac.material.color.setHex(0xff007a).multiplyScalar(0.5 + 0.5 * pulseIntensity);
            }

            // Twitching antennae vibrating rapidly
            if (enemy.antL && enemy.antR) {
                const antTwitch = Math.sin(timeNow * 40) * 0.12;
                enemy.antL.rotation.y = antTwitch;
                enemy.antR.rotation.y = -antTwitch;
            }

            // Wing flutter animations
            if (enemy.leftWing && enemy.rightWing) {
                const wingFlutter = Math.sin(timeNow * 75) * 0.15;
                enemy.leftWing.rotation.z = wingFlutter;
                enemy.rightWing.rotation.z = -wingFlutter;
            }

            // Target check & Movement decision
            const distToPlayer = currentPos.distanceTo(playerPos);
            const isChasing = distToPlayer < 15.0;

            if (isChasing) {
                const lookAngle = Math.atan2(playerPos.x - currentPos.x, playerPos.z - currentPos.z);
                enemy.mesh.rotation.y = lookAngle;

                // Move towards the player only if outside shooting range (7 units)
                if (distToPlayer > 7.0) {
                    const speedMag = Math.abs(enemy.speed) * 0.7;
                    const stepX = Math.sin(lookAngle) * speedMag * deltaTime;
                    const stepZ = Math.cos(lookAngle) * speedMag * deltaTime;
                    
                    const nextX = enemy.mesh.position.x + stepX;
                    const nextZ = enemy.mesh.position.z + stepZ;
                    
                    if (!checkGridCollision(nextX, nextZ)) {
                        enemy.mesh.position.x = nextX;
                        enemy.mesh.position.z = nextZ;
                    }

                    // Hard clamp for chasing in open worlds
                    if (lvl.theme === "arabic_city" || lvl.openWorld) {
                        const limit = 79.5;
                        enemy.mesh.position.x = Math.max(-limit, Math.min(limit, enemy.mesh.position.x));
                        enemy.mesh.position.z = Math.max(-limit, Math.min(limit, enemy.mesh.position.z));
                    }
                }

                const nowMs = performance.now();
                if (nowMs - enemy.lastShotTime > enemy.shootInterval) {
                    enemy.lastShotTime = nowMs;
                    enemyShootFireball(enemy, playerPos);
                }
            } else {
                // Corridor-aligned patrol pathing
                const movementAmt = enemy.speed * deltaTime;
                const nextX = enemy.mesh.position.x + enemy.dirX * movementAmt;
                const nextZ = enemy.mesh.position.z + enemy.dirZ * movementAmt;
                
                // Check collision with a margin
                const margin = 1.3;
                const lookAheadX = nextX + enemy.dirX * margin;
                const lookAheadZ = nextZ + enemy.dirZ * margin;
                
                if (checkGridCollision(lookAheadX, lookAheadZ)) {
                    if (lvl.theme === "arabic_city" || lvl.openWorld) {
                        // In open city environment, turn in a new random direction to navigate streets perfectly
                        const angle = Math.random() * Math.PI * 2;
                        enemy.dirX = Math.sin(angle);
                        enemy.dirZ = Math.cos(angle);
                        enemy.speed = Math.abs(enemy.speed);
                    } else {
                        // Reverse direction in tight grid mazes
                        enemy.dirX = -enemy.dirX;
                        enemy.dirZ = -enemy.dirZ;
                        enemy.speed = -enemy.speed;
                    }
                } else {
                    enemy.mesh.position.x = nextX;
                    enemy.mesh.position.z = nextZ;
                }

                // Hard clamp for open worlds to prevent ever escaping map
                if (lvl.theme === "arabic_city" || lvl.openWorld) {
                    const limit = 79.5;
                    enemy.mesh.position.x = Math.max(-limit, Math.min(limit, enemy.mesh.position.x));
                    enemy.mesh.position.z = Math.max(-limit, Math.min(limit, enemy.mesh.position.z));
                }

                // Default rotation facing the movement direction
                const angle = Math.atan2(enemy.dirX, enemy.dirZ);
                enemy.mesh.rotation.y = angle;
            }

            // Ground-snap with gravity: raycast throttled for performance
            let targetY = enemy.startY;
            let modelLoaded = false;
            if (lvl && lvl.modelPath) {
                let groundY = enemy.lastSamplePosGroundY !== undefined ? enemy.lastSamplePosGroundY : (enemy.startY - 1.1);
                
                if (enemy.lastSamplePos === undefined) {
                    enemy.lastSamplePos = new THREE.Vector3().copy(enemy.mesh.position);
                    groundY = getGroundHeight(enemy.mesh.position.x, enemy.mesh.position.z);
                    enemy.lastSamplePosGroundY = groundY;
                } else {
                    const distMoved = enemy.mesh.position.distanceTo(enemy.lastSamplePos);
                    if (distMoved > 0.25) {
                        groundY = getGroundHeight(enemy.mesh.position.x, enemy.mesh.position.z);
                        enemy.lastSamplePos.copy(enemy.mesh.position);
                        enemy.lastSamplePosGroundY = groundY;
                    }
                }
                targetY = groundY + 0.3;
                if (cachedEnvironmentModel) {
                    modelLoaded = true;
                }
            }
            // Smooth lerp to target ground height (prevents teleporting)
            // If the model was just loaded (or it is procedural), snap instantly to target height
            if (enemy.currentGroundY === undefined || (modelLoaded && !enemy.hadModel)) {
                enemy.currentGroundY = targetY;
                enemy.hadModel = modelLoaded;
            }
            enemy.currentGroundY += (targetY - enemy.currentGroundY) * Math.min(1.0, deltaTime * 10.0);
            enemy.mesh.position.y = enemy.currentGroundY;

            // Crawl animations
            if (enemy.legs && enemy.legs.length > 0) {
                enemy.legs.forEach(leg => {
                    const legOsc = Math.sin(timeNow * 8 + leg.phase) * 0.35;
                    if (leg.isLeft) {
                        leg.mesh.rotation.y = legOsc;
                        leg.mesh.rotation.z = -Math.PI / 6 + legOsc * 0.15;
                    } else {
                        leg.mesh.rotation.y = -legOsc;
                        leg.mesh.rotation.z = Math.PI / 6 - legOsc * 0.15;
                    }
                });
            }

            if (enemy.pincerL && enemy.pincerR) {
                enemy.pincerL.rotation.y = Math.PI / 6 + Math.sin(timeNow * 10) * 0.15;
                enemy.pincerR.rotation.y = -Math.PI / 6 - Math.sin(timeNow * 10) * 0.15;
            }
        }

        // 2. Update active Fireballs
        for (let i = activeFireballs.length - 1; i >= 0; i--) {
            const f = activeFireballs[i];
            
            f.mesh.position.addScaledVector(f.velocity, deltaTime);
            f.light.position.copy(f.mesh.position);
            
            let hit = false;
            
            const distToPlayer = f.mesh.position.distanceTo(playerPos);
            if (distToPlayer < 1.3) {
                hit = true;
                Player.damage(fireballDamage); // Only deal 6 damage!
                Particles.spawnSparks(f.mesh.position, 0xff007a, 18);
            }

            if (!hit) {
                const px = Math.abs(f.mesh.position.x);
                const py = f.mesh.position.y;
                const pz = Math.abs(f.mesh.position.z);
                const boundLimit = (lvl && lvl.openWorld) ? 100 : 35;
                if (px > boundLimit || py < -1 || py > 21 || pz > boundLimit) {
                    hit = true;
                    Particles.spawnSparks(f.mesh.position, 0xff3300, 8);
                }
            }

            if (hit) {
                sceneRef.remove(f.mesh);
                sceneRef.remove(f.light);
                activeFireballs.splice(i, 1);
            }
        }

        // 3. Update Collectible Drops (enhanced bobbing, pulsing, spinning)
        for (let i = 0; i < activeDrops.length; i++) {
            const drop = activeDrops[i];
            drop.time += deltaTime;
            // Gentle floating bob
            drop.mesh.position.y = drop.baseY + Math.sin(drop.time * 2.5) * 0.15;
            // Smooth rotation
            drop.mesh.rotation.y += deltaTime * 2.5;
            if (drop.type === 'key') {
                // Keys tilt slightly while spinning
                drop.mesh.rotation.z = Math.sin(drop.time * 2) * 0.15;
            } else {
                drop.mesh.rotation.x += deltaTime * 1.2;
            }
            // Pulsing light intensity for all drops
            if (drop.light) {
                drop.light.intensity = 2.0 + Math.sin(drop.time * 4) * 1.0;
            }
            // Spin the inner ring for orb groups
            if (drop.type === 'orb' && drop.mesh.children) {
                drop.mesh.children.forEach(child => {
                    if (child.geometry && child.geometry.type === 'TorusGeometry') {
                        child.rotation.z += deltaTime * 3.0;
                        child.rotation.x = Math.PI / 2 + Math.sin(drop.time * 2) * 0.3;
                    }
                });
            }
        }

        // 4. Collection check
        for (let i = activeDrops.length - 1; i >= 0; i--) {
            const drop = activeDrops[i];
            if (drop.mesh.position.distanceTo(playerPos) < 1.8) {
                if (drop.type === 'orb') {
                    Player.addOrb();
                } else if (drop.type === 'health') {
                    Player.heal(30); // Heal 30 HP!
                } else if (drop.type === 'key') {
                    Player.addKey();
                }
                
                sceneRef.remove(drop.mesh);
                sceneRef.remove(drop.light);
                activeDrops.splice(i, 1);
            }
        }
    }
    
    function clearAll() {
        activeEnemies.forEach(e => {
            sceneRef.remove(e.mesh);
        });
        activeEnemies.length = 0;

        activeDrops.forEach(d => {
            sceneRef.remove(d.mesh);
            sceneRef.remove(d.light);
        });
        activeDrops.length = 0;

        activeFireballs.forEach(f => {
            sceneRef.remove(f.mesh);
            sceneRef.remove(f.light);
        });
        activeFireballs.length = 0;
    }

    return {
        init,
        spawnInsect,
        checkBulletCollisions,
        update,
        clearAll,
        damageEnemy: (enemy, amt) => damageEnemy(enemy, amt),
        getActiveEnemies: () => activeEnemies
    };
})();

export default Enemies;
