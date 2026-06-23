/**
 * Player controller module managing controls, physics binding, weapon (SMG + Hands), and stats
 */
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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
    
    // Hover Mouse Look State
    let isHovering = false;
    let lastMouseX = null;
    let lastMouseY = null;
    
    // Stats & Inventory
    let hp = 100;
    let score = 0;
    let orbCount = 0;
    let keyCount = 0;
    let isGravityInverted = false;
    let antiGravDuration = 0.0;
    const maxAntiGravDuration = 30.0;
    
    // Throwing Arms Viewmodel
    let gunGroup;
    let mixer;
    let throwAction;
    const defaultGunPos = new THREE.Vector3(0.12, -0.52, -0.4);
    const prevCamRotation = new THREE.Euler();
    
    // Shooting (Energy Orbs)
    const bullets = [];
    let orbGeometry = null;
    let orbMaterial = null;
    const bulletSpeed = 45;
    let lastShotTime = 0;
    const shotCooldown = 600; // Cooldown for throwing animation
    
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
        
        if (!orbGeometry) {
            orbGeometry = new THREE.SphereGeometry(0.15, 16, 16);
            orbMaterial = new THREE.MeshStandardMaterial({
                color: 0x0055ff, // Electric blue
                emissive: 0x0055ff,
                emissiveIntensity: 2.0,
                roughness: 0.1,
                metalness: 0.1
            });
        }
        
        callbacks.onKeysChange(keyCount);
        
        // 1. Create Cannon.js physical body for player (a sphere)
        const radius = 0.65; // Smaller radius to allow perfect navigation in narrow streets
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
        
        // Setup hover mouse-look when pointer lock is not engaged
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
            const handleMouseEnter = () => {
                isHovering = true;
            };
            const handleMouseLeave = () => {
                isHovering = false;
                lastMouseX = null;
                lastMouseY = null;
            };
            const handleMouseMove = (e) => {
                // Keep the camera stable by doing nothing when PointerLock is not active.
            };

            // Remove existing to prevent duplicate bindings on restart
            canvas.removeEventListener('mouseenter', canvas._onMouseEnter);
            canvas.removeEventListener('mouseleave', canvas._onMouseLeave);
            canvas.removeEventListener('mousemove', canvas._onMouseMove);

            canvas._onMouseEnter = handleMouseEnter;
            canvas._onMouseLeave = handleMouseLeave;
            canvas._onMouseMove = handleMouseMove;

            canvas.addEventListener('mouseenter', handleMouseEnter);
            canvas.addEventListener('mouseleave', handleMouseLeave);
            canvas.addEventListener('mousemove', handleMouseMove);
        }

        // Create the high-graphics 3D throwing arms viewmodel
        createThrowingArms();
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
     * Loads the rigged hands GLB and configures throwing skeletal animation
     */
    function createThrowingArms() {
        gunGroup = new THREE.Group();
        gunGroup.position.copy(defaultGunPos);
        cameraRef.add(gunGroup);

        // Load the Rigged throwing hands GLB
        const loader = new GLTFLoader();
        const path = "/fps_arms_throwing.glb";
        
        const setupLoadedGltf = (gltf) => {
            const handsScene = gltf.scene;
            
            const handsMaterial = new THREE.MeshStandardMaterial({
                color: 0xcccccc, // natural light grey skin tone/fabric representation
                metalness: 0.1,
                roughness: 0.6
            });

            handsScene.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                    child.renderOrder = 999;
                    
                    if (child.material) {
                        // Force opacity and turn off transparency to guarantee visibility
                        child.material.transparent = false;
                        child.material.opacity = 1.0;
                        child.material.depthWrite = true;
                        child.material.depthTest = false;
                        
                        if (child.material.map) {
                            child.material.metalness = 0.1;
                            child.material.roughness = 0.65;
                        } else {
                            child.material = handsMaterial;
                            child.material.depthTest = false;
                        }
                    }
                }
            });

            // Reset scale/position/rotation first
            handsScene.scale.set(1, 1, 1);
            handsScene.position.set(0, 0, 0);
            handsScene.rotation.set(0, Math.PI, 0);

            // Skinned scale bypass to achieve realistic human dimensions (smaller, natural hands)
            const scaleFactor = 0.08;
            handsScene.scale.set(scaleFactor, scaleFactor, scaleFactor);

            // Center and position the mesh relative to gunGroup so it is perfectly visible.
            // Adjusted for smaller scale to sit naturally at bottom-right of viewport
            handsScene.position.x = -0.05;
            handsScene.position.y = 0.6;
            handsScene.position.z = -1.5;

            gunGroup.add(handsScene);

            // Set up animation mixer
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(handsScene);
                const clip = gltf.animations.find(anim => anim.name === "trhow") || gltf.animations[0];
                if (clip) {
                    throwAction = mixer.clipAction(clip);
                    throwAction.setLoop(THREE.LoopOnce);
                    throwAction.clampWhenFinished = true; // clamp so it stays on screen
                    throwAction.timeScale = 2.0; // Play faster for snappier feedback
                    
                    // Show hands initially in the ready pose
                    throwAction.reset();
                    throwAction.paused = true;
                    throwAction.time = 0;
                    throwAction.play();
                }

                // Return to ready pose when finished
                mixer.addEventListener('finished', (e) => {
                    if (e.action === throwAction) {
                        throwAction.paused = true;
                        throwAction.time = 0;
                    }
                });
            }
        };

        if (window.GameManager && window.GameManager.getCachedModel && window.GameManager.getCachedModel(path)) {
            setupLoadedGltf(window.GameManager.getCachedModel(path));
        } else {
            loader.load(path, (gltf) => {
                setupLoadedGltf(gltf);
            }, undefined, (err) => {
                console.error("Failed to load throwing arms model inside Player:", err);
            });
        }
    }
    
    function onKeyDown(e) {
        if (!controls.isLocked && !isHovering) return;
        
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
        if (!controls.isLocked && !isHovering) return;
        if (e.button === 0) {
            shoot();
        }
    }
    
    function shoot() {
        const now = performance.now();
        if (now - lastShotTime < shotCooldown) return;
        lastShotTime = now;
        
        // Play the throwing animation
        if (throwAction) {
            throwAction.reset();
            throwAction.paused = false;
            throwAction.play();
        }
        
        // Sound is disabled (Sound.playShoot returns early)
        Sound.playShoot();

        // Spawn energy orb after 100ms delay to align with the forward sweep of the throw
        setTimeout(() => {
            if (!cameraRef || !cameraRef.parent) return;

            // Spawn energy orb (neon-blue glowing sphere) using cached assets
            const orbMesh = new THREE.Mesh(orbGeometry, orbMaterial);
            
            // Add point light to illuminate the surroundings in blue
            const orbLight = new THREE.PointLight(0x0055ff, 2.5, 10);
            orbLight.castShadow = false;
            orbMesh.add(orbLight);
            
            // Start position: offset from camera center to align with the hand
            const startPos = new THREE.Vector3();
            startPos.copy(cameraRef.position);
            
            const offset = new THREE.Vector3(0.15, -0.2, -0.4); // slightly right, down, forward
            offset.applyQuaternion(cameraRef.quaternion);
            startPos.add(offset);
            
            orbMesh.position.copy(startPos);
            
            const dir = new THREE.Vector3();
            cameraRef.getWorldDirection(dir);
            dir.normalize();
            
            cameraRef.parent.add(orbMesh);
            
            bullets.push({
                mesh: orbMesh,
                velocity: dir.multiplyScalar(bulletSpeed),
                birthTime: performance.now(),
                maxLife: 1500
            });
        }, 100);
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
        
        // Clean up active bullets from old scene
        bullets.forEach(b => {
            if (b.mesh && cameraRef && cameraRef.parent) {
                cameraRef.parent.remove(b.mesh);
            }
        });
        bullets.length = 0;
        
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
            cameraRef.position.y += 0.6;
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
                const bobX = Math.sin(walkTime * 0.5) * 0.02;
                const bobY = Math.cos(walkTime) * 0.025;
                
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
            cameraRef.position.y -= 0.6;
        } else {
            cameraRef.position.y += 0.6;
        }
        
        const now = performance.now();
        
        // Update throwing animation mixer
        if (mixer) {
            mixer.update(deltaTime);
        }
        
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            
            b.mesh.position.addScaledVector(b.velocity, deltaTime);
            
            // Rotate the thrown energy orbs
            if (b.mesh) {
                b.mesh.rotation.x += deltaTime * 6.0;
                b.mesh.rotation.y += deltaTime * 4.0;
            }
            
            let hit = false;
            
            const hitInsect = Enemies.checkBulletCollisions(b.mesh.position, 0.4);
            if (hitInsect) {
                hit = true;
                Enemies.damageEnemy(hitInsect, 15); // dealing 15 damage
                Particles.spawnSparks(b.mesh.position, 0x0055ff, 12); // blue sparks on impact
            }
            
            if (!hit) {
                const px = Math.abs(b.mesh.position.x);
                const py = b.mesh.position.y;
                const pz = Math.abs(b.mesh.position.z);
                
                if (px > 100 || py < -1 || py > 21 || pz > 100) {
                    hit = true;
                    Particles.spawnSparks(b.mesh.position, 0x0055ff, 8); // blue sparks on wall hit
                }
            }
            
            if (hit || (now - b.birthTime > b.maxLife)) {
                cameraRef.parent.remove(b.mesh);
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
        getGunGroup: () => gunGroup,
        reset,
        setCallbacks
    };
})();

export default Player;
