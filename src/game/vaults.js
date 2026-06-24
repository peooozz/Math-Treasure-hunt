/**
 * Vaults module managing level placement and interactive 3D math problems
 */
import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import Particles from './particles';
import { Sound } from './sound';
import { LEVELS, getAssetUrl } from './levels';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

const Vaults = (() => {
    let sceneRef;
    let currentLevelIdx = 1;
    let cachedEnvironmentModel = null;
    const raycaster = new THREE.Raycaster();
    const downVector = new THREE.Vector3(0, -1, 0);
    const activeVaults = [];
    
    // Sub-scene properties for the puzzle overlay
    let puzzleRenderer;
    let puzzleScene;
    let puzzleCamera;
    let puzzleContainer;
    let animationFrameId;
    
    // Drag rotation state
    let rotX = 0.4;
    let rotY = -0.5;

    // Puzzle-specific dynamic objects
    let algFieldMesh;
    let algWidthLabel;
    let algLengthLabel;
    let qBall;
    let qCurve;
    let qThrowing = false;
    let tBoat;
    let tLaser;
    let tHeightLine;
    let tBaseLine;
    let tHypotLine;
    
    let currentLevelVaults = [];
    let geomShapeMesh = null;
    let geomLabelsGroup = null;

    let chestModel = null;
    let isChestModelLoading = false;

    function loadChestModel() {
        if (chestModel || isChestModelLoading) return;
        isChestModelLoading = true;
        const loader = new GLTFLoader();
        loader.load(getAssetUrl('/treasure_chest.glb'), (gltf) => {
            chestModel = gltf;
            isChestModelLoading = false;
            // Swap placeholders for GLB model on loaded vaults
            activeVaults.forEach(v => {
                if (v.mesh && !v.gltfInstance) {
                    setupVaultGlb(v);
                }
            });
        }, undefined, (err) => {
            console.error("Error loading treasure chest GLB:", err);
            isChestModelLoading = false;
        });
    }

    function setupVaultGlb(v) {
        if (!chestModel) return;
        
        try {
            const gltfScene = SkeletonUtils.clone(chestModel.scene);
            gltfScene.updateMatrixWorld(true);
            
            // Compute bounding box to scale automatically to ~1.6 width
            const bbox = new THREE.Box3().setFromObject(gltfScene);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            const maxDim = size.x || 1.0;
            const scaleFactor = 2.0 / maxDim;
            gltfScene.scale.set(scaleFactor, scaleFactor, scaleFactor);
            
            // Align bottom center of GLB mesh slightly above ground (which is -0.65 relative to mesh Y offset)
            const center = new THREE.Vector3();
            bbox.getCenter(center);
            gltfScene.position.set(
                -center.x * scaleFactor,
                -bbox.min.y * scaleFactor - 0.65,
                -center.z * scaleFactor
            );
            
            v.mesh.add(gltfScene);
            v.gltfInstance = gltfScene;

            // Enable shadows and disable frustum culling (essential since bones are offset)
            gltfScene.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.frustumCulled = false;
                }
            });

            // Set up animations
            if (chestModel.animations && chestModel.animations.length > 0) {
                v.mixer = new THREE.AnimationMixer(gltfScene);
                const openClip = chestModel.animations.find(clip => clip.name === "Armature|A_Open" || clip.name.toLowerCase().includes("open"));
                const closeClip = chestModel.animations.find(clip => clip.name === "Armature|A_Close" || clip.name.toLowerCase().includes("close"));
                
                if (openClip) {
                    v.openAction = v.mixer.clipAction(openClip);
                    v.openAction.setLoop(THREE.LoopOnce);
                    v.openAction.clampWhenFinished = true;
                }
                if (closeClip) {
                    v.closeAction = v.mixer.clipAction(closeClip);
                    v.closeAction.setLoop(THREE.LoopOnce);
                    v.closeAction.clampWhenFinished = true;
                }
            }
            
            // If initialized in open/unlocked state
            if (v.opened || v.unlocked) {
                if (v.openAction) {
                    v.animPlayingOpen = true;
                    v.openAction.play();
                    const openClip = chestModel.animations.find(clip => clip.name === "Armature|A_Open" || clip.name.toLowerCase().includes("open"));
                    if (openClip) {
                        v.mixer.setTime(openClip.duration); // start fully open
                    }
                }
            }

            // Remove placeholder base box and trim now that GLB has successfully loaded
            if (v.placeholderBase) {
                v.mesh.remove(v.placeholderBase);
                v.placeholderBase = null;
            }
            if (v.trim) {
                v.mesh.remove(v.trim);
                v.trim = null;
            }
        } catch (err) {
            console.error("Failed to setup GLB model for vault:", err);
        }
    }

    function getColorForType(type) {
        switch (type) {
            case 'algebra': return 0xff007a;
            case 'quadratics': return 0xff00b7;
            case 'trig': return 0xff0055;
            case 'geometry': return 0xd946ef;
            case 'logic': return 0xa855f7;
            default: return 0xff007a;
        }
    }

    function getGroundHeight(x, z) {
        if (!sceneRef) return 0;
        if (!cachedEnvironmentModel) {
            cachedEnvironmentModel = sceneRef.getObjectByName("environment_model");
        }
        if (!cachedEnvironmentModel) return 0;
        
        const origin = new THREE.Vector3(x, 200, z);
        raycaster.set(origin, downVector);
        raycaster.far = 250;
        
        const intersects = raycaster.intersectObject(cachedEnvironmentModel, true);
        if (intersects.length > 0) {
            const lvl = LEVELS[currentLevelIdx - 1] || LEVELS[0];
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
                return lowestY;
            }
            
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
            return closestY;
        }
        return 0;
    }

    function init(scene, levelVaults = [], levelIndex = 1) {
        sceneRef = scene;
        currentLevelVaults = levelVaults;
        currentLevelIdx = levelIndex;
        activeVaults.length = 0;
        
        loadChestModel();
        
        const lvl = LEVELS[levelIndex - 1] || LEVELS[0];
        const gridRows = lvl.grid.length;
        const gridCols = lvl.grid[0].length;
        const halfW = (gridCols * 4) / 2;
        const halfD = (gridRows * 4) / 2;
        
        levelVaults.forEach(v => {
            const worldX = -halfW + v.gridX * 4 + 2;
            const worldZ = -halfD + v.gridZ * 4 + 2;
            const color = getColorForType(v.type);
            let groundY = 0;
            if (lvl && lvl.modelPath) {
                groundY = getGroundHeight(worldX, worldZ);
            }
            createVaultMesh(worldX, groundY, worldZ, color, v.type.toUpperCase(), v.id);
        });
    }

    function createTextSprite(text, color = '#00f0ff') {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'Bold 14px Orbitron';
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(3, 0.75, 1);
        return sprite;
    }

    function createVaultMesh(x, y, z, color, labelText, typeId) {
        const group = new THREE.Group();
        group.position.set(x, y + 0.8, z);
        
        // Base Box
        const baseGeo = new THREE.BoxGeometry(2.0, 1.5, 1.5);
        const baseMat = new THREE.MeshStandardMaterial({
            color: 0x242833,
            roughness: 0.35,
            metalness: 0.85
        });
        const placeholderBase = new THREE.Mesh(baseGeo, baseMat);
        placeholderBase.position.y = 0.15;
        placeholderBase.castShadow = true;

        // Glowing trim
        const trimGeo = new THREE.BoxGeometry(2.1, 0.1, 1.6);
        const trimMat = new THREE.MeshBasicMaterial({
            color: color,
            toneMapped: false
        });
        const trim = new THREE.Mesh(trimGeo, trimMat);
        trim.position.y = 0.95;

        // Always add placeholders initially so we don't have a blank frame
        group.add(placeholderBase);
        group.add(trim);

        // Floating label
        const sprite = createTextSprite(labelText, '#fff');
        sprite.position.y = 1.3;
        group.add(sprite);

        // Light
        const light = new THREE.PointLight(color, 2.0, 5);
        light.castShadow = false; // Turn off point shadow for lag reduction!
        light.position.y = 1;
        group.add(light);

        sceneRef.add(group);

        const vaultData = {
            id: typeId,
            mesh: group,
            placeholderBase: placeholderBase,
            trim: trim,
            light: light,
            sprite: sprite,
            position: new THREE.Vector3(x, y + 0.8, z),
            radius: 2.2,
            unlocked: false,
            opened: false,
            color: color,
            name: labelText,
            mixer: null,
            openAction: null,
            closeAction: null,
            gltfInstance: null,
            animPlayingOpen: false,
            animPlayingClose: false
        };

        activeVaults.push(vaultData);

        if (chestModel) {
            setupVaultGlb(vaultData);
        }
    }

    function getNearbyVault(playerPos) {
        for (let i = 0; i < activeVaults.length; i++) {
            const v = activeVaults[i];
            if (v.unlocked) continue;
            
            const horizontalDist = Math.sqrt(Math.pow(v.position.x - playerPos.x, 2) + Math.pow(v.position.z - playerPos.z, 2));
            const verticalDist = Math.abs(v.position.y - playerPos.y);
            
            if (horizontalDist < v.radius && verticalDist < 3.0) {
                return v;
            }
        }
        return null;
    }
    
    function getNearestUndecryptedVault(playerPos) {
        let nearest = null;
        let minDist = Infinity;
        for (let i = 0; i < activeVaults.length; i++) {
            const v = activeVaults[i];
            if (v.unlocked) continue;
            const dist = playerPos.distanceTo(v.position);
            if (dist < minDist) {
                minDist = dist;
                nearest = v;
            }
        }
        return nearest;
    }

    /**
     * Set up the sub-scene 3D puzzle in the React Canvas view
     */
    function setupPuzzleCanvas(canvas, vaultId) {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        puzzleRenderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        puzzleRenderer.setSize(width, height, false);
        puzzleRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Optimised resolution
        
        puzzleScene = new THREE.Scene();
        puzzleScene.background = new THREE.Color(0xf8fafc);
        puzzleScene.fog = new THREE.FogExp2(0xf8fafc, 0.03);
        
        puzzleCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        puzzleCamera.position.set(0, 5, 14);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        puzzleScene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        puzzleScene.add(dirLight);
        
        puzzleContainer = new THREE.Group();
        puzzleScene.add(puzzleContainer);
        
        // Reset rotation drag
        rotX = 0.4;
        rotY = -0.5;
        
        setupSpecificPuzzle(vaultId);
        
        // Add mouse drag rotation handler
        let isDragging = false;
        let prevMouse = { x: 0, y: 0 };
        
        const onMouseDown = (e) => {
            isDragging = true;
            prevMouse = { x: e.clientX, y: e.clientY };
        };
        const onMouseMove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - prevMouse.x;
            const dy = e.clientY - prevMouse.y;
            
            rotY += dx * 0.007;
            rotX = Math.max(-Math.PI/3, Math.min(Math.PI/3, rotX + dy * 0.007));
            
            prevMouse = { x: e.clientX, y: e.clientY };
        };
        const onMouseUp = () => { isDragging = false; };
        
        canvas.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        // Render loop
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            TWEEN.update();
            if (puzzleContainer) {
                puzzleContainer.rotation.y += (rotY - puzzleContainer.rotation.y) * 0.1;
                puzzleContainer.rotation.x += (rotX - puzzleContainer.rotation.x) * 0.1;
            }
            puzzleRenderer.render(puzzleScene, puzzleCamera);
        };
        animate();

        // Return cleanup callback
        return () => {
            cancelAnimationFrame(animationFrameId);
            canvas.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            puzzleRenderer.dispose();
        };
    }

    function clearGeometryObjects() {
        if (geomShapeMesh) {
            puzzleContainer.remove(geomShapeMesh);
            geomShapeMesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            geomShapeMesh = null;
        }
        if (geomLabelsGroup) {
            puzzleContainer.remove(geomLabelsGroup);
            geomLabelsGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            geomLabelsGroup = null;
        }
    }

    function setupSpecificPuzzle(vaultId) {
        clearGeometryObjects();
        
        const vaultConfig = currentLevelVaults.find(v => v.id === vaultId);
        if (!vaultConfig) return;

        const type = vaultConfig.type;
        if (type === 'algebra') {
            setupAlgebraPuzzle(vaultConfig);
        } else if (type === 'quadratics') {
            setupQuadraticsPuzzle(vaultConfig);
        } else if (type === 'trig') {
            setupTrigPuzzle(vaultConfig);
        } else if (type === 'geometry') {
            setupGeometryPuzzle(vaultConfig);
        } else if (type === 'logic') {
            setupLogicPuzzle(vaultConfig);
        }
    }

    function setupAlgebraPuzzle(v) {
        if (v.name === "Farmer's Field") {
            const platformMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.8 });
            const platform = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.2, 7.5), platformMat);
            platform.position.set(0, -platform.geometry.parameters.height / 2, 0);
            puzzleContainer.add(platform);

            // Euclid's algorithm visual steps
            // 1. One 135x135 square (scaled 4.8x4.8)
            const sq1Geo = new THREE.BoxGeometry(4.8, 0.15, 4.8);
            const sq1Mat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.5, metalness: 0.1, transparent: true, opacity: 0.75 });
            const sq1 = new THREE.Mesh(sq1Geo, sq1Mat);
            sq1.position.set(-8/2 + 4.8/2, 0.08, 0);
            puzzleContainer.add(sq1);
            
            const sq1Label = createTextSprite("135 x 135", "#ffffff");
            sq1Label.position.set(-8/2 + 4.8/2, 0.8, 0);
            sq1Label.scale.set(1.8, 0.45, 1);
            puzzleContainer.add(sq1Label);

            // 2. One 90x90 square (scaled 3.2x3.2)
            const sq2Geo = new THREE.BoxGeometry(3.2, 0.15, 3.2);
            const sq2Mat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5, metalness: 0.1, transparent: true, opacity: 0.75 });
            const sq2 = new THREE.Mesh(sq2Geo, sq2Mat);
            sq2.position.set(0.8 + 3.2/2, 0.1, -2.4 + 3.2/2);
            puzzleContainer.add(sq2);
            
            const sq2Label = createTextSprite("90 x 90", "#ffffff");
            sq2Label.position.set(0.8 + 3.2/2, 0.8, -2.4 + 3.2/2);
            sq2Label.scale.set(1.5, 0.4, 1);
            puzzleContainer.add(sq2Label);

            // 3. Two 45x45 squares (scaled 1.6x1.6)
            const sq3Mat = new THREE.MeshStandardMaterial({ color: 0xff007a, roughness: 0.5, metalness: 0.1, transparent: true, opacity: 0.75 });
            
            const sq3a = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 1.6), sq3Mat);
            sq3a.position.set(0.8 + 1.6/2, 0.12, 0.8 + 1.6/2);
            puzzleContainer.add(sq3a);
            
            const sq3b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 1.6), sq3Mat);
            sq3b.position.set(0.8 + 1.6 + 1.6/2, 0.12, 0.8 + 1.6/2);
            puzzleContainer.add(sq3b);

            const sq3Label = createTextSprite("45 x 45", "#ffffff");
            sq3Label.position.set(0.8 + 1.6, 0.8, 0.8 + 1.6/2);
            sq3Label.scale.set(1.5, 0.4, 1);
            puzzleContainer.add(sq3Label);

            // Step relation equation
            const stepLabel = createTextSprite("225 = 135*1 + 90 | 135 = 90*1 + 45 | 90 = 45*2 + 0", "#ffd700");
            stepLabel.position.set(0, 3.0, 0);
            stepLabel.scale.set(5.5, 0.7, 1);
            puzzleContainer.add(stepLabel);

            algFieldMesh = new THREE.Group();
            puzzleContainer.add(algFieldMesh);
            
            algWidthLabel = null;
            updateAlgebraField(v.defaultVal || 30, "Farmer's Field");
        } else if (v.name === "Rooftop Projectile") {
            const platform = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.2, 2.0), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));
            platform.position.set(0, -platform.geometry.parameters.height / 2, 0);
            puzzleContainer.add(platform);

            algFieldMesh = new THREE.Group();
            puzzleContainer.add(algFieldMesh);

            const colMatFixed = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.1, roughness: 0.5 });
            const colMatTarget = new THREE.MeshStandardMaterial({ color: 0xff007a, metalness: 0.1, roughness: 0.5 });

            // Draw columns 1 to 9
            for (let n = 1; n <= 9; n++) {
                const termVal = 2 + 5 * (n - 1);
                const h = termVal * 0.1;
                const colGeo = new THREE.CylinderGeometry(0.2, 0.2, h, 16);
                const col = new THREE.Mesh(colGeo, colMatFixed);
                col.position.set(-4.5 + (n - 1) * 1.0, h / 2, 0);
                algFieldMesh.add(col);

                const label = createTextSprite(`a${n}=${termVal}`, "#94a3b8");
                label.position.set(-4.5 + (n - 1) * 1.0, h + 0.4, 0);
                label.scale.set(1.5, 0.4, 1);
                algFieldMesh.add(label);
            }

            // Column 10 (stored in qBall for dynamic updates)
            const col10Geo = new THREE.CylinderGeometry(0.2, 0.2, 1.0, 16);
            qBall = new THREE.Mesh(col10Geo, colMatTarget);
            qBall.position.set(4.5, 0.5, 0);
            algFieldMesh.add(qBall);

            // Target line guide at height 4.7
            const linePoints = [new THREE.Vector3(-5.0, 4.7, 0), new THREE.Vector3(5.0, 4.7, 0)];
            const targetLine = createDashedLine(linePoints[0], linePoints[1], new THREE.LineDashedMaterial({ color: 0x39ff14, dashSize: 0.2, gapSize: 0.1 }));
            puzzleContainer.add(targetLine);

            const targetLabel = createTextSprite("Target Line (a10 = 47)", "#39ff14");
            targetLabel.position.set(0, 5.2, 0);
            targetLabel.scale.set(3.0, 0.6, 1);
            puzzleContainer.add(targetLabel);

            const formulaText = createTextSprite("AP Series: a_n = a + (n-1)d | a = 2, d = 5", "#ffd700");
            formulaText.position.set(0, 6.0, 0);
            formulaText.scale.set(4.5, 0.6, 1);
            puzzleContainer.add(formulaText);

            algLengthLabel = null;
            updateAlgebraField(v.defaultVal || 35, "Rooftop Projectile");
        } else if (v.name === "Linear Trajectory") {
            const grid = new THREE.GridHelper(10, 10, 0x94a3b8, 0x475569);
            grid.rotation.x = Math.PI / 2;
            puzzleContainer.add(grid);

            // Plot line 1: 2x + 3y = 11 => y = (11 - 2x) / 3
            const points1 = [];
            for (let x = -8; x <= 8; x += 0.5) {
                const y = (11 - 2 * x) / 3;
                points1.push(new THREE.Vector3(x * 0.4, y * 0.4 - 1.0, 0.01));
            }
            const line1Geo = new THREE.BufferGeometry().setFromPoints(points1);
            const line1 = new THREE.Line(line1Geo, new THREE.LineBasicMaterial({ color: 0x3b82f6, linewidth: 2 }));
            puzzleContainer.add(line1);

            const label1 = createTextSprite("2x + 3y = 11", "#3b82f6");
            label1.position.set(2.5, ((11 - 2*6.25)/3) * 0.4 - 0.6, 0.05);
            label1.scale.set(2.0, 0.5, 1);
            puzzleContainer.add(label1);

            // Plot line 2: 2x - 4y = -24 => y = 0.5x + 6
            const points2 = [];
            for (let x = -8; x <= 8; x += 0.5) {
                const y = 0.5 * x + 6;
                points2.push(new THREE.Vector3(x * 0.4, y * 0.4 - 1.0, 0.01));
            }
            const line2Geo = new THREE.BufferGeometry().setFromPoints(points2);
            const line2 = new THREE.Line(line2Geo, new THREE.LineBasicMaterial({ color: 0xeab308, linewidth: 2 }));
            puzzleContainer.add(line2);

            const label2 = createTextSprite("2x - 4y = -24", "#eab308");
            label2.position.set(-2.5, (0.5*-6.25 + 6) * 0.4 - 0.6, 0.05);
            label2.scale.set(2.2, 0.5, 1);
            puzzleContainer.add(label2);

            // Intersect point marker at (-2, 5) => (-0.8, 1.0, 0.05)
            const markerGeo = new THREE.SphereGeometry(0.18, 16, 16);
            const markerMat = new THREE.MeshBasicMaterial({ color: 0x39ff14 });
            const marker = new THREE.Mesh(markerGeo, markerMat);
            marker.position.set(-0.8, 1.0, 0.05);
            puzzleContainer.add(marker);

            const intersectLabel = createTextSprite("Intersection Point (-2, 5)", "#39ff14");
            intersectLabel.position.set(-0.8, 1.6, 0.1);
            intersectLabel.scale.set(3.2, 0.5, 1);
            puzzleContainer.add(intersectLabel);

            // Slider horizontal guess line (stored in qCurve)
            const guessPoints = [new THREE.Vector3(-4.0, 0, 0.05), new THREE.Vector3(4.0, 0, 0.05)];
            const guessLineGeo = new THREE.BufferGeometry().setFromPoints(guessPoints);
            qCurve = new THREE.Line(guessLineGeo, new THREE.LineBasicMaterial({ color: 0xff007a, linewidth: 2 }));
            puzzleContainer.add(qCurve);

            algLengthLabel = null;
            updateAlgebraField(v.defaultVal || 3, "Linear Trajectory");
        } else if (v.name === "Balance Scales") {
            const standGeo = new THREE.CylinderGeometry(0.15, 0.2, 4, 16);
            const standMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.2 });
            const stand = new THREE.Mesh(standGeo, standMat);
            stand.position.set(0, 2, 0);
            puzzleContainer.add(stand);
            
            const beamGeo = new THREE.BoxGeometry(6, 0.15, 0.2);
            const beam = new THREE.Mesh(beamGeo, standMat);
            beam.position.set(0, 3.8, 0);
            puzzleContainer.add(beam);
            
            const leftPan = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.1, 16), standMat);
            leftPan.position.set(-3, 1, 0);
            puzzleContainer.add(leftPan);
            
            const rightPan = leftPan.clone();
            rightPan.position.set(3, 1, 0);
            puzzleContainer.add(rightPan);
            
            const leftLine = createDashedLine(new THREE.Vector3(-3, 3.8, 0), new THREE.Vector3(-3, 1, 0), new THREE.LineBasicMaterial({ color: 0xff007a }));
            const rightLine = createDashedLine(new THREE.Vector3(3, 3.8, 0), new THREE.Vector3(3, 1, 0), new THREE.LineBasicMaterial({ color: 0xff007a }));
            puzzleContainer.add(leftLine);
            puzzleContainer.add(rightLine);
            
            const boxGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
            const pinkGlowMat = new THREE.MeshBasicMaterial({ color: 0xff007a });
            for (let i = 0; i < 4; i++) {
                const box = new THREE.Mesh(boxGeo, pinkGlowMat);
                box.position.set(-3 + (i%2)*0.4 - 0.2, 1.25, (i >= 2 ? 0.2 : -0.2));
                puzzleContainer.add(box);
            }
            for (let i = 0; i < 2; i++) {
                const box = new THREE.Mesh(boxGeo, pinkGlowMat);
                box.position.set(3 + i*0.4 - 0.2, 1.25, 0);
                puzzleContainer.add(box);
            }
            
            const sphereGeo = new THREE.SphereGeometry(0.12, 8, 8);
            const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            for (let i = 0; i < 7; i++) {
                const sphere = new THREE.Mesh(sphereGeo, whiteMat);
                sphere.position.set(3 + (i%3)*0.25 - 0.25, 1.25, (i >= 3 ? 0.3 : -0.3) + Math.random()*0.05);
                puzzleContainer.add(sphere);
            }
            
            const text = createTextSprite("4x - 5 = 2x + 7", "#fff");
            text.position.set(0, 4.6, 0);
            puzzleContainer.add(text);
        } else if (v.name === "Vector Midpoint") {
            const grid = new THREE.GridHelper(10, 10, 0xff007a, 0xcccccc);
            grid.rotation.x = Math.PI / 2;
            puzzleContainer.add(grid);
            
            const ptA = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshBasicMaterial({ color: 0x39ff14 }));
            ptA.position.set(2 - 5, 4 * 0.4 - 2.5, 0);
            puzzleContainer.add(ptA);
            
            const labelA = createTextSprite("A(2, 4)", "#39ff14");
            labelA.position.copy(ptA.position).y += 0.6;
            puzzleContainer.add(labelA);
            
            const ptB = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshBasicMaterial({ color: 0x39ff14 }));
            ptB.position.set(8 - 5, 12 * 0.4 - 2.5, 0);
            puzzleContainer.add(ptB);
            
            const labelB = createTextSprite("B(8, 12)", "#39ff14");
            labelB.position.copy(ptB.position).y += 0.6;
            puzzleContainer.add(labelB);
            
            const connect = createDashedLine(ptA.position, ptB.position, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.2, gapSize: 0.1 }));
            puzzleContainer.add(connect);
            
            const ptMid = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff007a }));
            ptMid.position.set(5 - 5, 8 * 0.4 - 2.5, 0);
            puzzleContainer.add(ptMid);
            
            const labelMid = createTextSprite("Midpoint M(5, 8)", "#ff007a");
            labelMid.position.copy(ptMid.position).y += 0.6;
            puzzleContainer.add(labelMid);
        } else {
            const core = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 32), new THREE.MeshStandardMaterial({ color: 0xff007a, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.6 }));
            core.position.set(0, 2, 0);
            puzzleContainer.add(core);
            
            const ringGeo = new THREE.RingGeometry(1.8, 1.9, 32);
            const ringMat = new THREE.MeshBasicMaterial({ color: 0xbd00ff, side: THREE.DoubleSide });
            const ring1 = new THREE.Mesh(ringGeo, ringMat);
            ring1.position.set(0, 2, 0);
            puzzleContainer.add(ring1);
            
            const ring2 = ring1.clone();
            ring2.rotation.x = Math.PI / 2;
            puzzleContainer.add(ring2);
            
            let problemText = "MATH VAULT CORE";
            if (v.problem.includes("sequence")) problemText = "3, 7, 11, 15, x";
            else if (v.problem.includes("2(x")) problemText = "2(x + 3) = 24";
            else if (v.problem.includes("fraction")) problemText = "x/3 + 4 = 12";
            else if (v.problem.includes("consecutive")) problemText = "(n-1) + n + (n+1) = 45";
            
            const textSprite = createTextSprite(problemText, "#fff");
            textSprite.position.set(0, 4.5, 0);
            puzzleContainer.add(textSprite);
        }
    }

    function setupGeometryPuzzle(v) {
        const shapeMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.1,
            metalness: 0.3
        });
        
        const r = v.r || 3;
        const h = v.h || 10;
        const s = v.s || 6;
        
        let geom;
        if (v.geomType === 'cylinder' || v.geomType === 'cylinder_area') {
            geom = new THREE.CylinderGeometry(r * 0.4, r * 0.4, h * 0.4, 32);
        } else if (v.geomType === 'box') {
            const l = v.l || 5;
            const w = v.w || 4;
            geom = new THREE.BoxGeometry(l * 0.4, h * 0.4, w * 0.4);
        } else if (v.geomType === 'sphere') {
            geom = new THREE.SphereGeometry(r * 0.6, 32, 32);
        } else if (v.geomType === 'cone') {
            geom = new THREE.ConeGeometry(r * 0.5, h * 0.4, 32);
        } else if (v.geomType === 'cube') {
            geom = new THREE.BoxGeometry(s * 0.5, s * 0.5, s * 0.5);
        }
        
        geomShapeMesh = new THREE.Mesh(geom, shapeMat);
        geomShapeMesh.position.set(0, 2, 0);
        puzzleContainer.add(geomShapeMesh);
        
        const edges = new THREE.EdgesGeometry(geom);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff007a }));
        geomShapeMesh.add(line);
        
        geomLabelsGroup = new THREE.Group();
        puzzleContainer.add(geomLabelsGroup);
        
        updateGeometryLabels(v, v.defaultVal || (v.options ? v.options[0] : 8));
    }

    function updateGeometryVisualizer(v, currentValue) {
        if (!geomShapeMesh) return;
        const scaleVal = currentValue / v.ans;
        if (v.geomType === 'box') {
            geomShapeMesh.scale.set(1.0, scaleVal, 1.0);
        } else if (v.geomType === 'sphere') {
            geomShapeMesh.scale.setScalar(scaleVal);
        } else if (v.geomType === 'cone') {
            geomShapeMesh.scale.set(scaleVal, scaleVal, scaleVal);
        } else if (v.geomType === 'cube') {
            geomShapeMesh.scale.setScalar(scaleVal);
        } else {
            geomShapeMesh.scale.set(scaleVal, scaleVal, scaleVal);
        }
        
        updateGeometryLabels(v, currentValue);
    }

    function updateGeometryLabels(v, currentValue) {
        if (geomLabelsGroup) {
            while(geomLabelsGroup.children.length > 0) {
                const child = geomLabelsGroup.children[0];
                geomLabelsGroup.remove(child);
                if (child.material) child.material.dispose();
            }
        }
        
        const type = v.geomType;
        if (type === 'cylinder' || type === 'cylinder_area') {
            const r = v.r;
            const h = v.h;
            const radLine = createDashedLine(new THREE.Vector3(0, 2, 0), new THREE.Vector3(r * 0.4, 2, 0), new THREE.LineBasicMaterial({ color: 0xff007a }));
            geomLabelsGroup.add(radLine);
            const radLabel = createTextSprite(`r = ${r}m`, "#fff");
            radLabel.position.set(r * 0.2, 2.5, 0);
            geomLabelsGroup.add(radLabel);
            
            const htLine = createDashedLine(new THREE.Vector3(-r * 0.4 - 0.5, 2 - (h * 0.2), 0), new THREE.Vector3(-r * 0.4 - 0.5, 2 + (h * 0.2), 0), new THREE.LineBasicMaterial({ color: 0xff007a }));
            geomLabelsGroup.add(htLine);
            const htLabel = createTextSprite(`h = ${h}m`, "#fff");
            htLabel.position.set(-r * 0.4 - 1.2, 2, 0);
            geomLabelsGroup.add(htLabel);
            
            const valLabel = createTextSprite(`Value = ${currentValue}`, "#ffd700");
            valLabel.position.set(0, 2 + h * 0.2 + 1.2, 0);
            geomLabelsGroup.add(valLabel);
        } else if (type === 'box') {
            const l = v.l;
            const w = v.w;
            const valLabel = createTextSprite(`l = ${l}m, w = ${w}m, h = ${currentValue}m`, "#fff");
            valLabel.position.set(0, 4.5, 0);
            geomLabelsGroup.add(valLabel);
        } else if (type === 'sphere') {
            const r = v.r;
            const radLine = createDashedLine(new THREE.Vector3(0, 2, 0), new THREE.Vector3(r * 0.6, 2, 0), new THREE.LineBasicMaterial({ color: 0xff007a }));
            geomLabelsGroup.add(radLine);
            const radLabel = createTextSprite(`r = ${r}m`, "#fff");
            radLabel.position.set(r * 0.3, 2.5, 0);
            geomLabelsGroup.add(radLabel);
            
            const valLabel = createTextSprite(`Value = ${currentValue}`, "#ffd700");
            valLabel.position.set(0, 4.5, 0);
            geomLabelsGroup.add(valLabel);
        } else if (type === 'cone') {
            const r = v.r;
            const h = v.h;
            const radLine = createDashedLine(new THREE.Vector3(0, 2 - (h * 0.2), 0), new THREE.Vector3(r * 0.5, 2 - (h * 0.2), 0), new THREE.LineBasicMaterial({ color: 0xff007a }));
            geomLabelsGroup.add(radLine);
            const radLabel = createTextSprite(`r = ${r}m`, "#fff");
            radLabel.position.set(r * 0.25, 2.2 - (h * 0.2), 0);
            geomLabelsGroup.add(radLabel);
            
            const htLine = createDashedLine(new THREE.Vector3(0, 2 - (h * 0.2), 0), new THREE.Vector3(0, 2 + (h * 0.2), 0), new THREE.LineBasicMaterial({ color: 0xff007a }));
            geomLabelsGroup.add(htLine);
            const htLabel = createTextSprite(`h = ${h}m`, "#fff");
            htLabel.position.set(-0.8, 2, 0);
            geomLabelsGroup.add(htLabel);
            
            const valLabel = createTextSprite(`Value = ${currentValue}`, "#ffd700");
            valLabel.position.set(0, 4.5, 0);
            geomLabelsGroup.add(valLabel);
        } else if (type === 'cube') {
            const valLabel = createTextSprite(`Edge Length = ${currentValue}m`, "#fff");
            valLabel.position.set(0, 4.5, 0);
            geomLabelsGroup.add(valLabel);
        }
    }

    function setupQuadraticsPuzzle(v) {
        if (v.name === "Rooftop Projectile") {
            const roofGeo = new THREE.BoxGeometry(4, 3, 4);
            const roofMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.2 });
            const rooftop = new THREE.Mesh(roofGeo, roofMat);
            rooftop.position.set(-4, 1.5, 0);
            puzzleContainer.add(rooftop);

            const grid = new THREE.GridHelper(16, 16, 0xff007a, 0xcccccc);
            grid.position.set(0, 4, 0);
            puzzleContainer.add(grid);
            
            const ground = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 1), new THREE.MeshStandardMaterial({ color: 0xdddddd }));
            ground.position.set(0, 0, 0);
            puzzleContainer.add(ground);

            const ballGeo = new THREE.SphereGeometry(0.3, 16, 16);
            const ballMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
            qBall = new THREE.Mesh(ballGeo, ballMat);
            qBall.position.set(-4, 3.1, 0);
            puzzleContainer.add(qBall);

            createRootMarker(1, 0, 0, 5);
            createRootMarker(-5, 0, 0, -1);

            const formulaText = createTextSprite("h = -5t² + 20t + 25", "#39ff14");
            formulaText.position.set(0, 7, 0);
            puzzleContainer.add(formulaText);
        } else {
            const grid = new THREE.GridHelper(16, 16, 0xff007a, 0xcccccc);
            puzzleContainer.add(grid);
            
            const curvePoints = [];
            const isBridge = v.name === "Bridge Arch";
            
            for (let t = -6; t <= 10; t += 0.5) {
                let h;
                if (isBridge) {
                    const x = t + 4;
                    h = -x*x + 8*x;
                } else if (v.name === "Ground Roots") {
                    h = t*t - 9*t + 20;
                } else if (v.name === "Arch Intersection") {
                    h = (t+2) * (t-7);
                } else {
                    const x = t + 4;
                    h = -x*x + 10*x - 9;
                }
                curvePoints.push(new THREE.Vector3(t, h * 0.15, 0));
            }
            const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
            const curve = new THREE.Line(curveGeo, new THREE.LineBasicMaterial({ color: 0xffd700, linewidth: 2 }));
            puzzleContainer.add(curve);
            
            if (isBridge) {
                const vertexMarker = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshBasicMaterial({ color: 0x39ff14 }));
                vertexMarker.position.set(0, 16 * 0.15, 0);
                puzzleContainer.add(vertexMarker);
                const label = createTextSprite("Vertex Max Height", "#39ff14");
                label.position.set(0, 16 * 0.15 + 0.8, 0);
                puzzleContainer.add(label);
            } else {
                if (v.ans) {
                    const visualAnsX = v.name === "Core Vertex" ? 5 - 4 : v.ans - 4;
                    const visualAnsY = v.name === "Core Vertex" ? 16 * 0.15 : 0;
                    const ansMarker = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshBasicMaterial({ color: 0x39ff14, wireframe: true }));
                    ansMarker.position.set(visualAnsX, visualAnsY, 0);
                    puzzleContainer.add(ansMarker);
                    
                    const label = createTextSprite(v.name === "Core Vertex" ? "Vertex" : `Root: x=${v.ans}`, "#39ff14");
                    label.position.set(visualAnsX, visualAnsY + 0.8, 0);
                    puzzleContainer.add(label);
                }
            }
        }
    }

    function setupTrigPuzzle(v) {
        if (v.name === "Lighthouse Range") {
            const ocean = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.8 }));
            ocean.rotation.x = -Math.PI / 2;
            puzzleContainer.add(ocean);

            const lhGroup = new THREE.Group();
            lhGroup.position.set(-5, 0, 0);
            
            const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 5, 12), new THREE.MeshStandardMaterial({ color: 0xbac1cb }));
            base.position.y = 2.5;
            lhGroup.add(base);

            const lightCab = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.0, 12), new THREE.MeshStandardMaterial({ color: 0x222 }));
            lightCab.position.y = 5.5;
            lhGroup.add(lightCab);

            const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff007a }));
            beacon.position.y = 5.5;
            lhGroup.add(beacon);
            
            const htLabel = createTextSprite("Height = 40m", "#ff007a");
            htLabel.position.set(-6.5, 3.0, 0);
            puzzleContainer.add(htLabel);

            puzzleContainer.add(lhGroup);

            tBoat = new THREE.Group();
            const hull = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.8), new THREE.MeshStandardMaterial({ color: 0xc45200 }));
            tBoat.add(hull);
            
            const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.6), new THREE.MeshStandardMaterial({ color: 0xbac1cb }));
            cabin.position.set(-0.3, 0.4, 0);
            tBoat.add(cabin);
            
            tBoat.position.set(3, 0.2, 0);
            puzzleContainer.add(tBoat);

            const laserMat = new THREE.LineBasicMaterial({ color: 0xff007a, linewidth: 2 });
            const laserPoints = [new THREE.Vector3(-5, 5.5, 0), new THREE.Vector3(3, 0.2, 0)];
            tLaser = new THREE.Line(new THREE.BufferGeometry().setFromPoints(laserPoints), laserMat);
            puzzleContainer.add(tLaser);

            const lineMat = new THREE.LineDashedMaterial({ color: 0x777, dashSize: 0.3, gapSize: 0.2 });
            tHeightLine = createDashedLine(new THREE.Vector3(-5, 5.5, 0), new THREE.Vector3(-5, 0.2, 0), lineMat);
            tBaseLine = createDashedLine(new THREE.Vector3(-5, 0.2, 0), new THREE.Vector3(3, 0.2, 0), lineMat);
            tHypotLine = createDashedLine(new THREE.Vector3(-5, 5.5, 0), new THREE.Vector3(3, 0.2, 0), lineMat);
            
            puzzleContainer.add(tHeightLine);
            puzzleContainer.add(tBaseLine);
            puzzleContainer.add(tHypotLine);

            updateTrigScene(v.defaultVal || 30);
        } else if (v.name === "Wall Support") {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.0, 4.0), new THREE.MeshStandardMaterial({ color: 0x475569 }));
            wall.position.set(-3.0, 3.0, 0);
            puzzleContainer.add(wall);
            
            const floor = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.2, 4.0), new THREE.MeshStandardMaterial({ color: 0x94a3b8 }));
            floor.position.set(0, 0, 0);
            puzzleContainer.add(floor);
            
            const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.2, 7.0, 1.2), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
            ladder.position.set(-0.5, 3.0, 0);
            ladder.rotation.z = -Math.PI / 6;
            puzzleContainer.add(ladder);
            
            const ladderLabel = createTextSprite("Ladder = 10m", "#fff");
            ladderLabel.position.set(-0.5, 6.8, 0);
            puzzleContainer.add(ladderLabel);
            
            const angleLabel = createTextSprite("60°", "#ffd700");
            angleLabel.position.set(1.5, 0.8, 0);
            puzzleContainer.add(angleLabel);
        } else if (v.name === "Solar Shadows") {
            const building = new THREE.Mesh(new THREE.BoxGeometry(3.0, 6.0, 3.0), new THREE.MeshStandardMaterial({ color: 0x475569 }));
            building.position.set(-3, 3.0, 0);
            puzzleContainer.add(building);
            
            const shadow = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.05, 2.0), new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.6 }));
            shadow.position.set(1.5, 0.03, 0);
            puzzleContainer.add(shadow);
            
            const label = createTextSprite("Shadow = 15m", "#ffd700");
            label.position.set(1.5, 0.8, 0);
            puzzleContainer.add(label);
            
            const elevLabel = createTextSprite("Elevation = 45°", "#fff");
            elevLabel.position.set(4.5, 1.5, 0);
            puzzleContainer.add(elevLabel);
        } else if (v.name === "Grid Triangulation") {
            const triangleGeo = new THREE.BufferGeometry();
            const vertices = new Float32Array([
                -3.0, 0.0, 0.0,
                 3.0, 0.0, 0.0,
                -3.0, 4.0, 0.0
            ]);
            triangleGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            triangleGeo.setIndex([0, 1, 2]);
            const triangleMat = new THREE.MeshStandardMaterial({ color: 0xff007a, side: THREE.DoubleSide, roughness: 0.2 });
            const triangleMesh = new THREE.Mesh(triangleGeo, triangleMat);
            puzzleContainer.add(triangleMesh);
            
            const outline = new THREE.LineSegments(new THREE.EdgesGeometry(triangleGeo), new THREE.LineBasicMaterial({ color: 0xffffff }));
            triangleMesh.add(outline);
            
            const leg1Label = createTextSprite("5m", "#fff");
            leg1Label.position.set(-3.8, 2.0, 0);
            puzzleContainer.add(leg1Label);
            
            const leg2Label = createTextSprite("12m", "#fff");
            leg2Label.position.set(0.0, -0.6, 0);
            puzzleContainer.add(leg2Label);
            
            const hypLabel = createTextSprite("c = ?", "#ffd700");
            hypLabel.position.set(0.8, 2.4, 0);
            puzzleContainer.add(hypLabel);
        } else if (v.name === "Power Grid Vectors" || v.name === "3D Grid Vector") {
            const grid = new THREE.GridHelper(10, 10, 0xff007a, 0xcccccc);
            puzzleContainer.add(grid);
            
            if (v.name === "Power Grid Vectors") {
                const dirA = new THREE.Vector3(3, 0, 4).normalize();
                const origin = new THREE.Vector3(0, 0.1, 0);
                const arrowA = new THREE.ArrowHelper(dirA, origin, 5, 0xff007a);
                puzzleContainer.add(arrowA);
                
                const dirB = new THREE.Vector3(2, 0, -1).normalize();
                const arrowB = new THREE.ArrowHelper(dirB, origin, Math.sqrt(5), 0xbd00ff);
                puzzleContainer.add(arrowB);
                
                const labelA = createTextSprite("A = (3, 4)", "#ff007a");
                labelA.position.set(3, 1, 4);
                puzzleContainer.add(labelA);
                
                const labelB = createTextSprite("B = (2, -1)", "#bd00ff");
                labelB.position.set(2, 1, -1);
                puzzleContainer.add(labelB);
            } else {
                const dir = new THREE.Vector3(3, 12 * 0.3, 4).normalize();
                const origin = new THREE.Vector3(0, 0.1, 0);
                const arrow = new THREE.ArrowHelper(dir, origin, 6, 0xff007a);
                puzzleContainer.add(arrow);
                
                const label = createTextSprite("A = (3, 4, 12)", "#ff007a");
                label.position.set(3, 4, 4);
                puzzleContainer.add(label);
            }
        }
    }

    function setupLogicPuzzle(v) {
        const base = new THREE.Mesh(new THREE.BoxGeometry(7, 0.2, 4), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 }));
        base.position.set(0, 0, 0);
        puzzleContainer.add(base);
        
        const inputAVal = v.problem.includes("A = 1") || v.problem.includes("A = 1") ? 1 : 0;
        const inputBVal = v.problem.includes("B = 1") ? 1 : 0;
        
        const wireA = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5), new THREE.MeshBasicMaterial({ color: inputAVal ? 0x39ff14 : 0xef4444 }));
        wireA.rotation.z = Math.PI / 2;
        wireA.position.set(-2, 0.25, -1.0);
        puzzleContainer.add(wireA);
        
        const wireB = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.5), new THREE.MeshBasicMaterial({ color: inputBVal ? 0x39ff14 : 0xef4444 }));
        wireB.rotation.z = Math.PI / 2;
        wireB.position.set(-2, 0.25, 1.0);
        puzzleContainer.add(wireB);
        
        const labelA = createTextSprite(`A = ${inputAVal}`, inputAVal ? "#39ff14" : "#ef4444");
        labelA.position.set(-3.5, 0.8, -1.0);
        puzzleContainer.add(labelA);
        
        const labelB = createTextSprite(`B = ${inputBVal}`, inputBVal ? "#39ff14" : "#ef4444");
        labelB.position.set(-3.5, 0.8, 1.0);
        puzzleContainer.add(labelB);
        
        let gateColor = 0xa855f7;
        const gateGeo = new THREE.BoxGeometry(2.0, 1.0, 2.6);
        const gateMat = new THREE.MeshStandardMaterial({ color: gateColor, roughness: 0.1, metalness: 0.5 });
        const gate = new THREE.Mesh(gateGeo, gateMat);
        gate.position.set(0.5, 0.6, 0);
        puzzleContainer.add(gate);
        
        const edges = new THREE.EdgesGeometry(gateGeo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff }));
        gate.add(line);
        
        let gateName = "GATE";
        if (v.problem.toLowerCase().includes("or")) gateName = "OR";
        if (v.problem.toLowerCase().includes("and")) gateName = "AND";
        if (v.problem.toLowerCase().includes("xor")) gateName = "XOR";
        if (v.problem.toLowerCase().includes("nand")) gateName = "NAND";
        if (v.problem.toLowerCase().includes("nor")) gateName = "NOR";
        
        const gateLabel = createTextSprite(gateName, "#fff");
        gateLabel.position.set(0.5, 1.4, 0);
        puzzleContainer.add(gateLabel);
        
        const outWire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.0), new THREE.MeshBasicMaterial({ color: 0x64748b }));
        outWire.rotation.z = Math.PI / 2;
        outWire.position.set(2.5, 0.25, 0);
        puzzleContainer.add(outWire);
        
        const outLabel = createTextSprite("Y = ?", "#ffd700");
        outLabel.position.set(3.5, 0.8, 0);
        puzzleContainer.add(outLabel);
    }

    function updateVisualizer(vaultId, value) {
        const v = currentLevelVaults.find(vault => vault.id === vaultId);
        if (!v) return;
        
        if (v.type === 'algebra') {
            if (v.name === "Farmer's Field" || v.name === "Rooftop Projectile" || v.name === "Linear Trajectory") {
                updateAlgebraField(value, v.name);
            } else {
                updateAlgebraField(value);
            }
        } else if (v.type === 'trig') {
            if (!v.options) {
                updateTrigScene(value);
            }
        } else if (v.type === 'geometry') {
            updateGeometryVisualizer(v, value);
        }
    }

    function updateAlgebraField(gVal, name = "") {
        if (!algFieldMesh) return;
        
        if (name === "Farmer's Field") {
            while(algFieldMesh.children.length > 0) {
                const child = algFieldMesh.children[0];
                algFieldMesh.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            }
            
            const scale = 8 / 225;
            const gScaled = gVal * scale;
            
            const cols = Math.ceil(8 / gScaled);
            const rows = Math.ceil(4.8 / gScaled);
            
            const lineMat = new THREE.LineBasicMaterial({
                color: (gVal === 45) ? 0x39ff14 : 0xef4444,
                linewidth: 2
            });
            
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const w = Math.min(gScaled, 8 - c * gScaled);
                    const h = Math.min(gScaled, 4.8 - r * gScaled);
                    
                    const boxGeo = new THREE.BoxGeometry(w, 0.05, h);
                    const edges = new THREE.EdgesGeometry(boxGeo);
                    const outline = new THREE.LineSegments(edges, lineMat);
                    outline.position.set(-4 + c * gScaled + w/2, 0.35, -2.4 + r * gScaled + h/2);
                    algFieldMesh.add(outline);
                }
            }
            
            if (algWidthLabel) {
                puzzleContainer.remove(algWidthLabel);
                algWidthLabel.material.dispose();
            }
            
            const tilesX = Math.floor(225 / gVal);
            const remX = 225 % gVal;
            const tilesZ = Math.floor(135 / gVal);
            const remZ = 135 % gVal;
            
            const statusText = `Guess: ${gVal}m | Horiz: ${tilesX} tiles (rem ${remX}m) | Vert: ${tilesZ} tiles (rem ${remZ}m)`;
            algWidthLabel = createTextSprite(statusText, (gVal === 45) ? "#39ff14" : "#ff007a");
            algWidthLabel.position.set(0, -1.8, 3.2);
            algWidthLabel.scale.set(4.5, 0.8, 1);
            puzzleContainer.add(algWidthLabel);
        } else if (name === "Rooftop Projectile") {
            if (!qBall) return;
            const h = gVal * 0.1;
            qBall.scale.y = h;
            qBall.position.y = h / 2;

            if (algLengthLabel) {
                puzzleContainer.remove(algLengthLabel);
                algLengthLabel.material.dispose();
            }
            algLengthLabel = createTextSprite(`a10 = ${gVal}`, (gVal === 47) ? "#39ff14" : "#ff007a");
            algLengthLabel.position.set(4.5, h + 0.5, 0);
            algLengthLabel.scale.set(1.5, 0.4, 1);
            puzzleContainer.add(algLengthLabel);
        } else if (name === "Linear Trajectory") {
            if (!qCurve) return;
            const yScaled = gVal * 0.4 - 1.0;
            qCurve.position.y = yScaled;

            if (algLengthLabel) {
                puzzleContainer.remove(algLengthLabel);
                algLengthLabel.material.dispose();
            }
            algLengthLabel = createTextSprite(`y = ${gVal}`, (gVal === 5) ? "#39ff14" : "#ff007a");
            algLengthLabel.position.set(0, yScaled + 0.4, 0);
            algLengthLabel.scale.set(1.5, 0.4, 1);
            puzzleContainer.add(algLengthLabel);
        } else {
            while(algFieldMesh.children.length > 0) {
                const child = algFieldMesh.children[0];
                algFieldMesh.remove(child);
                child.geometry.dispose();
                child.material.dispose();
            }

            const height = 0.5;
            const thickness = 0.15;
            const l = 2 * gVal + 3;

            const scale = 3.5 / 8;
            const visualW = gVal * scale;
            const visualL = l * scale;

            const fenceMat = new THREE.MeshStandardMaterial({ color: 0x826437, roughness: 0.8 });
            
            const leftFence = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, visualW), fenceMat);
            leftFence.position.set(-visualL / 2, height / 2, 0);
            algFieldMesh.add(leftFence);

            const rightFence = new THREE.Mesh(new THREE.BoxGeometry(thickness, height, visualW), fenceMat);
            rightFence.position.set(visualL / 2, height / 2, 0);
            algFieldMesh.add(rightFence);

            const topFence = new THREE.Mesh(new THREE.BoxGeometry(visualL, height, thickness), fenceMat);
            topFence.position.set(0, height / 2, -visualW / 2);
            algFieldMesh.add(topFence);

            const bottomFence = new THREE.Mesh(new THREE.BoxGeometry(visualL, height, thickness), fenceMat);
            bottomFence.position.set(0, height / 2, visualW / 2);
            algFieldMesh.add(bottomFence);

            if (algWidthLabel) algWidthLabel.position.set(-visualL / 2 - 0.8, 0.5, 0);
            if (algLengthLabel) algLengthLabel.position.set(0, 0.5, visualW / 2 + 0.8);
        }
    }

    function createRootMarker(x, y, z, value) {
        const marker = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshBasicMaterial({ color: 0x39ff14, wireframe: true }));
        marker.position.set(x, y, z);
        
        const label = createTextSprite(`t=${value}s`, "#39ff14");
        label.position.set(x, y + 0.8, z);
        
        puzzleContainer.add(marker);
        puzzleContainer.add(label);
    }

    function triggerParabolaAnimation() {
        if (qThrowing) return;
        qThrowing = true;

        qBall.position.set(-4, 5.0 + 0.3, 0);
        if (qCurve) puzzleContainer.remove(qCurve);

        const curvePoints = [];
        const totalDuration = 5.0;
        
        const trajectoryData = { t: 0 };
        new TWEEN.Tween(trajectoryData)
            .to({ t: totalDuration }, 2000)
            .easing(TWEEN.Easing.Quadratic.Out)
            .onUpdate(() => {
                const t = trajectoryData.t;
                const h = -5 * t * t + 20 * t + 25;
                const visualX = t - 4;
                const visualY = h * 0.18;
                
                qBall.position.set(visualX, visualY + 0.3, 0);
                curvePoints.push(new THREE.Vector3(visualX, visualY, 0));
                
                if (qCurve) puzzleContainer.remove(qCurve);
                const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
                qCurve = new THREE.Line(curveGeo, new THREE.LineBasicMaterial({ color: 0xffd700, linewidth: 2 }));
                puzzleContainer.add(qCurve);
            })
            .onComplete(() => {
                qThrowing = false;
                Particles.spawnSparks(new THREE.Vector3(1, 0, 0), 0x39ff14, 12);
                Sound.playExplosion();
            })
            .start();
    }

    function createDashedLine(p1, p2, material) {
        const geo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const line = new THREE.Line(geo, material);
        line.computeLineDistances();
        return line;
    }

    function updateTrigScene(distanceVal) {
        const visualX = -5 + (distanceVal * 0.12);
        
        if (tBoat) tBoat.position.x = visualX;

        if (tLaser) {
            const positions = tLaser.geometry.attributes.position.array;
            positions[3] = visualX;
            positions[4] = 0.2;
            positions[5] = 0;
            tLaser.geometry.attributes.position.needsUpdate = true;
        }

        if (tBaseLine) {
            puzzleContainer.remove(tBaseLine);
            tBaseLine = createDashedLine(new THREE.Vector3(-5, 0.2, 0), new THREE.Vector3(visualX, 0.2, 0), new THREE.LineDashedMaterial({ color: 0x777, dashSize: 0.3, gapSize: 0.2 }));
            puzzleContainer.add(tBaseLine);
        }
        if (tHypotLine) {
            puzzleContainer.remove(tHypotLine);
            tHypotLine = createDashedLine(new THREE.Vector3(-5, 5.5, 0), new THREE.Vector3(visualX, 0.2, 0), new THREE.LineDashedMaterial({ color: 0x777, dashSize: 0.3, gapSize: 0.2 }));
            puzzleContainer.add(tHypotLine);
        }
    }

    function rebuildZeroGScene(assembledTiles) {
        if (!puzzleContainer) return;
        // Clean old sprite
        for (let i = puzzleContainer.children.length - 1; i >= 0; i--) {
            const child = puzzleContainer.children[i];
            if (child.isSprite) {
                puzzleContainer.remove(child);
                child.material.dispose();
            }
        }
        const text = assembledTiles.join(' ') || "...";
        const sprite3D = createTextSprite(text, "#00f0ff");
        sprite3D.scale.set(4.5, 1.1, 1);
        sprite3D.position.set(0, 0, 0);
        puzzleContainer.add(sprite3D);
    }

    function markVaultUnlocked(vaultId) {
        const v = activeVaults.find(vault => vault.id === vaultId);
        if (v) {
            v.unlocked = true;
            Particles.spawnGoldExplosion(v.position, 35);
            if (v.light) {
                v.light.color.setHex(0x39ff14);
            }
            if (v.sprite && v.mesh.children.includes(v.sprite)) {
                v.mesh.remove(v.sprite);
            }
        }
    }

    function update(deltaTime) {
        const time = performance.now() * 0.0015;
        
        activeVaults.forEach(v => {
            if (v.mixer) {
                v.mixer.update(deltaTime);
            }

            // Animate chest opening if opened or unlocked
            if (v.opened || v.unlocked) {
                if (v.openAction && !v.animPlayingOpen) {
                    v.animPlayingOpen = true;
                    if (v.closeAction) v.closeAction.stop();
                    v.openAction.reset().play();
                }
            } else {
                if (v.closeAction && !v.animPlayingClose && v.animPlayingOpen) {
                    v.animPlayingClose = true;
                    v.animPlayingOpen = false;
                    if (v.openAction) v.openAction.stop();
                    v.closeAction.reset().play();
                }
            }

            if (!v.unlocked) {
                let groundY = 0;
                const lvl = LEVELS[currentLevelIdx - 1] || LEVELS[0];
                if (lvl && lvl.modelPath) {
                    groundY = getGroundHeight(v.position.x, v.position.z);
                }
                if (v.id === 3) {
                    v.mesh.position.y = groundY + 18.5 + Math.sin(time) * 0.15;
                } else {
                    v.mesh.position.y = groundY + 0.8 + Math.sin(time) * 0.1;
                }
                if (!v.opened) {
                    v.mesh.rotation.y += 0.01;
                }
            }
        });
    }

    function clearAll() {
        activeVaults.forEach(v => {
            if (sceneRef && v.mesh) {
                sceneRef.remove(v.mesh);
            }
        });
        activeVaults.length = 0;
        cachedEnvironmentModel = null;
    }

    return {
        init,
        getNearbyVault,
        getNearestUndecryptedVault,
        update,
        clearAll,
        setupPuzzleCanvas,
        updateAlgebraField,
        triggerParabolaAnimation,
        updateTrigScene,
        rebuildZeroGScene,
        markVaultUnlocked,
        updateVisualizer,
        getActiveVaults: () => activeVaults
    };
})();

export default Vaults;
