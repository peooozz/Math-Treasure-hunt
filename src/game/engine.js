/**
 * Central game engine orchestrator in ES6
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import TWEEN from '@tweenjs/tween.js';
import Physics from './physics';
import Particles from './particles';
import Player from './player';
import Enemies from './enemies';
import Vaults from './vaults';
import { Sound } from './sound';
import { LEVELS } from './levels';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function getComponentBoundingBoxes(geometry) {
    if (!geometry) return [];
    const posAttr = geometry.getAttribute('position');
    if (!posAttr) return [];
    
    const indexAttr = geometry.index;
    const positions = posAttr.array;
    const numVertices = posAttr.count;
    const numFaces = indexAttr ? indexAttr.count / 3 : numVertices / 3;
    
    const parent = new Int32Array(numFaces);
    for (let i = 0; i < numFaces; i++) parent[i] = i;
    
    function find(i) {
        let root = i;
        while (parent[root] !== root) root = parent[root];
        let curr = i;
        while (curr !== root) {
            let nxt = parent[curr];
            parent[curr] = root;
            curr = nxt;
        }
        return root;
    }
    
    function union(i, j) {
        const rI = find(i);
        const rJ = find(j);
        if (rI !== rJ) parent[rI] = rJ;
    }
    
    const keyToFaces = new Map();
    for (let f = 0; f < numFaces; f++) {
        let v0 = indexAttr ? indexAttr.array[f * 3] : f * 3;
        let v1 = indexAttr ? indexAttr.array[f * 3 + 1] : f * 3 + 1;
        let v2 = indexAttr ? indexAttr.array[f * 3 + 2] : f * 3 + 2;
        
        const vertices = [v0, v1, v2];
        for (const v of vertices) {
            const px = positions[v * 3];
            const py = positions[v * 3 + 1];
            const pz = positions[v * 3 + 2];
            // Spatial merge rounding to 1 decimal place (10cm tolerance) to merge shared coordinates
            const key = `${Math.round(px * 10)},${Math.round(py * 10)},${Math.round(pz * 10)}`;
            let list = keyToFaces.get(key);
            if (!list) {
                list = [];
                keyToFaces.set(key, list);
            }
            list.push(f);
        }
    }
    
    for (const [key, faces] of keyToFaces.entries()) {
        if (faces.length > 1) {
            const first = faces[0];
            for (let i = 1; i < faces.length; i++) {
                union(first, faces[i]);
            }
        }
    }
    
    const componentFaces = new Map();
    for (let f = 0; f < numFaces; f++) {
        const r = find(f);
        let list = componentFaces.get(r);
        if (!list) {
            list = [];
            componentFaces.set(r, list);
        }
        list.push(f);
    }
    
    const boxes = [];
    for (const [root, faces] of componentFaces.entries()) {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (const f of faces) {
            let v0 = indexAttr ? indexAttr.array[f * 3] : f * 3;
            let v1 = indexAttr ? indexAttr.array[f * 3 + 1] : f * 3 + 1;
            let v2 = indexAttr ? indexAttr.array[f * 3 + 2] : f * 3 + 2;
            
            const vertices = [v0, v1, v2];
            for (const v of vertices) {
                const px = positions[v * 3];
                const py = positions[v * 3 + 1];
                const pz = positions[v * 3 + 2];
                
                if (px < minX) minX = px;
                if (py < minY) minY = py;
                if (pz < minZ) minZ = pz;
                if (px > maxX) maxX = px;
                if (py > maxY) maxY = py;
                if (pz > maxZ) maxZ = pz;
            }
        }
        boxes.push({
            min: new THREE.Vector3(minX, minY, minZ),
            max: new THREE.Vector3(maxX, maxY, maxZ)
        });
    }
    return boxes;
}

const GameEngine = (() => {
    let currentLevelIndex = 1;
    let mazeMeshes = [];
    let mazePhysicsBodies = [];
    let proceduralMeshes = [];
    let proceduralPhysicsBodies = [];
    let portalMesh = null;
    let portalLight = null;
    let portalActive = false;
    let portalCell = null;
    let navArrowMesh = null;
    let buildingFootprints = [];
    let handleVisibilityRef = null;
    
    const modelCache = new Map();
    const loadingManager = new THREE.LoadingManager();
    
    let uiCallbacks = {
        onHPChange: () => {},
        onScoreChange: () => {},
        onOrbsChange: () => {},
        onGravityChange: () => {},
        onNotification: () => {},
        onOpenPuzzle: () => {},
        onGameOver: () => {},
        onVictory: () => {},
        onNextLevel: () => {}
    };

    loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
        if (uiCallbacks && uiCallbacks.onLoadProgress) {
            uiCallbacks.onLoadProgress(0);
        }
    };
    
    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        const percent = Math.round((itemsLoaded / itemsTotal) * 100);
        if (uiCallbacks && uiCallbacks.onLoadProgress) {
            uiCallbacks.onLoadProgress(percent);
        }
    };
    
    loadingManager.onLoad = () => {
        if (uiCallbacks && uiCallbacks.onLoadProgress) {
            uiCallbacks.onLoadProgress(100);
        }
    };
    
    loadingManager.onError = (url) => {
        console.warn(`Error loading asset: ${url}`);
    };

    let scene;
    let camera;
    let renderer;
    let clock;
    let frameId;
    let isRunning = false;

    function start(canvas, callbacks, levelIndex = 1) {
        if (isRunning) return;
        isRunning = true;
        uiCallbacks = { ...uiCallbacks, ...callbacks };

        // Preload hands GLB model so it's cached and ready
        const handsPath = "/fps_arms_throwing.glb";
        if (!modelCache.has(handsPath)) {
            const loader = new GLTFLoader(loadingManager);
            loader.load(handsPath, (gltf) => {
                modelCache.set(handsPath, gltf);
            }, undefined, (err) => {
                console.error("Failed to preload hands GLB:", err);
            });
        }
        currentLevelIndex = levelIndex;

        const lvl = LEVELS[currentLevelIndex - 1];
        const gridRows = lvl.grid.length;
        const gridCols = lvl.grid[0].length;
        const halfW = (gridCols * 4) / 2;
        const halfD = (gridRows * 4) / 2;

        // 1. Initialize Scene, Camera
        scene = new THREE.Scene();
        scene.background = new THREE.Color(lvl.fogColor || 0xf8fafc);
        scene.fog = new THREE.FogExp2(lvl.fogColor || 0xf8fafc, lvl.fogDensity || 0.015);
        
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        scene.add(camera);

        // Create 3D compass navigation arrow
        const arrowGeo = new THREE.ConeGeometry(0.04, 0.15, 6);
        arrowGeo.rotateX(-Math.PI / 2);
        const arrowMat = new THREE.MeshBasicMaterial({
            color: 0xff007a,
            toneMapped: false,
            transparent: true,
            opacity: 0.85,
            depthTest: false
        });
        navArrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
        navArrowMesh.position.set(0.0, -0.4, -0.8);
        camera.add(navArrowMesh);

        // 2. WebGL Renderer with Shadows Enabled
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        
        // Soft Shadow Optimization (Lag Fix)
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Sound activation hook
        const soundInit = () => {
            Sound.init();
            document.body.removeEventListener('click', soundInit);
        };
        document.body.addEventListener('click', soundInit);

        // 3. Initialize Sub-modules
        Physics.init();
        Particles.init(scene);
        
        const spawnX = -halfW + lvl.spawn.x * 4 + 2;
        const spawnZ = -halfD + lvl.spawn.z * 4 + 2;
        
        Player.init(camera, new THREE.Vector3(spawnX, 3, spawnZ), uiCallbacks, currentLevelIndex);
        Enemies.init(scene, currentLevelIndex);
        Vaults.init(scene, lvl.vaults, currentLevelIndex);

        // 4. Construct Room structures with optimized shadows
        buildStationEnvironment();

        window.addEventListener('resize', onWindowResize);

        // Handle tab visibility changes to prevent freezing after tab switch
        handleVisibilityRef = () => {
            if (!document.hidden && isRunning) {
                // Reset clock delta to avoid massive time jump when tab becomes visible
                clock.getDelta();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityRef);

        clock = new THREE.Clock();

        // 5. Start main animation loop
        animate();
    }

    function buildStationEnvironment() {
        const lvl = LEVELS[currentLevelIndex - 1];
        const gridRows = lvl.grid.length;
        const gridCols = lvl.grid[0].length;
        const w = gridCols * 4;
        const d = gridRows * 4;
        const h = 20;
        const halfW = w / 2;
        const halfD = d / 2;

        // Reset scene fog/background
        scene.background = new THREE.Color(lvl.fogColor || 0xf8fafc);
        scene.fog = new THREE.FogExp2(lvl.fogColor || 0xf8fafc, lvl.fogDensity || 0.015);

        // Ambient illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
        scene.add(ambientLight);
        
        // Single optimized shadow-casting DirectionalLight
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.65);
        directionalLight.position.set(10, 30, 15);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 80;
        
        let lightBoundW = halfW;
        let lightBoundD = halfD;
        if (lvl.theme === "arabic_city" || lvl.openWorld) {
            lightBoundW = 40;
            lightBoundD = 40;
        }
        directionalLight.shadow.camera.left = -lightBoundW - 5;
        directionalLight.shadow.camera.right = lightBoundW + 5;
        directionalLight.shadow.camera.top = lightBoundD + 5;
        directionalLight.shadow.camera.bottom = -lightBoundD - 5;
        directionalLight.shadow.bias = -0.001;
        scene.add(directionalLight);

        // Neon Corridor Glows
        const neonLightLeft = new THREE.PointLight(lvl.lightColorLeft || 0xff007a, 3.0, 30);
        neonLightLeft.position.set(-halfW + 4, 8, -halfD + 4);
        neonLightLeft.castShadow = false;
        scene.add(neonLightLeft);

        const neonLightRight = new THREE.PointLight(lvl.lightColorRight || 0xbd00ff, 2.0, 30);
        neonLightRight.position.set(halfW - 4, 8, halfD - 4);
        neonLightRight.castShadow = false;
        scene.add(neonLightRight);

        // PBR High Quality Materials configured by theme
        let floorMatConfig = {
            color: lvl.floorColor || 0xf8fafc,
            roughness: 0.1,
            metalness: 0.2
        };
        let wallMatConfig = {
            color: lvl.wallColor || 0xf1f5f9,
            roughness: 0.4,
            metalness: 0.1
        };

        if (lvl.theme === "frost_core") {
            floorMatConfig.roughness = 0.05;
            floorMatConfig.metalness = 0.5;
            wallMatConfig.transparent = true;
            wallMatConfig.opacity = 0.8;
            wallMatConfig.roughness = 0.1;
        } else if (lvl.theme === "cyberpunk_city") {
            floorMatConfig.color = 0x09090b; // Deep black
            floorMatConfig.roughness = 0.15;
            floorMatConfig.metalness = 0.9;
            wallMatConfig.color = 0x1e293b;  // Dark slate
            wallMatConfig.roughness = 0.25;
            wallMatConfig.metalness = 0.8;
        } else if (lvl.theme === "emerald_greenhouse") {
            floorMatConfig.color = 0x14532d;
            floorMatConfig.roughness = 0.8;
            floorMatConfig.metalness = 0.0;
            wallMatConfig.color = 0x064e3b;
            wallMatConfig.roughness = 0.9;
        } else if (lvl.theme === "magma_core") {
            floorMatConfig.color = 0xff4500;
            floorMatConfig.emissive = new THREE.Color(0xb91c1c);
            floorMatConfig.roughness = 0.3;
            wallMatConfig.color = 0x18181b;
            wallMatConfig.roughness = 0.85;
            wallMatConfig.metalness = 0.4;
        } else if (lvl.theme === "obsidian_abyss") {
            floorMatConfig.color = 0x09090b;
            floorMatConfig.roughness = 0.05;
            floorMatConfig.metalness = 0.95;
            wallMatConfig.color = 0x18181b;
            wallMatConfig.roughness = 0.1;
            wallMatConfig.metalness = 0.9;
        } else if (lvl.theme === "hydro_station") {
            floorMatConfig.color = 0x0f172a;
            floorMatConfig.metalness = 0.8;
            floorMatConfig.roughness = 0.2;
            wallMatConfig.color = 0x1e3a8a;
            wallMatConfig.metalness = 0.8;
            wallMatConfig.roughness = 0.3;
        } else if (lvl.theme === "radiant_sanctum") {
            floorMatConfig.color = 0xffffff;
            floorMatConfig.roughness = 0.05;
            wallMatConfig.color = 0xf8fafc;
            wallMatConfig.roughness = 0.05;
            wallMatConfig.metalness = 0.1;
        } else if (lvl.theme === "arabic_city") {
            floorMatConfig.color = 0xeab308;
            floorMatConfig.roughness = 0.95;
            floorMatConfig.metalness = 0.0;
            wallMatConfig.color = 0xfef08a;
            wallMatConfig.roughness = 0.9;
        }

        const floorMat = new THREE.MeshStandardMaterial(floorMatConfig);
        const wallMat = new THREE.MeshStandardMaterial(wallMatConfig);

        // 1. FLOOR (y = 0)
        let floorW = w;
        let floorD = d;
        if (lvl.theme === "arabic_city" || lvl.openWorld) {
            floorW = 200;
            floorD = 200;
        }
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorW, floorD), floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = (lvl.theme === "arabic_city" || lvl.openWorld) ? -2.0 : 0;
        floor.receiveShadow = true;
        scene.add(floor);
        mazeMeshes.push(floor);
        
        // Physical plane
        const floorRot = new CANNON.Quaternion();
        floorRot.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        const floorBody = Physics.createGround(0, 0, 0, floorRot);
        floorBody.collisionFilterGroup = 1;
        mazePhysicsBodies.push(floorBody);

        // Floor coordinate grid lines
        if (!lvl.openWorld) {
            const floorGrid = new THREE.GridHelper(w, gridCols, lvl.lightColorLeft || 0xff007a, 0xe2e8f0);
            floorGrid.position.y = 0.02;
            scene.add(floorGrid);
            mazeMeshes.push(floorGrid);
        }

        // Build procedural structure as initial layout (to support instant loading/hybrid fallback)
        const showFallbackRoom = !lvl.openWorld;
        const boundW = (lvl.theme === "arabic_city" || lvl.openWorld) ? 40.0 : halfW;
        const boundD = (lvl.theme === "arabic_city" || lvl.openWorld) ? 40.0 : halfD;

        if (showFallbackRoom) {
            // 2. CEILING (y = 20)
            const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat);
            ceiling.rotation.x = Math.PI / 2;
            ceiling.position.y = h;
            ceiling.receiveShadow = true;
            scene.add(ceiling);
            proceduralMeshes.push(ceiling);
            mazeMeshes.push(ceiling);

            // Physical ceiling plane
            const ceilRot = new CANNON.Quaternion();
            ceilRot.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
            const ceilBody = Physics.createGround(0, h, 0, ceilRot);
            ceilBody.collisionFilterGroup = 1;
            proceduralPhysicsBodies.push(ceilBody);
            mazePhysicsBodies.push(ceilBody);

            // Ceiling grid helper
            const ceilGrid = new THREE.GridHelper(w, gridCols, lvl.lightColorRight || 0xbd00ff, 0xe2e8f0);
            ceilGrid.position.y = h - 0.02;
            scene.add(ceilGrid);
            proceduralMeshes.push(ceilGrid);
            mazeMeshes.push(ceilGrid);

            // 3. VISIBLE WALL MESHES
            // Back Wall
            const backWall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
            backWall.position.set(0, h/2, -halfD);
            backWall.receiveShadow = true;
            scene.add(backWall);
            proceduralMeshes.push(backWall);
            mazeMeshes.push(backWall);

            // Front Wall
            const frontWall = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
            frontWall.position.set(0, h/2, halfD);
            frontWall.rotation.y = Math.PI;
            frontWall.receiveShadow = true;
            scene.add(frontWall);
            proceduralMeshes.push(frontWall);
            mazeMeshes.push(frontWall);

            // Left Wall
            const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMat);
            leftWall.position.set(-halfW, h/2, 0);
            leftWall.rotation.y = Math.PI / 2;
            leftWall.receiveShadow = true;
            scene.add(leftWall);
            proceduralMeshes.push(leftWall);
            mazeMeshes.push(leftWall);

            // Right Wall
            const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallMat);
            rightWall.position.set(halfW, h/2, 0);
            rightWall.rotation.y = -Math.PI / 2;
            rightWall.receiveShadow = true;
            scene.add(rightWall);
            proceduralMeshes.push(rightWall);
            mazeMeshes.push(rightWall);
        }

        // 4. OUTER PHYSICAL BOUNDARIES (Always remain, never removed during GLB swap)
        const w1 = Physics.createGround(0, h/2, -boundD, new CANNON.Quaternion());
        w1.collisionFilterGroup = 1;
        mazePhysicsBodies.push(w1);

        const frontWallRot = new CANNON.Quaternion();
        frontWallRot.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI);
        const w2 = Physics.createGround(0, h/2, boundD, frontWallRot);
        w2.collisionFilterGroup = 1;
        mazePhysicsBodies.push(w2);

        const leftWallRot = new CANNON.Quaternion();
        leftWallRot.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), Math.PI / 2);
        const w3 = Physics.createGround(-boundW, h/2, 0, leftWallRot);
        w3.collisionFilterGroup = 1;
        mazePhysicsBodies.push(w3);

        const rightWallRot = new CANNON.Quaternion();
        rightWallRot.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), -Math.PI / 2);
        const w4 = Physics.createGround(boundW, h/2, 0, rightWallRot);
        w4.collisionFilterGroup = 1;
        mazePhysicsBodies.push(w4);

        // 5. BUILD PROCEDURAL MAZE WALLS AND DECORATIONS
        let wallCount = 0;
        let pillarCount = 0;
        if (showFallbackRoom && lvl && lvl.grid) {
            for (let r = 0; r < lvl.grid.length; r++) {
                for (let c = 0; c < lvl.grid[r].length; c++) {
                    const cellType = lvl.grid[r][c];
                    if (cellType === 1) wallCount++;
                    if (cellType === 2) pillarCount++;
                }
            }
        }

        const wallGeo = new THREE.BoxGeometry(4, 6, 4);
        const pillarGeo = new THREE.BoxGeometry(4, 20, 4);
        let wallInstanced = null;
        let pillarInstanced = null;

        if (wallCount > 0) {
            wallInstanced = new THREE.InstancedMesh(wallGeo, wallMat, wallCount);
            wallInstanced.castShadow = true;
            wallInstanced.receiveShadow = true;
            scene.add(wallInstanced);
            mazeMeshes.push(wallInstanced);
            if (showFallbackRoom) proceduralMeshes.push(wallInstanced);
        }

        if (pillarCount > 0) {
            pillarInstanced = new THREE.InstancedMesh(pillarGeo, wallMat, pillarCount);
            pillarInstanced.castShadow = true;
            pillarInstanced.receiveShadow = true;
            scene.add(pillarInstanced);
            mazeMeshes.push(pillarInstanced);
            if (showFallbackRoom) proceduralMeshes.push(pillarInstanced);
        }

        let wallIdx = 0;
        let pillarIdx = 0;
        const tempObject = new THREE.Object3D();
        const lineVertices = [];

        if (showFallbackRoom && lvl && lvl.grid) {
            for (let r = 0; r < lvl.grid.length; r++) {
                for (let c = 0; c < lvl.grid[r].length; c++) {
                    const cellType = lvl.grid[r][c];
                    const worldX = -halfW + c * 4 + 2;
                    const worldZ = -halfD + r * 4 + 2;
                    
                    if (cellType === 1) {
                        tempObject.position.set(worldX, 3, worldZ);
                        tempObject.updateMatrix();
                        wallInstanced.setMatrixAt(wallIdx++, tempObject.matrix);
                        
                        pushBoxOutlineVertices(lineVertices, worldX, 3, worldZ, 4, 6, 4);
                        
                        const body = Physics.createBox(worldX, 3, worldZ, 4, 6, 4, 0);
                        body.collisionFilterGroup = 2;
                        mazePhysicsBodies.push(body);
                        proceduralPhysicsBodies.push(body);
                    } else if (cellType === 2) {
                        tempObject.position.set(worldX, 10, worldZ);
                        tempObject.updateMatrix();
                        pillarInstanced.setMatrixAt(pillarIdx++, tempObject.matrix);
                        
                        pushBoxOutlineVertices(lineVertices, worldX, 10, worldZ, 4, 20, 4);
                        
                        const body = Physics.createBox(worldX, 10, worldZ, 4, 20, 4, 0);
                        body.collisionFilterGroup = 2;
                        mazePhysicsBodies.push(body);
                        proceduralPhysicsBodies.push(body);
                    } else if (cellType === 0) {
                        if (!(r === lvl.spawn.z && c === lvl.spawn.x) && !(r === lvl.exit.z && c === lvl.exit.x)) {
                            const seed = Math.sin(r * 12.9898 + c * 78.233) * 43758.5453;
                            const rand = seed - Math.floor(seed);
                            if (rand < 0.12) {
                                spawnThemeDecoration(worldX, worldZ, lvl.theme, rand, true);
                            }
                        }
                    }
                }
            }
        }

        if (lineVertices.length > 0) {
            const lineGeo = new THREE.BufferGeometry();
            lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
            const lineSegments = new THREE.LineSegments(
                lineGeo, 
                new THREE.LineBasicMaterial({ color: lvl.lightColorLeft || 0xff007a })
            );
            scene.add(lineSegments);
            mazeMeshes.push(lineSegments);
            if (showFallbackRoom) proceduralMeshes.push(lineSegments);
        }

        // 6. ASYNCHRONOUS CUSTOM 3D ENVIRONMENT LOADER
        if (lvl.modelPath) {
            const loadingLevelIndex = currentLevelIndex;
            
            const handleGltfLoaded = (gltf) => {
                if (!isRunning || currentLevelIndex !== loadingLevelIndex) {
                    return;
                }

                // SUCCESS: Clear procedural maze elements
                proceduralMeshes.forEach(mesh => {
                    scene.remove(mesh);
                    mesh.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) child.material.dispose();
                    });
                    
                    const idx = mazeMeshes.indexOf(mesh);
                    if (idx > -1) {
                        mazeMeshes.splice(idx, 1);
                    }
                });
                proceduralMeshes = [];

                proceduralPhysicsBodies.forEach(body => {
                    Physics.removeBody(body);
                    const idx = mazePhysicsBodies.indexOf(body);
                    if (idx > -1) {
                        mazePhysicsBodies.splice(idx, 1);
                    }
                });
                proceduralPhysicsBodies = [];

                // Load custom GLTF scene
                const model = gltf.scene.clone();
                model.name = "environment_model";
                
                scene.add(model);
                mazeMeshes.push(model);

                model.updateMatrixWorld(true);

                // Scale & Center the loaded environment
                const box = new THREE.Box3().setFromObject(model);
                const size = new THREE.Vector3();
                box.getSize(size);
                const center = new THREE.Vector3();
                box.getCenter(center);

                const maxDim = Math.max(size.x, size.z);
                const scaleFactor = (lvl.theme === "arabic_city" || lvl.openWorld) ? 160 / maxDim : 75 / maxDim;
                model.scale.set(scaleFactor, scaleFactor, scaleFactor);

                // Center position (X=0, Z=0, bottom Y=0)
                let posY = (lvl.theme === "arabic_city" || lvl.openWorld) ? 0 : -box.min.y * scaleFactor;
                if (lvl.theme === "mdc_complex") {
                    posY = -box.min.y * scaleFactor;
                }
                model.position.set(
                    -center.x * scaleFactor,
                    posY,
                    -center.z * scaleFactor
                );

                buildingFootprints = [];
                const isOpenWorld = !!lvl.openWorld;

                model.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = false;
                        child.receiveShadow = true;

                        const name = child.name.toLowerCase();

                        if (
                            name.includes('sky') || 
                            name.includes('dome') || 
                            name.includes('cloud')
                        ) {
                            return;
                        }

                        if (isOpenWorld) {
                            if (
                                name.includes('ground') || 
                                name.includes('terrain') || 
                                name.includes('plane')
                            ) {
                                return;
                            }
                        } else {
                            if (
                                name.includes('ground') || 
                                name.includes('floor') || 
                                name.includes('street') || 
                                name.includes('road') || 
                                name.includes('terrain') || 
                                name.includes('base') || 
                                name.includes('plane') || 
                                name.includes('sand')
                            ) {
                                return;
                            }
                        }

                        if (lvl.theme === "arabic_city" || lvl.theme === "cyberpunk_city" || lvl.theme === "mdc_complex") {
                            // Split combined building meshes using DSU to get separate components
                            child.updateMatrixWorld(true);
                            const localBoxes = getComponentBoundingBoxes(child.geometry);
                            
                            localBoxes.forEach(lbox => {
                                const corners = [
                                    new THREE.Vector3(lbox.min.x, lbox.min.y, lbox.min.z),
                                    new THREE.Vector3(lbox.max.x, lbox.min.y, lbox.min.z),
                                    new THREE.Vector3(lbox.min.x, lbox.max.y, lbox.min.z),
                                    new THREE.Vector3(lbox.max.x, lbox.max.y, lbox.min.z),
                                    new THREE.Vector3(lbox.min.x, lbox.min.y, lbox.max.z),
                                    new THREE.Vector3(lbox.max.x, lbox.min.y, lbox.max.z),
                                    new THREE.Vector3(lbox.min.x, lbox.max.y, lbox.max.z),
                                    new THREE.Vector3(lbox.max.x, lbox.max.y, lbox.max.z)
                                ];
                                
                                let wMinX = Infinity, wMinY = Infinity, wMinZ = Infinity;
                                let wMaxX = -Infinity, wMaxY = -Infinity, wMaxZ = -Infinity;
                                
                                corners.forEach(c => {
                                    c.applyMatrix4(child.matrixWorld);
                                    if (c.x < wMinX) wMinX = c.x;
                                    if (c.y < wMinY) wMinY = c.y;
                                    if (c.z < wMinZ) wMinZ = c.z;
                                    if (c.x > wMaxX) wMaxX = c.x;
                                    if (c.y > wMaxY) wMaxY = c.y;
                                    if (c.z > wMaxZ) wMaxZ = c.z;
                                });
                                
                                const meshSize = new THREE.Vector3(wMaxX - wMinX, wMaxY - wMinY, wMaxZ - wMinZ);
                                const meshCenter = new THREE.Vector3((wMaxX + wMinX)/2, (wMaxY + wMinY)/2, (wMaxZ + wMinZ)/2);
                                
                                const minHeight = 0.5;
                                const minSize = 2.5; // Filter out small items/decorations
                                const maxLimit = 35; // Filter out ground/street plates
                                
                                if (meshSize.y < minHeight || meshSize.x < minSize || meshSize.z < minSize || meshSize.x > maxLimit || meshSize.z > maxLimit) {
                                    return;
                                }
                                
                                const body = Physics.createBox(
                                    meshCenter.x,
                                    meshCenter.y,
                                    meshCenter.z,
                                    meshSize.x * 0.9, // Shrink slightly to keep streets open
                                    meshSize.y,
                                    meshSize.z * 0.9,
                                    0
                                );
                                body.collisionFilterGroup = 2;
                                mazePhysicsBodies.push(body);
                                
                                buildingFootprints.push({
                                    x: meshCenter.x,
                                    z: meshCenter.z,
                                    halfW: meshSize.x / 2,
                                    halfD: meshSize.z / 2
                                });
                            });
                        } else {
                            // Standard box bounds for other levels
                            const meshBox = new THREE.Box3().setFromObject(child);
                            const meshSize = new THREE.Vector3();
                            meshBox.getSize(meshSize);
                            const meshCenter = new THREE.Vector3();
                            meshBox.getCenter(meshCenter);

                            const maxLimit = isOpenWorld ? 60 : 35;
                            const minHeight = isOpenWorld ? 0.5 : 0.25;
                            if (meshSize.y < minHeight || meshSize.x > maxLimit || meshSize.z > maxLimit) {
                                return;
                            }

                            if (isOpenWorld) {
                                const spawnX = -halfW + lvl.spawn.x * 4 + 2;
                                const spawnZ = -halfD + lvl.spawn.z * 4 + 2;
                                const exitX = -halfW + lvl.exit.x * 4 + 2;
                                const exitZ = -halfD + lvl.exit.z * 4 + 2;
                                
                                const spawnInside = spawnX >= meshBox.min.x - 0.5 && spawnX <= meshBox.max.x + 0.5 &&
                                                     spawnZ >= meshBox.min.z - 0.5 && spawnZ <= meshBox.max.z + 0.5;
                                const exitInside = exitX >= meshBox.min.x - 0.5 && exitX <= meshBox.max.x + 0.5 &&
                                                   exitZ >= meshBox.min.z - 0.5 && exitZ <= meshBox.max.z + 0.5;
                                
                                if (spawnInside || exitInside) {
                                    return;
                                }
                            } else {
                                const criticalPoints = [
                                    { x: -halfW + lvl.spawn.x * 4 + 2, z: -halfD + lvl.spawn.z * 4 + 2 },
                                    { x: -halfW + lvl.exit.x * 4 + 2, z: -halfD + lvl.exit.z * 4 + 2 }
                                ];
                                if (lvl.vaults) {
                                    lvl.vaults.forEach(v => {
                                        criticalPoints.push({
                                            x: -halfW + v.gridX * 4 + 2,
                                            z: -halfD + v.gridZ * 4 + 2
                                        });
                                    });
                                }
                                if (lvl.enemies) {
                                    lvl.enemies.forEach(e => {
                                        criticalPoints.push({ x: e.x, z: e.z });
                                    });
                                }
                                let intersectsCritical = false;
                                for (const pt of criticalPoints) {
                                    if (
                                        pt.x >= meshBox.min.x - 1.5 && 
                                        pt.x <= meshBox.max.x + 1.5 &&
                                        pt.z >= meshBox.min.z - 1.5 && 
                                        pt.z <= meshBox.max.z + 1.5
                                    ) {
                                        intersectsCritical = true;
                                        break;
                                    }
                                }
                                if (intersectsCritical) {
                                    return;
                                }
                            }

                            const body = Physics.createBox(
                                meshCenter.x,
                                meshCenter.y,
                                meshCenter.z,
                                meshSize.x,
                                meshSize.y,
                                meshSize.z,
                                0
                            );
                            body.collisionFilterGroup = 2;
                            mazePhysicsBodies.push(body);

                            if (isOpenWorld) {
                                buildingFootprints.push({
                                    x: meshCenter.x,
                                    z: meshCenter.z,
                                    halfW: meshSize.x / 2,
                                    halfD: meshSize.z / 2
                                });
                            }
                        }
                    }
                });

                // Reset player position once the model is loaded to align with custom environment height
                const spawnX = -halfW + lvl.spawn.x * 4 + 2;
                const spawnZ = -halfD + lvl.spawn.z * 4 + 2;
                const spawnY = (lvl.theme === "mdc_complex") ? 10.0 : 3.0;
                Player.reset(new THREE.Vector3(spawnX, spawnY, spawnZ));
            };

            if (modelCache.has(lvl.modelPath)) {
                if (uiCallbacks && uiCallbacks.onLoadProgress) {
                    uiCallbacks.onLoadProgress(100);
                }
                handleGltfLoaded(modelCache.get(lvl.modelPath));
            } else {
                const loader = new GLTFLoader(loadingManager);
                loader.load(lvl.modelPath, (gltf) => {
                    modelCache.set(lvl.modelPath, gltf);
                    handleGltfLoaded(gltf);
                }, undefined, (err) => {
                    console.warn(`Custom 3D environment model not found/failed to load at ${lvl.modelPath}. Running level in procedural fallback mode.`, err);
                    if (uiCallbacks && uiCallbacks.onLoadProgress) {
                        uiCallbacks.onLoadProgress(100);
                    }
                });
            }
        }

        // 7. Spawn insect guards
        if (lvl && lvl.enemies) {
            lvl.enemies.forEach((enemy, index) => {
                Enemies.spawnInsect(enemy.x, 0, enemy.z, enemy.name, index, enemy.hp);
            });
        }
    }



    function spawnThemeDecoration(x, z, theme, rand, isProcedural = false) {
        const group = new THREE.Group();
        group.position.set(x, 0, z); // rest on floor

        if (theme === "frost_core") {
            // Octahedron ice crystal
            const geo = new THREE.OctahedronGeometry(0.35 + rand * 0.2, 0);
            const mat = new THREE.MeshStandardMaterial({
                color: 0x00f0ff,
                emissive: 0x005577,
                transparent: true,
                opacity: 0.85,
                roughness: 0.05,
                metalness: 0.9
            });
            const crystal = new THREE.Mesh(geo, mat);
            crystal.position.y = 0.4;
            crystal.rotation.set(rand * Math.PI, rand * Math.PI, 0);
            group.add(crystal);

            // Add subtle glow light
            if (rand < 0.06) {
                const light = new THREE.PointLight(0x00f0ff, 1.2, 3);
                light.position.y = 0.5;
                group.add(light);
            }
        } else if (theme === "cyberpunk_city") {
            // Cyber console block or glowing neon pole
            const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6);
            const poleMat = new THREE.MeshStandardMaterial({
                color: 0x1e293b,
                metalness: 0.85,
                roughness: 0.2
            });
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.y = 0.6;
            group.add(pole);

            // Glowing neon ring around the pole
            const ringGeo = new THREE.TorusGeometry(0.18, 0.03, 8, 16);
            const ringMat = new THREE.MeshBasicMaterial({
                color: rand < 0.5 ? 0xff007a : 0x00f0ff,
                toneMapped: false
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 0.7;
            group.add(ring);

            // Small light source
            if (rand < 0.08) {
                const light = new THREE.PointLight(rand < 0.5 ? 0xff007a : 0x00f0ff, 1.5, 4);
                light.position.y = 0.8;
                group.add(light);
            }
        } else if (theme === "emerald_greenhouse") {
            // Jungle leafy bush
            const leafGeo = new THREE.DodecahedronGeometry(0.35 + rand * 0.15, 1);
            const leafMat = new THREE.MeshStandardMaterial({
                color: 0x16a34a,
                roughness: 0.9,
                metalness: 0.0
            });
            
            // Cluster of 3 meshes
            for (let i = 0; i < 3; i++) {
                const leaf = new THREE.Mesh(leafGeo, leafMat);
                leaf.position.set(
                    (Math.sin(rand * 5 + i) * 0.25),
                    0.25 + (i * 0.15),
                    (Math.cos(rand * 5 + i) * 0.25)
                );
                leaf.scale.set(1, 0.8, 1);
                group.add(leaf);
            }
        } else if (theme === "magma_core") {
            // Burning ember pile
            const lavaGeo = new THREE.BoxGeometry(0.5 + rand * 0.3, 0.15, 0.5 + rand * 0.3);
            const lavaMat = new THREE.MeshBasicMaterial({
                color: 0xff3300,
                toneMapped: false
            });
            const vent = new THREE.Mesh(lavaGeo, lavaMat);
            vent.position.y = 0.05;
            group.add(vent);

            const rockGeo = new THREE.DodecahedronGeometry(0.2, 0);
            const rockMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.set(0.1, 0.15, -0.1);
            group.add(rock);

            if (rand < 0.06) {
                const light = new THREE.PointLight(0xff4500, 1.8, 4);
                light.position.y = 0.4;
                group.add(light);
            }
        } else if (theme === "radiant_sanctum") {
            // Polished white marble base with gold sphere
            const baseGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 6);
            const baseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1 });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.y = 0.1;
            group.add(base);

            const orbGeo = new THREE.SphereGeometry(0.18, 16, 16);
            const orbMat = new THREE.MeshStandardMaterial({
                color: 0xffd700,
                metalness: 0.95,
                roughness: 0.05,
                emissive: 0x3f3f00
            });
            const orb = new THREE.Mesh(orbGeo, orbMat);
            orb.position.y = 0.35;
            group.add(orb);
        } else if (theme === "cyber_lab") {
            // Cyber console block
            const boxGeo = new THREE.BoxGeometry(0.4, 0.5, 0.4);
            const boxMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
            const box = new THREE.Mesh(boxGeo, boxMat);
            box.position.y = 0.25;
            group.add(box);

            const glowGeo = new THREE.BoxGeometry(0.3, 0.08, 0.42);
            const glowMat = new THREE.MeshBasicMaterial({ color: 0xff007a });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.set(0, 0.3, 0);
            group.add(glow);
        } else if (theme === "obsidian_abyss") {
            // Purple dark core shard
            const shardGeo = new THREE.ConeGeometry(0.2, 0.8, 5);
            const shardMat = new THREE.MeshStandardMaterial({
                color: 0x8b5cf6,
                emissive: 0x2e1065,
                roughness: 0.05,
                metalness: 0.9
            });
            const shard = new THREE.Mesh(shardGeo, shardMat);
            shard.position.y = 0.4;
            shard.rotation.set(0.2, 0.1, -0.15);
            group.add(shard);
        } else if (theme === "hydro_station") {
            // Metal pipe coupler
            const couplerGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.3, 8);
            const couplerMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9, roughness: 0.2 });
            const pipe = new THREE.Mesh(couplerGeo, couplerMat);
            pipe.position.y = 0.15;
            group.add(pipe);
        }

        scene.add(group);
        mazeMeshes.push(group);
        if (isProcedural) {
            proceduralMeshes.push(group);
        }
    }

    function createMazeWall(x, y, z, width, height, depth, outlineColor = 0xff007a, isProcedural = false) {
        const geo = new THREE.BoxGeometry(width, height, depth);
        const mat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.15,
            metalness: 0.1
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        scene.add(mesh);
        mazeMeshes.push(mesh);
        
        // Add glowing outlines
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: outlineColor }));
        line.position.copy(mesh.position);
        scene.add(line);
        mazeMeshes.push(line);

        // Physics body
        const body = Physics.createBox(x, y, z, width, height, depth, 0); // static
        body.collisionFilterGroup = 2;
        mazePhysicsBodies.push(body);

        if (isProcedural) {
            proceduralMeshes.push(mesh);
            proceduralMeshes.push(line);
            proceduralPhysicsBodies.push(body);
        }
    }

    function interact() {
        const playerPos = Player.getPosition();
        const nearbyVault = Vaults.getNearbyVault(playerPos);
        
        if (nearbyVault) {
            if (!nearbyVault.opened) {
                if (Player.getKeyCount() > 0) {
                    Player.consumeKey();
                    nearbyVault.opened = true;
                    Sound.playUnlock();
                    uiCallbacks.onNotification(`${nearbyVault.name.toUpperCase()} VAULT UNLOCKED WITH KEY`);
                    uiCallbacks.onOpenPuzzle(nearbyVault);
                } else {
                    uiCallbacks.onNotification("REQUIRES KEY! DEFEAT MONSTERS TO RETRIEVE KEYS");
                }
            } else {
                uiCallbacks.onOpenPuzzle(nearbyVault);
            }
        } else {
            const distToCenter = playerPos.distanceTo(new THREE.Vector3(0, playerPos.y, 0));
            if (distToCenter < 3.0 && playerPos.y < 3.0 && Player.getOrbCount() > 0 && !Player.getGravityInverted()) {
                Player.activateAntiGravity();
            } else {
                uiCallbacks.onNotification("NO INTERACTIVE OBJECT NEARBY");
            }
        }
    }

    function onWindowResize() {
        if (!renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        if (!isRunning) return;
        frameId = requestAnimationFrame(animate);
        
        const rawDelta = clock.getDelta();
        // Clamp deltaTime to prevent physics explosion on tab-switch or stall
        const deltaTime = Math.min(rawDelta, 0.1);
        
        // 1. Physics simulation step
        Physics.step(deltaTime);
        
        // Sync boxes
        const world = Physics.getWorld();
        for (let i = 0; i < world.bodies.length; i++) {
            const body = world.bodies[i];
            if (body.mesh) {
                body.mesh.position.copy(body.position);
                body.mesh.quaternion.copy(body.quaternion);
            }
        }
        
        // 2. Update players & controls
        Player.update(deltaTime);
        
        // 3. Update insects, fireballs, and drops
        Enemies.update(deltaTime, Player.getPosition(), camera);
        
        // 4. Update vaults bobbing
        Vaults.update(deltaTime);
        
        // 6. Update dust particles
        Particles.update(deltaTime, Player.getGravityInverted());
        
        // 7. Update dynamic overlays HUD prompts
        updateHUDPrompts();

        // 8. Update Tweens
        TWEEN.update();

        // 9. Update 3D holographic navigation guide compass
        if (navArrowMesh && camera) {
            const playerPos = Player.getPosition();
            const nearestVault = Vaults.getNearestUndecryptedVault(playerPos);
            
            if (nearestVault) {
                navArrowMesh.visible = true;
                const targetPos = nearestVault.position.clone();
                const localTarget = targetPos.clone();
                camera.worldToLocal(localTarget);
                navArrowMesh.lookAt(localTarget);
                navArrowMesh.material.color.setHex(nearestVault.color);
            } else if (portalActive && portalCell) {
                navArrowMesh.visible = true;
                const lvl = LEVELS[currentLevelIndex - 1];
                const gridRows = lvl.grid.length;
                const gridCols = lvl.grid[0].length;
                const halfW = (gridCols * 4) / 2;
                const halfD = (gridRows * 4) / 2;
                const portalPos = new THREE.Vector3(
                    -halfW + portalCell.x * 4 + 2,
                    playerPos.y,
                    -halfD + portalCell.z * 4 + 2
                );
                
                const localTarget = portalPos.clone();
                camera.worldToLocal(localTarget);
                navArrowMesh.lookAt(localTarget);
                navArrowMesh.material.color.setHex(0x39ff14); // neon green for warp portal
            } else {
                navArrowMesh.visible = false;
            }
        }

        // 10. Exit portal warp check
        if (portalActive && portalMesh) {
            portalMesh.rotation.y += deltaTime * 2.0;
            const playerPos = Player.getPosition();
            
            const lvl = LEVELS[currentLevelIndex - 1];
            const gridRows = lvl.grid.length;
            const gridCols = lvl.grid[0].length;
            const halfW = (gridCols * 4) / 2;
            const halfD = (gridRows * 4) / 2;
            
            const portalPos = new THREE.Vector3(
                -halfW + portalCell.x * 4 + 2,
                playerPos.y,
                -halfD + portalCell.z * 4 + 2
            );
            if (playerPos.distanceTo(portalPos) < 2.0) {
                portalActive = false;
                Sound.playVictory();
                uiCallbacks.onNextLevel();
            }
        } else if (!portalActive && Player.getScore() >= 3) {
            spawnExitPortal();
        }

        // 10. Render
        renderer.render(scene, camera);
    }

    function updateHUDPrompts() {
        const playerPos = Player.getPosition();
        const nearbyVault = Vaults.getNearbyVault(playerPos);
        
        if (nearbyVault) {
            if (!nearbyVault.opened) {
                uiCallbacks.onPrompt(`PRESS [ E ] TO UNLOCK ${nearbyVault.name} VAULT (REQUIRES KEY)`);
            } else {
                uiCallbacks.onPrompt(`PRESS [ E ] TO DECRYPT ${nearbyVault.name} VAULT`);
            }
        } else {
            const distToCenter = playerPos.distanceTo(new THREE.Vector3(0, playerPos.y, 0));
            if (distToCenter < 3.0 && playerPos.y < 3.0 && Player.getOrbCount() > 0 && !Player.getGravityInverted()) {
                uiCallbacks.onPrompt("PRESS [ G ] TO ENGAGE ANTI-GRAVITY INVERSION");
            } else {
                uiCallbacks.onPrompt("");
            }
        }
    }

    function spawnExitPortal() {
        if (portalActive) return;
        portalActive = true;
        
        const lvl = LEVELS[currentLevelIndex - 1];
        portalCell = lvl.exit;
        
        const gridRows = lvl.grid.length;
        const gridCols = lvl.grid[0].length;
        const halfW = (gridCols * 4) / 2;
        const halfD = (gridRows * 4) / 2;
        
        const portalX = -halfW + portalCell.x * 4 + 2;
        const portalZ = -halfD + portalCell.z * 4 + 2;
        
        // Create a glowing warp portal mesh
        const portalGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.2, 32);
        const portalMat = new THREE.MeshBasicMaterial({
            color: lvl.lightColorLeft || 0xff007a,
            toneMapped: false,
            transparent: true,
            opacity: 0.8
        });
        portalMesh = new THREE.Mesh(portalGeo, portalMat);
        portalMesh.position.set(portalX, 0.1, portalZ);
        scene.add(portalMesh);
        
        // Add a vertical glowing beam or particle effect!
        const beamGeo = new THREE.CylinderGeometry(1.2, 1.2, 6, 32, 1, true);
        const beamMat = new THREE.MeshBasicMaterial({
            color: lvl.lightColorLeft || 0xff007a,
            transparent: true,
            opacity: 0.35,
            side: THREE.DoubleSide
        });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = 3;
        portalMesh.add(beam);
        
        // Add light
        portalLight = new THREE.PointLight(lvl.lightColorLeft || 0xff007a, 5.0, 15);
        portalLight.position.set(portalX, 3, portalZ);
        scene.add(portalLight);
        
        uiCallbacks.onNotification("WARP PORTAL ACTIVE! FIND THE EXIT ZONE.");
    }

    function nextLevel(levelIndex) {
        currentLevelIndex = levelIndex;
        restart(levelIndex);
    }

    function restart(levelIndex = 1) {
        currentLevelIndex = levelIndex;
        Enemies.init(scene, currentLevelIndex);
        Enemies.clearAll();
        Vaults.clearAll();
        
        // Clean up previous maze elements recursively to prevent memory leaks
        mazeMeshes.forEach(mesh => {
            scene.remove(mesh);
            mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        mazeMeshes = [];
        proceduralMeshes = [];

        mazePhysicsBodies.forEach(body => {
            Physics.removeBody(body);
        });
        mazePhysicsBodies = [];
        proceduralPhysicsBodies = [];
        buildingFootprints = [];

        if (portalMesh) {
            scene.remove(portalMesh);
            portalMesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            portalMesh = null;
        }
        if (portalLight) {
            scene.remove(portalLight);
            portalLight = null;
        }
        portalActive = false;

        buildStationEnvironment();
        
        const lvl = LEVELS[currentLevelIndex - 1];
        const gridRows = lvl.grid.length;
        const gridCols = lvl.grid[0].length;
        const halfW = (gridCols * 4) / 2;
        const halfD = (gridRows * 4) / 2;

        Vaults.init(scene, lvl.vaults, currentLevelIndex);
        
        // Reset player to current level spawn coordinates
        const spawnX = -halfW + lvl.spawn.x * 4 + 2;
        const spawnZ = -halfD + lvl.spawn.z * 4 + 2;
        const spawnPos = new THREE.Vector3(spawnX, 3, spawnZ);

        Player.reset(spawnPos, currentLevelIndex);
    }

    function getMinimapData() {
        const lvl = LEVELS[currentLevelIndex - 1];
        if (!lvl) return null;
        return {
            grid: lvl.grid,
            openWorld: !!lvl.openWorld,
            boundSize: lvl.openWorld ? 40.0 : ((lvl.grid[0].length * 4) / 2),
            buildingFootprints: buildingFootprints,
            playerPos: Player.getPosition(),
            enemies: Enemies.getActiveEnemies ? Enemies.getActiveEnemies() : [],
            vaults: Vaults.getActiveVaults ? Vaults.getActiveVaults() : [],
            portalActive,
            portalCell,
            yaw: camera ? camera.rotation.y : 0
        };
    }

    function pause() {
        isRunning = false;
        cancelAnimationFrame(frameId);
    }

    function resume() {
        if (isRunning) return;
        isRunning = true;
        clock.getDelta(); // Reset clock delta to avoid massive frame jumps
        animate();
    }

    function shutdown() {
        isRunning = false;
        cancelAnimationFrame(frameId);
        window.removeEventListener('resize', onWindowResize);
        document.removeEventListener('visibilitychange', handleVisibilityRef);
        
        Enemies.clearAll();
        Vaults.clearAll();
        if (Particles.clearCachedMaterials) {
            Particles.clearCachedMaterials();
        }
        Physics.getWorld().bodies.forEach(b => Physics.removeBody(b));
        
        if (renderer) {
            renderer.dispose();
            renderer = null;
        }
    }

    function pushBoxOutlineVertices(arr, x, y, z, w, h, d) {
        const hw = w / 2;
        const hh = h / 2;
        const hd = d / 2;
        const edges = [
            x-hw, y-hh, z-hd, x+hw, y-hh, z-hd,
            x+hw, y-hh, z-hd, x+hw, y-hh, z+hd,
            x+hw, y-hh, z+hd, x-hw, y-hh, z+hd,
            x-hw, y-hh, z+hd, x-hw, y-hh, z-hd,
            x-hw, y+hh, z-hd, x+hw, y+hh, z-hd,
            x+hw, y+hh, z-hd, x+hw, y+hh, z+hd,
            x+hw, y+hh, z+hd, x-hw, y+hh, z+hd,
            x-hw, y+hh, z+hd, x-hw, y+hh, z-hd,
            x-hw, y-hh, z-hd, x-hw, y+hh, z-hd,
            x+hw, y-hh, z-hd, x+hw, y+hh, z-hd,
            x+hw, y-hh, z+hd, x+hw, y+hh, z+hd,
            x-hw, y-hh, z+hd, x-hw, y+hh, z+hd
        ];
        arr.push(...edges);
    }

    return {
        start,
        interact,
        restart,
        nextLevel,
        pause,
        resume,
        shutdown,
        getControls: () => Player.getControls(),
        getPlayer: () => Player,
        getCachedModel: (path) => modelCache.get(path),
        getMinimapData
    };
})();

// Attach globally for easier reference from inside player.js or app components
window.GameManager = GameEngine;

export default GameEngine;
