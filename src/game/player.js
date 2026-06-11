/**
 * Player controller module managing controls, physics binding, weapon (SMG + Hands), and stats
 */
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import * as CANNON from 'cannon-es';
import TWEEN from '@tweenjs/tween.js';
import Physics from './physics';
import Particles from './particles';
import { Sound } from './sound';
import Enemies from './enemies';

const Player = (() => {
    let cameraRef;
    let controls;
    let body;
    
    // Movement state
    const keys = { w: false, a: false, s: false, d: false };
    const moveSpeed = 8.5;
    const jumpVelocity = 7.0;
    let canJump = false;
    let walkTime = 0;
    
    // Stats & Inventory
    let hp = 100;
    let score = 0;
    let orbCount = 0;
    let keyCount = 0;
    let isGravityInverted = false;
    let antiGravDuration = 0.0;
    const maxAntiGravDuration = 30.0;
    
    // SMG Gun Viewmodel
    let gunGroup;
    let muzzleFlash;
    let muzzleLight;
    const defaultGunPos = new THREE.Vector3(0.35, -0.35, -0.7);
    const prevCamRotation = new THREE.Euler();
    
    // Shooting
    const bullets = [];
    const bulletSpeed = 60;
    let lastShotTime = 0;
    const shotCooldown = 130; // Rapid fire
    
    // UI Callbacks
    let callbacks = {
        onHPChange: () => {},
        onScoreChange: () => {},
        onOrbsChange: () => {},
        onKeysChange: () => {},
        onGravityChange: () => {},
        onNotification: () => {},
        onGameOver: () => {},
        onVictory: () => {}
    };
    
    function init(camera, initialPosition, uiCallbacks) {
        cameraRef = camera;
        callbacks = { ...callbacks, ...uiCallbacks };
        
        // Reset player variables
        hp = 100;
        score = 0;
        orbCount = 0;
        keyCount = 0;
        isGravityInverted = false;
        antiGravDuration = 0;
        
        callbacks.onKeysChange(keyCount);
        
        // 1. Create Cannon.js physical body for player (a sphere)
        const radius = 1.0;
        body = Physics.createSphere(
            initialPosition.x, 
            initialPosition.y, 
            initialPosition.z, 
            radius, 
            75 // Mass (kg)
        );
        body.linearDamping = 0.55;
        body.angularDamping = 1.0;
        body.fixedRotation = true;
        body.collisionFilterGroup = 4;
        body.collisionFilterMask = -1;
        body.updateMassProperties();
        
        // Floor contact detections
        body.addEventListener("collide", (e) => {
            const contactNormal = new CANNON.Vec3();
            if (e.contact.bi.id === body.id) {
                e.contact.ni.negate(contactNormal);
            } else {
                contactNormal.copy(e.contact.ni);
            }
            
            if (!isGravityInverted && contactNormal.y > 0.5) {
                canJump = true;
            } else if (isGravityInverted && contactNormal.y < -0.5) {
                canJump = true;
            }
        });
        
        // 2. Setup Pointer Lock Controls
        controls = new PointerLockControls(cameraRef, document.body);
        
        controls.addEventListener('lock', () => {
            callbacks.onNotification("STATION ACTIVE");
        });
        
        // Create the high-graphics 3D robotic hands and SMG weapon model
        createRoboticHandsAndSMG();
        prevCamRotation.copy(cameraRef.rotation);

        // 3. Register Key listeners
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('mousedown', onMouseDown);
    }

    function setCallbacks(uiCallbacks) {
        callbacks = { ...callbacks, ...uiCallbacks };
    }

    /**
     * Procedurally constructs highly detailed 3D cybernetic arms and Sci-Fi SMG model
     */
    function createRoboticHandsAndSMG() {
        gunGroup = new THREE.Group();
        gunGroup.position.copy(defaultGunPos);
        cameraRef.add(gunGroup);

        const metalChrome = new THREE.MeshStandardMaterial({
            color: 0x8a95a5,
            metalness: 0.95,
            roughness: 0.05
        });
        const emissivePink = new THREE.MeshBasicMaterial({
            color: 0xff007a,
            toneMapped: false
        });

        // Helper to construct fully detailed, articulated mechanical hands
        function createDetailedHand(armGroup, wristOffset, isLeft) {
            const handGroup = new THREE.Group();
            handGroup.position.copy(wristOffset);
            
            // Adjust hand rotation to look natural gripping the weapon
            if (isLeft) {
                handGroup.rotation.set(0.1, -0.4, 0.2);
            } else {
                handGroup.rotation.set(0.2, 0.3, -0.1);
            }
            armGroup.add(handGroup);

            const carbonWhite = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                metalness: 0.2,
                roughness: 0.1
            });

            // Palm base
            const palmGeo = new THREE.BoxGeometry(0.065, 0.02, 0.075);
            const palm = new THREE.Mesh(palmGeo, carbonWhite);
            palm.castShadow = true;
            handGroup.add(palm);

            // 5 detailed fingers (Thumb, Index, Middle, Ring, Pinky)
            const fingerAngles = isLeft ? [0.6, 0.1, 0, -0.1, -0.3] : [-0.6, -0.1, 0, 0.1, 0.3];
            const fingerSpread = isLeft ? [0.015, 0.008, 0, -0.008, -0.015] : [-0.015, -0.008, 0, 0.008, 0.015];
            const fingerNames = ['thumb', 'index', 'middle', 'ring', 'pinky'];

            fingerNames.forEach((name, i) => {
                const fGroup = new THREE.Group();
                const isThumb = name === 'thumb';
                const fZ = isThumb ? 0.01 : -0.038;
                const fX = isThumb ? (isLeft ? 0.032 : -0.032) : fingerSpread[i];
                
                fGroup.position.set(fX, 0.005, fZ);
                fGroup.rotation.y = fingerAngles[i];
                if (isThumb) {
                    fGroup.rotation.x = 0.2;
                    fGroup.rotation.z = isLeft ? 0.4 : -0.4;
                } else {
                    fGroup.rotation.x = -0.55; // curled grip pose
                }
                handGroup.add(fGroup);

                // Knuckle joint (glowing pink connector)
                const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 8), emissivePink);
                fGroup.add(knuckle);

                // Proximal segment
                const seg1Len = isThumb ? 0.018 : (name === 'middle' ? 0.026 : 0.022);
                const phalanx1 = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.006, seg1Len, 5), carbonWhite);
                phalanx1.rotation.x = Math.PI / 2;
                phalanx1.position.z = -seg1Len / 2;
                phalanx1.castShadow = true;
                fGroup.add(phalanx1);

                // Middle joint
                const midJoint = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 6), metalChrome);
                midJoint.position.z = -seg1Len;
                fGroup.add(midJoint);

                // Distal segment
                const seg2Len = seg1Len * 0.75;
                const phalanx2 = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.0045, seg2Len, 4), carbonWhite);
                phalanx2.rotation.x = Math.PI / 2;
                phalanx2.position.set(0, 0, -seg1Len - seg2Len / 2);
                phalanx2.castShadow = true;
                fGroup.add(phalanx2);

                // Tip
                const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 6, 6), emissivePink);
                tip.position.set(0, 0, -seg1Len - seg2Len);
                fGroup.add(tip);
            });
        }

        // ==================== 1. REALISTIC DOUBLE-BARREL SHOTGUN MODEL ====================
        const shotgunPivot = new THREE.Group();
        gunGroup.add(shotgunPivot);

        const woodMat = new THREE.MeshStandardMaterial({
            color: 0x5c4033, // Rich walnut wood stock
            roughness: 0.75,
            metalness: 0.1
        });
        const metalShotgun = new THREE.MeshStandardMaterial({
            color: 0x111827, // Dark slate gunmetal
            metalness: 0.9,
            roughness: 0.25
        });

        // 1a. Receiver
        const receiverGeo = new THREE.BoxGeometry(0.075, 0.095, 0.35);
        const receiver = new THREE.Mesh(receiverGeo, metalShotgun);
        receiver.position.set(0, 0, 0);
        receiver.castShadow = true;
        shotgunPivot.add(receiver);

        // 1b. Double Barrels (two cylinders side-by-side)
        const barrelGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.75, 8);
        
        const barrelL = new THREE.Mesh(barrelGeo, metalChrome);
        barrelL.rotation.x = Math.PI / 2;
        barrelL.position.set(-0.018, 0.02, -0.45);
        barrelL.castShadow = true;
        shotgunPivot.add(barrelL);

        const barrelR = new THREE.Mesh(barrelGeo, metalChrome);
        barrelR.rotation.x = Math.PI / 2;
        barrelR.position.set(0.018, 0.02, -0.45);
        barrelR.castShadow = true;
        shotgunPivot.add(barrelR);

        // Under-barrel support/magazine tube
        const tubeGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.55, 8);
        const tube = new THREE.Mesh(tubeGeo, metalShotgun);
        tube.rotation.x = Math.PI / 2;
        tube.position.set(0, -0.015, -0.35);
        tube.castShadow = true;
        shotgunPivot.add(tube);

        // 1c. Wooden Stock (slanted buttstock)
        const stockGeo = new THREE.BoxGeometry(0.065, 0.085, 0.32);
        const stock = new THREE.Mesh(stockGeo, woodMat);
        stock.position.set(0, -0.045, 0.28);
        stock.rotation.x = -Math.PI / 12;
        stock.castShadow = true;
        shotgunPivot.add(stock);

        // 1d. Forend Grip (wood slide underneath barrel)
        const forendGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.25, 8, 1, false, 0, Math.PI);
        const forend = new THREE.Mesh(forendGeo, woodMat);
        forend.rotation.x = Math.PI / 2;
        forend.rotation.y = Math.PI; // flip it down
        forend.position.set(0, -0.025, -0.25);
        forend.castShadow = true;
        shotgunPivot.add(forend);

        // Glowing trim accents (pink neon strips to match the cybernetic theme)
        const stripL = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.018, 0.2), emissivePink);
        stripL.position.set(-0.039, 0, 0);
        shotgunPivot.add(stripL);

        const stripR = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.018, 0.2), emissivePink);
        stripR.position.set(0.039, 0, 0);
        shotgunPivot.add(stripR);

        // Muzzle Flash sprite (aligned with the front of the shotgun barrels)
        const flashCanvas = document.createElement('canvas');
        flashCanvas.width = 64;
        flashCanvas.height = 64;
        const fCtx = flashCanvas.getContext('2d');
        const gradient = fCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 0, 122, 0.8)');
        gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        fCtx.fillStyle = gradient;
        fCtx.fillRect(0, 0, 64, 64);
        
        const flashTex = new THREE.CanvasTexture(flashCanvas);
        const flashMat = new THREE.SpriteMaterial({
            map: flashTex,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        muzzleFlash = new THREE.Sprite(flashMat);
        muzzleFlash.scale.set(0.45, 0.45, 1);
        muzzleFlash.position.set(0, 0.02, -0.825);
        muzzleFlash.visible = false;
        shotgunPivot.add(muzzleFlash);

        // Muzzle light (flash room pink briefly)
        muzzleLight = new THREE.PointLight(0xff007a, 0.0, 15);
        muzzleLight.position.set(0, 0.02, -0.825);
        muzzleLight.castShadow = false;
        shotgunPivot.add(muzzleLight);

        // ==================== 2. ROBOTIC FPS HANDS ====================
        const handsGroup = new THREE.Group();
        gunGroup.add(handsGroup);

        const handMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, // Polished white carbon fiber hands
            metalness: 0.2,
            roughness: 0.1
        });
        const carbonMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            metalness: 0.8,
            roughness: 0.5
        });

        // Right Arm (repositioned slightly for perfect graphics visibility)
        const rArm = new THREE.Group();
        rArm.position.set(0.12, -0.15, 0.28);
        rArm.rotation.set(-0.2, -0.1, 0.05);
        handsGroup.add(rArm);

        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.45, 8), handMat);
        forearm.rotation.x = Math.PI / 2.2;
        forearm.castShadow = true;
        rArm.add(forearm);

        const armor = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.25, 0.075), carbonMat);
        armor.position.set(0, 0, -0.05);
        armor.rotation.x = Math.PI / 2.2;
        rArm.add(armor);

        const rWrist = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), emissivePink);
        rWrist.position.set(0, 0.1, -0.18);
        rArm.add(rWrist);

        // Build Right mechanical hand
        createDetailedHand(rArm, new THREE.Vector3(0, 0.1, -0.2), false);

        // Left Arm (repositioned so it is clearly visible supporting the weapon)
        const lArm = new THREE.Group();
        lArm.position.set(-0.2, -0.08, 0.08);
        lArm.rotation.set(0.15, 0.6, -0.2);
        handsGroup.add(lArm);

        const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.45, 8), handMat);
        lForearm.rotation.x = Math.PI / 2.5;
        lForearm.castShadow = true;
        lArm.add(lForearm);

        const lArmor = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.25, 0.075), carbonMat);
        lArmor.position.set(0, 0, -0.05);
        lArmor.rotation.x = Math.PI / 2.5;
        lArm.add(lArmor);

        const lWrist = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), emissivePink);
        lWrist.position.set(0, 0.12, -0.16);
        lArm.add(lWrist);

        // Build Left mechanical hand
        createDetailedHand(lArm, new THREE.Vector3(0, 0.12, -0.18), true);
    }
    
    function onKeyDown(e) {
        if (!controls.isLocked) return;
        
        switch (e.code) {
            case 'KeyW': keys.w = true; break;
            case 'KeyS': keys.s = true; break;
            case 'KeyA': keys.a = true; break;
            case 'KeyD': keys.d = true; break;
            case 'Space':
                if (canJump) {
                    if (isGravityInverted) {
                        body.velocity.y = -jumpVelocity;
                    } else {
                        body.velocity.y = jumpVelocity;
                    }
                    canJump = false;
                    Sound.playJump();
                }
                break;
            case 'KeyG':
                activateAntiGravity();
                break;
            case 'KeyE':
                window.GameManager.interact();
                break;
        }
    }
    
    function onKeyUp(e) {
        switch (e.code) {
            case 'KeyW': keys.w = false; break;
            case 'KeyS': keys.s = false; break;
            case 'KeyA': keys.a = false; break;
            case 'KeyD': keys.d = false; break;
        }
    }
    
    function onMouseDown(e) {
        if (!controls.isLocked) return;
        if (e.button === 0) {
            shoot();
        }
    }
    
    function shoot() {
        const now = performance.now();
        if (now - lastShotTime < shotCooldown) return;
        lastShotTime = now;
        
        Sound.playShoot();
        
        // Muzzle Flash
        muzzleFlash.visible = true;
        muzzleLight.intensity = 4.0;
        muzzleFlash.rotation.z = Math.random() * Math.PI * 2;
        
        setTimeout(() => {
            muzzleFlash.visible = false;
            muzzleLight.intensity = 0.0;
        }, 40);

        // Recoil
        new TWEEN.Tween(gunGroup.position)
            .to({ 
                x: defaultGunPos.x + (Math.random() - 0.5) * 0.012,
                y: defaultGunPos.y - 0.015,
                z: defaultGunPos.z + 0.05
            }, 30)
            .yoyo(true)
            .repeat(1)
            .start();

        // Spawn bullet (pink laser)
        const bulletGeo = new THREE.SphereGeometry(0.08, 8, 8);
        const bulletMat = new THREE.MeshBasicMaterial({
            color: 0xff007a,
            toneMapped: false
        });
        const bulletMesh = new THREE.Mesh(bulletGeo, bulletMat);
        
        const tipPos = new THREE.Vector3();
        muzzleFlash.getWorldPosition(tipPos);
        bulletMesh.position.copy(tipPos);
        
        const dir = new THREE.Vector3();
        cameraRef.getWorldDirection(dir);
        dir.x += (Math.random() - 0.5) * 0.012;
        dir.y += (Math.random() - 0.5) * 0.012;
        dir.normalize();
        
        cameraRef.parent.add(bulletMesh);
        
        bullets.push({
            mesh: bulletMesh,
            velocity: dir.multiplyScalar(bulletSpeed),
            birthTime: now,
            maxLife: 1500
        });
    }
    
    function activateAntiGravity() {
        if (orbCount <= 0 && !isGravityInverted) {
            callbacks.onNotification("NO ANTI-GRAVITY ORBS LOADED!");
            return;
        }
        
        if (isGravityInverted) {
            deactivateAntiGravity();
            return;
        }
        
        orbCount--;
        callbacks.onOrbsChange(orbCount);
        
        isGravityInverted = true;
        antiGravDuration = maxAntiGravDuration;
        Physics.setGravityInverted(true);
        Sound.playGravityFlip();
        callbacks.onGravityChange(true, antiGravDuration);
        callbacks.onNotification("ANTI-GRAVITY INVERSION ENGAGED!");
    }
    
    function deactivateAntiGravity() {
        if (!isGravityInverted) return;
        isGravityInverted = false;
        antiGravDuration = 0;
        Physics.setGravityInverted(false);
        Sound.playGravityFlip();
        callbacks.onGravityChange(false, 0);
        callbacks.onNotification("NORMAL GRAVITY RESTORED");
    }
    
    function damage(amount) {
        if (hp <= 0) return;
        hp -= amount;
        if (hp < 0) hp = 0;
        
        callbacks.onHPChange(hp);
        Sound.playDamage();
        
        if (hp <= 0) {
            die();
        }
    }
    
    function heal(amount) {
        if (hp <= 0) return;
        hp = Math.min(hp + amount, 100);
        callbacks.onHPChange(hp);
        Sound.playPickup();
    }
    
    function addOrb() {
        orbCount++;
        callbacks.onOrbsChange(orbCount);
        Sound.playPickup();
        callbacks.onNotification("+1 ANTI-GRAVITY ORB ACQUIRED");
    }
    
    function addKey() {
        keyCount++;
        callbacks.onKeysChange(keyCount);
        Sound.playPickup();
        callbacks.onNotification("+1 VAULT KEY ACQUIRED");
    }
    
    function consumeKey() {
        if (keyCount > 0) {
            keyCount--;
            callbacks.onKeysChange(keyCount);
            return true;
        }
        return false;
    }
    
    function getKeyCount() {
        return keyCount;
    }
    
    function incrementScore() {
        score++;
        callbacks.onScoreChange(score);
        Sound.playUnlock();
    }
    
    function die() {
        controls.unlock();
        callbacks.onGameOver();
        Sound.playDeath();
    }
    
    
    function reset(spawnPos = null) {
        hp = 100;
        score = 0;
        orbCount = 0;
        keyCount = 0;
        isGravityInverted = false;
        antiGravDuration = 0;
        
        callbacks.onHPChange(hp);
        callbacks.onScoreChange(score);
        callbacks.onOrbsChange(orbCount);
        callbacks.onKeysChange(keyCount);
        callbacks.onGravityChange(false, 0);
        
        if (spawnPos) {
            body.position.copy(spawnPos);
        } else {
            body.position.set(0, 2, 0);
        }
        body.velocity.set(0, 0, 0);
        if (body) {
            body.collisionFilterGroup = 4;
            body.collisionFilterMask = -1;
        }
        Physics.setGravityInverted(false);

        if (cameraRef) {
            cameraRef.position.copy(body.position);
            cameraRef.position.y += 0.3;
            prevCamRotation.copy(cameraRef.rotation);
        }
    }
    
    function update(deltaTime) {
        if (isGravityInverted) {
            antiGravDuration -= deltaTime;
            if (antiGravDuration <= 0) {
                deactivateAntiGravity();
            } else {
                callbacks.onGravityChange(true, antiGravDuration);
            }
        }
        
        let deltaYaw = 0;
        let deltaPitch = 0;
        if (cameraRef) {
            deltaYaw = cameraRef.rotation.y - prevCamRotation.y;
            deltaPitch = cameraRef.rotation.x - prevCamRotation.x;
            if (deltaYaw > Math.PI) deltaYaw -= Math.PI * 2;
            if (deltaYaw < -Math.PI) deltaYaw += Math.PI * 2;
            if (deltaPitch > Math.PI) deltaPitch -= Math.PI * 2;
            if (deltaPitch < -Math.PI) deltaPitch += Math.PI * 2;
            prevCamRotation.copy(cameraRef.rotation);
        }

        if (controls.isLocked) {
            const camDirection = new THREE.Vector3();
            cameraRef.getWorldDirection(camDirection);
            
            const forward = new THREE.Vector3(camDirection.x, 0, camDirection.z).normalize();
            const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
            
            const moveVec = new THREE.Vector3(0, 0, 0);
            if (keys.w) moveVec.add(forward);
            if (keys.s) moveVec.addScaledVector(forward, -1);
            if (keys.d) moveVec.add(right);
            if (keys.a) moveVec.addScaledVector(right, -1);
            
            moveVec.normalize();
            
            body.velocity.x = moveVec.x * moveSpeed;
            body.velocity.z = moveVec.z * moveSpeed;

            const maxSway = 0.08;
            const swayX = Math.max(-maxSway, Math.min(maxSway, -deltaYaw * 0.4));
            const swayY = Math.max(-maxSway, Math.min(maxSway, deltaPitch * 0.4));
            
            const targetPos = defaultGunPos.clone();
            targetPos.x += swayX;
            targetPos.y += swayY;
            targetPos.z += Math.abs(deltaYaw + deltaPitch) * 0.12;

            const isMoving = keys.w || keys.s || keys.a || keys.d;
            if (isMoving) {
                walkTime += deltaTime * 12.0;
                const bobX = Math.sin(walkTime * 0.5) * 0.015;
                const bobY = Math.cos(walkTime) * 0.015;
                
                targetPos.x += bobX;
                targetPos.y += bobY;
                
                const targetRotZ = bobX * 0.5 - deltaYaw * 0.35;
                gunGroup.rotation.z += (targetRotZ - gunGroup.rotation.z) * 0.15;
            } else {
                const targetRotZ = -deltaYaw * 0.35;
                gunGroup.rotation.z += (targetRotZ - gunGroup.rotation.z) * 0.15;
            }

            gunGroup.position.lerp(targetPos, deltaTime * 8.0);
            
            const targetRotX = deltaPitch * 0.45;
            const targetRotY = deltaYaw * 0.45;
            gunGroup.rotation.x += (targetRotX - gunGroup.rotation.x) * 0.15;
            gunGroup.rotation.y += (targetRotY - gunGroup.rotation.y) * 0.15;
        } else {
            body.velocity.x = 0;
            body.velocity.z = 0;
            gunGroup.position.lerp(defaultGunPos, deltaTime * 5.0);
            gunGroup.rotation.x += (0 - gunGroup.rotation.x) * 0.15;
            gunGroup.rotation.y += (0 - gunGroup.rotation.y) * 0.15;
            gunGroup.rotation.z += (0 - gunGroup.rotation.z) * 0.15;
        }
        
        cameraRef.position.copy(body.position);
        if (isGravityInverted) {
            cameraRef.position.y -= 0.3;
        } else {
            cameraRef.position.y += 0.3;
        }
        
        const now = performance.now();
        
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            
            b.mesh.position.addScaledVector(b.velocity, deltaTime);
            
            let hit = false;
            
            const hitInsect = Enemies.checkBulletCollisions(b.mesh.position, 0.4);
            if (hitInsect) {
                hit = true;
                Enemies.damageEnemy(hitInsect, 15); // dealing 15 damage
                Particles.spawnSparks(b.mesh.position, 0x00f0ff, 12);
            }
            
            if (!hit) {
                const px = Math.abs(b.mesh.position.x);
                const py = b.mesh.position.y;
                const pz = Math.abs(b.mesh.position.z);
                
                if (px > 35 || py < -1 || py > 21 || pz > 35) {
                    hit = true;
                    Particles.spawnSparks(b.mesh.position, 0x8892a6, 5);
                }
            }
            
            if (hit || (now - b.birthTime > b.maxLife)) {
                cameraRef.parent.remove(b.mesh);
                b.mesh.geometry.dispose();
                b.mesh.material.dispose();
                bullets.splice(i, 1);
            }
        }
    }
    
    return {
        init,
        update,
        damage,
        heal,
        addOrb,
        addKey,
        consumeKey,
        getKeyCount,
        incrementScore,
        getControls: () => controls,
        getBody: () => body,
        getPosition: () => body.position,
        getHP: () => hp,
        getScore: () => score,
        getOrbCount: () => orbCount,
        getGravityInverted: () => isGravityInverted,
        reset,
        setCallbacks
    };
})();

export default Player;
