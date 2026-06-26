import { createSignal, createEffect, onCleanup, For, Show } from 'solid-js';
import GameEngine from './game/engine';
import Vaults from './game/vaults';
import Player from './game/player';
import { Sound } from './game/sound';
import { LEVELS } from './game/levels';
import { generateQuestions } from './game/mathQuestions';
import './App.css';

const LEVEL_CARDS_DATA = [
    { 
        id: 1, 
        name: "Level 1: Arabic City", 
        concept: "Ascending, Descending & Comparing Numbers", 
        diff: "Basic", 
        color: "#f59e0b", 
        gradient: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
        rightGradient: "linear-gradient(135deg, #2e1a05 0%, #0f0902 100%)",
        icon: "🕌", 
        difficultyProgress: 10,
        formulaText: "a < b, a > b, a = b",
        formulaDesc: "Sort numbers in ascending and descending order. Use math comparison operators (<, >, =) to solve value relations."
    },
    { 
        id: 2, 
        name: "Level 2: Cyberpunk City", 
        concept: "Addition, Subtraction, Multiplication & Division", 
        diff: "Easy", 
        color: "#00f0ff", 
        gradient: "linear-gradient(135deg, #00f0ff 0%, #0891b2 100%)",
        rightGradient: "linear-gradient(135deg, #021e25 0%, #010c0f 100%)",
        icon: "🏙️", 
        difficultyProgress: 50,
        formulaText: "a + b, a - b, a × b, a ÷ b",
        formulaDesc: "Solve fill-in-the-blank equations for addition, subtraction, multiplication, and division to unlock security vaults."
    },
    { 
        id: 3, 
        name: "Level 3: Neighborhood City", 
        concept: "Volumes, Probability, Fractions, Mixed Numbers & Money", 
        diff: "Medium", 
        color: "#a855f7", 
        gradient: "linear-gradient(135deg, #a855f7 0%, #701a75 100%)",
        rightGradient: "linear-gradient(135deg, #1d072b 0%, #0a0210 100%)",
        icon: "🏙️", 
        difficultyProgress: 100,
        formulaText: "V = 4/3*πr³, P(E) = n(E)/n(S), a/b, Mixed Nos, ₹",
        formulaDesc: "Solve Class 10 math challenges: Volume of sphere, Probability ratios, Polynomial sum/product of zeroes, Fractions, mixed numbers, and money calculations."
    }
];

// Puzzle data is now generated dynamically by mathQuestions.js

const PLAYFUL_COLORS = ['#ff4757', '#2ed573', '#1e90ff', '#ffa502', '#ff6b81', '#70a1ff', '#7bed9f'];

const getColorForItem = (item) => {
    const str = String(item);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % PLAYFUL_COLORS.length;
    return PLAYFUL_COLORS[idx];
};

function App() {
    let canvasRef;
    let puzzleCanvasRef;
    let minimapRef;

    const activeLevelPuzzles = () => generatedPuzzles();

    // Menu Signals
    const [gameStarted, setGameStarted] = createSignal(false);
    const [gameOver, setGameOver] = createSignal(false);
    const [victory, setVictory] = createSignal(false);
    const [unlockedLevels, setUnlockedLevels] = createSignal(
        (() => {
            const saved = localStorage.getItem('math_vault_unlocked_level');
            return saved ? Math.min(parseInt(saved, 10), 3) : 3;
        })()
    );
    const [activeLevelIndex, setActiveLevelIndex] = createSignal(0);
    const [loadingProgress, setLoadingProgress] = createSignal(null);
    
    // Pause and Cursor state variables
    const [isPaused, setIsPaused] = createSignal(false);
    const [isHovered, setIsHovered] = createSignal(false);
    const [isLocked, setIsLocked] = createSignal(false);
    const [mousePos, setMousePos] = createSignal({ x: 0, y: 0 });

    // Dynamic puzzle data (generated fresh for each vault open)
    const [generatedPuzzles, setGeneratedPuzzles] = createSignal({});

    // Comic Puzzle signals
    const [lvl1QuestionIdx, setLvl1QuestionIdx] = createSignal(0);
    const [lvl1Items, setLvl1Items] = createSignal([]);
    const [lvl1Slots, setLvl1Slots] = createSignal([]);
    const [selectedCard, setSelectedCard] = createSignal(null);
    const [isDragOver, setIsDragOver] = createSignal(false);
    const [floatingParticles, setFloatingParticles] = createSignal([]);

    const handlePrevLevel = () => {
        setActiveLevelIndex((prev) => (prev > 0 ? prev - 1 : LEVEL_CARDS_DATA.length - 1));
    };

    const handleNextLevel = () => {
        setActiveLevelIndex((prev) => (prev < LEVEL_CARDS_DATA.length - 1 ? prev + 1 : 0));
    };

    // Player HUD Signals
    const [hp, setHp] = createSignal(100);
    const [score, setScore] = createSignal(0);
    const [orbs, setOrbs] = createSignal(0);
    const [keys, setKeys] = createSignal(0);
    const [gravityInverted, setGravityInverted] = createSignal(false);
    const [gravityDuration, setGravityDuration] = createSignal(0);
    const [notification, setNotification] = createSignal("");
    const [prompt, setPrompt] = createSignal("");
    const [damageFlash, setDamageFlash] = createSignal(false);

    // Puzzle Modal Overlay Signals
    const [activePuzzle, setActivePuzzle] = createSignal(null);
    const [puzzleFeedback, setPuzzleFeedback] = createSignal("");
    const [puzzleFeedbackType, setPuzzleFeedbackType] = createSignal(""); // "success" or "error"
    const [shakeOverlay, setShakeOverlay] = createSignal(false);

    // Puzzle Inputs Signals
    const [algebraDial, setAlgebraDial] = createSignal(8);
    const [quadraticsRoot, setQuadraticsRoot] = createSignal(null);
    const [trigRatio, setTrigRatio] = createSignal(null);
    const [trigDistance, setTrigDistance] = createSignal(30);
    const [logicOutput, setLogicOutput] = createSignal(null);
    const [level, setLevel] = createSignal(1);

    // Initialize Game Engine once started
    createEffect(() => {
        if (!gameStarted() || gameOver() || victory()) return;

        const handleHPChange = (newHp) => {
            const currentHp = hp();
            setHp(newHp);
            if (newHp < currentHp) {
                setDamageFlash(true);
                setTimeout(() => setDamageFlash(false), 400);
            }
        };

        const handleNotification = (text) => {
            setNotification(text);
            const alertBox = document.getElementById('action-prompt');
            if (alertBox) {
                alertBox.classList.add('active');
                setTimeout(() => {
                    alertBox.classList.remove('active');
                }, 2200);
            }
        };

        GameEngine.start(canvasRef, {
            onHPChange: handleHPChange,
            onScoreChange: setScore,
            onOrbsChange: setOrbs,
            onKeysChange: setKeys,
            onGravityChange: (inverted, duration) => {
                setGravityInverted(inverted);
                setGravityDuration(duration);
            },
            onNotification: handleNotification,
            onPrompt: setPrompt,
            onLoadProgress: (percent) => {
                setLoadingProgress(percent);
                if (percent >= 100) {
                    setTimeout(() => setLoadingProgress(null), 500);
                }
            },
            onOpenPuzzle: (vault) => {
                setActivePuzzle(vault);
                setAlgebraDial(vault.defaultVal !== undefined ? vault.defaultVal : 8);
                setQuadraticsRoot(null);
                setTrigRatio(null);
                setTrigDistance(vault.defaultVal !== undefined ? vault.defaultVal : 30);
                setLogicOutput(null);
                setPuzzleFeedback("");
                setPuzzleFeedbackType("");
                
                if (GameEngine.getControls()) {
                    GameEngine.getControls().unlock();
                }

                // Generate 10 fresh random questions for this vault
                const questions = generateQuestions(level(), vault.id, 10);
                setGeneratedPuzzles(prev => ({ ...prev, [vault.id]: questions }));
                setLvl1QuestionIdx(0);
                initLevel1Puzzle(vault.id, 0);
            },
            onGameOver: () => setGameOver(true),
            onVictory: () => setVictory(true),
            onNextLevel: () => {
                setLevel((prev) => {
                    const next = prev + 1;
                    if (next > 3) {
                        setVictory(true);
                        return 3;
                    } else {
                        setUnlockedLevels((prevUnlocked) => {
                            const newUnlocked = Math.max(prevUnlocked, next);
                            localStorage.setItem('math_vault_unlocked_level', newUnlocked);
                            return newUnlocked;
                        });
                        setLoadingProgress(0);
                        GameEngine.nextLevel(next);
                        setScore(0);
                        return next;
                    }
                });
            }
        }, level());

        const handleLockChange = () => {
            if (document.pointerLockElement === canvasRef || document.pointerLockElement === document.body) {
                setIsLocked(true);
            } else {
                setIsLocked(false);
                if (!activePuzzle() && gameStarted() && !gameOver() && !victory()) {
                    setIsPaused(true);
                    GameEngine.pause();
                }
            }
        };
        document.addEventListener('pointerlockchange', handleLockChange);

        // Lock controls on start
        setTimeout(() => {
            if (GameEngine.getControls()) {
                GameEngine.getControls().lock();
            }
        }, 300);

        onCleanup(() => {
            document.removeEventListener('pointerlockchange', handleLockChange);
            GameEngine.shutdown();
        });
    });

    // Handle Puzzle sub-scene canvas rendering when open
    createEffect(() => {
        const puzzle = activePuzzle();
        if (!puzzle || !puzzleCanvasRef) return;

        const cleanup = Vaults.setupPuzzleCanvas(
            puzzleCanvasRef, 
            puzzle.id
        );

        onCleanup(() => {
            cleanup();
        });
    });

    // Handle Minimap rendering loop
    createEffect(() => {
        if (!gameStarted() || gameOver() || victory()) return;
        let animationId;
        
        const drawMinimap = () => {
            animationId = requestAnimationFrame(drawMinimap);
            
            const canvas = minimapRef;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            const data = GameEngine.getMinimapData();
            if (!data || !data.grid) return;
            
            const { grid, openWorld, boundSize, buildingFootprints: footprints, playerPos, enemies, vaults, portalActive, portalCell, yaw } = data;
            
            const headingEl = document.getElementById('nav-heading');
            const vaultEl = document.getElementById('nav-nearest-vault');
            const portalStatusEl = document.getElementById('nav-portal-status');

            if (headingEl) {
                let deg = (yaw * 180 / Math.PI) % 360;
                if (deg < 0) deg += 360;
                
                let dir = "N";
                if (deg >= 337.5 || deg < 22.5) dir = "N";
                else if (deg >= 22.5 && deg < 67.5) dir = "NE";
                else if (deg >= 67.5 && deg < 112.5) dir = "E";
                else if (deg >= 112.5 && deg < 157.5) dir = "SE";
                else if (deg >= 157.5 && deg < 202.5) dir = "S";
                else if (deg >= 202.5 && deg < 247.5) dir = "SW";
                else if (deg >= 247.5 && deg < 292.5) dir = "W";
                else if (deg >= 292.5 && deg < 337.5) dir = "NW";

                headingEl.textContent = `${dir} (${Math.round(deg)}°)`;
            }

            if (vaultEl && vaults) {
                let nearestDist = Infinity;
                vaults.forEach(v => {
                    if (v.unlocked) return;
                    const d = playerPos.distanceTo(v.position);
                    if (d < nearestDist) {
                        nearestDist = d;
                    }
                });

                if (nearestDist === Infinity) {
                    vaultEl.textContent = "COMPLETED";
                    vaultEl.style.color = "var(--color-success)";
                } else {
                    vaultEl.textContent = `${Math.round(nearestDist)}m`;
                    vaultEl.style.color = "var(--color-primary)";
                }
            }

            if (portalStatusEl) {
                if (portalActive) {
                    portalStatusEl.textContent = "ONLINE (FIND EXIT)";
                    portalStatusEl.style.color = "var(--color-success)";
                } else {
                    portalStatusEl.textContent = "OFFLINE";
                    portalStatusEl.style.color = "#94a3b8";
                }
            }

            const rows = grid.length;
            const cols = grid[0].length;
            const cw = canvas.width;
            const ch = canvas.height;
            const cx = cw / 2;
            const cy = ch / 2;
            
            const mapRange = openWorld ? (boundSize + 4.0) : (boundSize + 2.0);
            const mapRadius = Math.min(cx, cy) - 2;
            
            const worldToMinimap = (wx, wz) => {
                const rx = wx;
                const ry = -wz;
                
                return {
                    x: cx + (rx / mapRange) * mapRadius,
                    y: cy - (ry / mapRange) * mapRadius
                };
            };

            // Comic Book Style Radar Background
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(0, 0, cw, ch);
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, mapRadius, 0, Math.PI * 2);
            ctx.clip();
            
            // Clean gray grid lines
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.lineWidth = 1.0;
            const gridStep = openWorld ? 10 : 4;
            for (let gx = -Math.ceil(mapRange/gridStep)*gridStep; gx <= mapRange; gx += gridStep) {
                const a = worldToMinimap(gx, -mapRange);
                const b = worldToMinimap(gx, mapRange);
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
            for (let gz = -Math.ceil(mapRange/gridStep)*gridStep; gz <= mapRange; gz += gridStep) {
                const a = worldToMinimap(-mapRange, gz);
                const b = worldToMinimap(mapRange, gz);
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }

            // Radar concentric rings
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.04)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(cx, cy, mapRadius * 0.33, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, mapRadius * 0.66, 0, Math.PI * 2);
            ctx.stroke();

            // Subtle scan sweep line
            const sweepAngle = (performance.now() * 0.0012) % (Math.PI * 2);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(sweepAngle) * mapRadius, cy + Math.sin(sweepAngle) * mapRadius);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            const halfW = (cols * 4) / 2;
            const halfD = (rows * 4) / 2;
            
            if (!openWorld) {
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const cell = grid[r][c];
                        if (cell === 1 || cell === 2) {
                            const wx = -halfW + c * 4 + 2;
                            const wz = -halfD + r * 4 + 2;
                            const tl = worldToMinimap(wx - 2, wz - 2);
                            const br = worldToMinimap(wx + 2, wz + 2);
                            
                            ctx.fillStyle = cell === 1 ? 'rgba(0, 0, 0, 0.15)' : 'rgba(234, 179, 8, 0.35)';
                            ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
                            
                            ctx.strokeStyle = '#000000';
                            ctx.lineWidth = 1.5;
                            ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
                        }
                    }
                }
            } else {
                if (footprints) {
                    ctx.save();
                    footprints.forEach(f => {
                        const tl = worldToMinimap(f.x - f.halfW, f.z - f.halfD);
                        const br = worldToMinimap(f.x + f.halfW, f.z + f.halfD);
                        const w = br.x - tl.x;
                        const h = br.y - tl.y;
                        
                        ctx.fillStyle = '#ffe600'; // Bold comic yellow for buildings
                        ctx.fillRect(tl.x, tl.y, w, h);
                        
                        ctx.strokeStyle = '#000000'; // Thick black borders
                        ctx.lineWidth = 2.0;
                        ctx.strokeRect(tl.x, tl.y, w, h);
                    });
                    ctx.restore();
                }
            }
            
            vaults.forEach(v => {
                if (v.unlocked) return;
                const pos = worldToMinimap(v.position.x, v.position.z);
                const pulse = 1.0 + Math.sin(performance.now() * 0.008 + v.id) * 0.18;
                
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 5.5 * pulse, 0, Math.PI * 2);
                ctx.fillStyle = v.opened ? '#22c55e' : '#a855f7'; // green vs purple
                ctx.fill();
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1.8;
                ctx.stroke();
            });
            
            enemies.forEach((e, idx) => {
                if (e.dead) return;
                const pos = worldToMinimap(e.mesh.position.x, e.mesh.position.z);
                const pulse = 1.0 + Math.sin(performance.now() * 0.01 + idx) * 0.15;
                
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 4.5 * pulse, 0, Math.PI * 2);
                ctx.fillStyle = '#ff2a5f'; // comic pink/red
                ctx.fill();
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1.8;
                ctx.stroke();
            });
            
            if (portalActive && portalCell) {
                const portalWorldX = -halfW + portalCell.x * 4 + 2;
                const portalWorldZ = -halfD + portalCell.z * 4 + 2;
                const pos = worldToMinimap(portalWorldX, portalWorldZ);
                
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 6.5, 0, Math.PI * 2);
                ctx.fillStyle = '#00f0ff'; // cyber cyan exit
                ctx.fill();
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2.0;
                ctx.stroke();
            }
            
            const pPos = worldToMinimap(playerPos.x, playerPos.z);
            
            ctx.save();
            ctx.translate(pPos.x, pPos.y);
            ctx.rotate(yaw); // Rotate by positive yaw from camera world direction vector
            
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, 36, -Math.PI / 2 - 0.45, -Math.PI / 2 + 0.45);
            ctx.closePath();
            const fovGradient = ctx.createRadialGradient(0, 0, 2, 0, 0, 36);
            fovGradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)');
            fovGradient.addColorStop(1, 'rgba(34, 197, 94, 0)');
            ctx.fillStyle = fovGradient;
            ctx.fill();
 
            ctx.beginPath();
            ctx.moveTo(0, -9);
            ctx.lineTo(-6, 6);
            ctx.lineTo(6, 6);
            ctx.closePath();
            ctx.fillStyle = '#22c55e'; // bright comic green arrow
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.0;
            ctx.stroke();
            
            ctx.restore();
            ctx.restore();
            
            // Bold outer comic bezel
            ctx.beginPath();
            ctx.arc(cx, cy, mapRadius, 0, Math.PI * 2);
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3.5;
            ctx.stroke();
            
            ctx.font = 'bold 12px Bangers, cursive';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const compassDirs = [
                { label: 'N', angle: 0 },
                { label: 'E', angle: Math.PI / 2 },
                { label: 'S', angle: Math.PI },
                { label: 'W', angle: -Math.PI / 2 }
            ];
            compassDirs.forEach(d => {
                const lx = cx + Math.sin(d.angle) * (mapRadius + 8);
                const ly = cy - Math.cos(d.angle) * (mapRadius + 8);
                ctx.fillStyle = d.label === 'N' ? '#ef4444' : '#000000';
                ctx.fillText(d.label, lx, ly);
            });
        };
        
        drawMinimap();
        onCleanup(() => {
            cancelAnimationFrame(animationId);
        });
    });

    const handleEnterStation = () => {
        Sound.init();
        setLoadingProgress(0);
        setGameStarted(true);
    };

    const handleRedeploy = () => {
        setGameOver(false);
        setVictory(false);
        setHp(100);
        setScore(0);
        setOrbs(0);
        setKeys(0);
        setGravityInverted(false);
        setGravityDuration(0);
        setPrompt("");
        setNotification("");
        setLevel(1);
        
        if (gameStarted()) {
            setLoadingProgress(0);
            GameEngine.restart(1);
            setTimeout(() => {
                if (GameEngine.getControls()) {
                    GameEngine.getControls().lock();
                }
            }, 300);
        } else {
            setLoadingProgress(0);
            setGameStarted(true);
        }
    };

    const handleAbandonVault = () => {
        setActivePuzzle(null);
        if (GameEngine.getControls()) {
            GameEngine.getControls().lock();
        }
    };

    const handlePauseToggle = () => {
        if (isPaused()) {
            GameEngine.resume();
            setIsPaused(false);
            setTimeout(() => {
                if (GameEngine.getControls()) {
                    GameEngine.getControls().lock();
                }
            }, 100);
        } else {
            GameEngine.pause();
            setIsPaused(true);
            if (GameEngine.getControls()) {
                GameEngine.getControls().unlock();
            }
        }
    };

    const handleResume = () => {
        GameEngine.resume();
        setIsPaused(false);
        setTimeout(() => {
            if (GameEngine.getControls()) {
                GameEngine.getControls().lock();
            }
        }, 100);
    };

    const initLevel1Puzzle = (vaultId, questionIdx) => {
        const data = activeLevelPuzzles()[vaultId][questionIdx];
        if (data.type === "sort") {
            setLvl1Items([...data.numbers]);
            setLvl1Slots([null, null, null, null]);
        } else if (data.type === "equation") {
            setLvl1Items([...data.options]);
            setLvl1Slots([null]);
        }
        setSelectedCard(null);
        setPuzzleFeedback("");
        setPuzzleFeedbackType("");
    };

    const handleDragStart = (e, item, index, sourceZone) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ item, index, sourceZone }));
        setSelectedCard({ item, index, sourceZone });
    };

    const handleDropToSlot = (e, targetSlotIdx) => {
        e.preventDefault();
        let dataStr = e.dataTransfer.getData("text/plain");
        let dragData = null;
        if (dataStr) {
            try {
                dragData = JSON.parse(dataStr);
            } catch(err) {}
        }
        if (!dragData) {
            dragData = selectedCard();
        }
        if (!dragData) return;

        const { item, index, sourceZone } = dragData;
        const currentSlots = [...lvl1Slots()];
        const currentPool = [...lvl1Items()];

        if (sourceZone === 'pool') {
            const existingItemInSlot = currentSlots[targetSlotIdx];
            const itemIdxInPool = currentPool.indexOf(item);
            if (itemIdxInPool !== -1) {
                currentPool.splice(itemIdxInPool, 1);
            }
            currentSlots[targetSlotIdx] = item;
            if (existingItemInSlot !== null) {
                currentPool.push(existingItemInSlot);
            }
        } else if (sourceZone === 'slot') {
            const sourceSlotIdx = index;
            if (sourceSlotIdx === targetSlotIdx) return;
            const existingItemInTarget = currentSlots[targetSlotIdx];
            currentSlots[targetSlotIdx] = item;
            currentSlots[sourceSlotIdx] = existingItemInTarget;
        }

        setLvl1Slots(currentSlots);
        setLvl1Items(currentPool);
        setSelectedCard(null);
        Sound.playPickup();
    };

    const handleDropToPool = (e) => {
        e.preventDefault();
        let dataStr = e.dataTransfer.getData("text/plain");
        let dragData = null;
        if (dataStr) {
            try {
                dragData = JSON.parse(dataStr);
            } catch(err) {}
        }
        if (!dragData) {
            dragData = selectedCard();
        }
        if (!dragData) return;

        const { item, index, sourceZone } = dragData;
        if (sourceZone === 'slot') {
            const currentSlots = [...lvl1Slots()];
            const currentPool = [...lvl1Items()];
            currentSlots[index] = null;
            currentPool.push(item);
            setLvl1Slots(currentSlots);
            setLvl1Items(currentPool);
            Sound.playPickup();
        }
        setSelectedCard(null);
    };

    const handlePoolItemClick = (item) => {
        const currentSlots = [...lvl1Slots()];
        const currentPool = [...lvl1Items()];
        const emptySlotIdx = currentSlots.indexOf(null);

        if (emptySlotIdx !== -1) {
            const itemIdx = currentPool.indexOf(item);
            if (itemIdx !== -1) {
                currentPool.splice(itemIdx, 1);
            }
            currentSlots[emptySlotIdx] = item;
            setLvl1Slots(currentSlots);
            setLvl1Items(currentPool);
            Sound.playPickup();
        } else if (currentSlots.length === 1) {
            const existing = currentSlots[0];
            const itemIdx = currentPool.indexOf(item);
            if (itemIdx !== -1) {
                currentPool[itemIdx] = existing;
            }
            currentSlots[0] = item;
            setLvl1Slots(currentSlots);
            setLvl1Items(currentPool);
            Sound.playPickup();
        }
    };

    const handleSlotItemClick = (slotIdx) => {
        const currentSlots = [...lvl1Slots()];
        const currentPool = [...lvl1Items()];
        const item = currentSlots[slotIdx];
        if (item === null) return;

        currentSlots[slotIdx] = null;
        currentPool.push(item);
        setLvl1Slots(currentSlots);
        setLvl1Items(currentPool);
        Sound.playPickup();
    };

    const handleComicSubmit = () => {
        const vaultId = activePuzzle().id;
        const questionIdx = lvl1QuestionIdx();
        const data = activeLevelPuzzles()[vaultId][questionIdx];
        let isCorrect = false;

        if (data.type === "sort") {
            if (lvl1Slots().includes(null)) {
                setPuzzleFeedback("Please place all numbers in the slots first! 🤔");
                setPuzzleFeedbackType("error");
                return;
            }
            isCorrect = true;
            for (let i = 0; i < data.correct.length; i++) {
                if (lvl1Slots()[i] !== data.correct[i]) {
                    isCorrect = false;
                    break;
                }
            }
        } else if (data.type === "equation") {
            if (lvl1Slots()[0] === null) {
                setPuzzleFeedback("Please drag the answer into the slot first! 🤔");
                setPuzzleFeedbackType("error");
                return;
            }
            isCorrect = (String(lvl1Slots()[0]) === String(data.correct));
        }

        if (isCorrect) {
            Sound.playVictory();

            // Trigger particle burst
            const particles = [];
            for (let i = 0; i < 25; i++) {
                particles.push({
                    id: Math.random(),
                    x: Math.random() * 80 + 10,
                    y: Math.random() * 30 + 50,
                    symbol: ['⭐', '✨', '🎉', '💥', '✏️', '➕', '➖', '➗', '✖️', '💡'][Math.floor(Math.random() * 10)],
                    size: Math.random() * 1.5 + 1.2,
                    delay: Math.random() * 0.4,
                    duration: Math.random() * 1.0 + 1.0
                });
            }
            setFloatingParticles(particles);
            setTimeout(() => setFloatingParticles([]), 2500);

            if (questionIdx < activeLevelPuzzles()[vaultId].length - 1) {
                setPuzzleFeedback("Awesome! You got it right! Ready for the next one? 🌟");
                setPuzzleFeedbackType("success");
                setTimeout(() => {
                    const nextIdx = questionIdx + 1;
                    setLvl1QuestionIdx(nextIdx);
                    initLevel1Puzzle(vaultId, nextIdx);
                }, 1500);
            } else {
                setPuzzleFeedback("TREASURE BOX CRACKED! CORE UNLOCKED! 🎉");
                setPuzzleFeedbackType("success");
                Vaults.markVaultUnlocked(vaultId);
                Player.incrementScore();
                setTimeout(() => {
                    setActivePuzzle(null);
                    if (GameEngine.getControls()) {
                        GameEngine.getControls().lock();
                    }
                }, 1800);
            }
        } else {
            Sound.playDamage();
            setPuzzleFeedback("Oops! That's not correct. Let's try again! 💪");
            setPuzzleFeedbackType("error");
            setShakeOverlay(true);
            setTimeout(() => setShakeOverlay(false), 450);
            initLevel1Puzzle(vaultId, questionIdx);
        }
    };

    const handleGoHome = () => {
        setActivePuzzle(null);
        setGameStarted(false);
        setGameOver(false);
        setVictory(false);
        setIsPaused(false);
        GameEngine.shutdown();
    };

    // Math Input Handlers
    const handleAlgebraChange = (dir) => {
        let next = algebraDial();
        const minVal = activePuzzle().min !== undefined ? activePuzzle().min : 1;
        const maxVal = activePuzzle().max !== undefined ? activePuzzle().max : 20;
        if (dir === 'inc' && algebraDial() < maxVal) next++;
        if (dir === 'dec' && algebraDial() > minVal) next--;
        setAlgebraDial(next);
        Vaults.updateVisualizer(activePuzzle().id, next);
        Sound.playShoot();
    };

    const handleAlgebraSlider = (e) => {
        const val = parseInt(e.target.value);
        setAlgebraDial(val);
        Vaults.updateVisualizer(activePuzzle().id, val);
    };

    const handleQuadraticsLaunch = () => {
        Vaults.triggerParabolaAnimation();
        Sound.playShoot();
    };

    const handleQuadraticsSelectRoot = (val) => {
        setQuadraticsRoot(val);
        Sound.playPickup();
    };

    const handleTrigSelectRatio = (ratio) => {
        setTrigRatio(ratio);
        Sound.playPickup();
        if (activePuzzle().options) {
            setPuzzleFeedback(`Selected: ${ratio}m. Ready to submit.`);
            setPuzzleFeedbackType("success");
        } else {
            if (ratio === 'tan') {
                setPuzzleFeedback("Selected tan 30° = 40 / d. Move the slider to place boat.");
                setPuzzleFeedbackType("success");
            } else {
                setPuzzleFeedback("Incorrect ratio. Check formula linking Height (Opposite) and Distance (Adjacent).");
                setPuzzleFeedbackType("error");
            }
        }
    };

    const handleTrigSlider = (e) => {
        const val = parseInt(e.target.value);
        setTrigDistance(val);
        Vaults.updateVisualizer(activePuzzle().id, val);
    };

    // Verify Puzzle solution
    const handleSubmitAnswer = () => {
        let isCorrect = false;
        let errMsg = "";

        const puzzle = activePuzzle();
        const ans = puzzle.ans;

        if (puzzle.type === "algebra") {
            if (algebraDial() === ans) {
                isCorrect = true;
            } else {
                errMsg = `Incorrect: Current w is ${algebraDial()} (Perimeter formula: ${puzzle.formula}).`;
            }
        } 
        else if (puzzle.type === "geometry") {
            if (algebraDial() === ans) {
                isCorrect = true;
            } else {
                errMsg = `Incorrect visual value. Expected: ${ans}. Formula: ${puzzle.formula}`;
            }
        }
        else if (puzzle.type === "quadratics") {
            if (quadraticsRoot() === ans) {
                isCorrect = true;
            } else {
                errMsg = `Incorrect root selected. Formula: ${puzzle.formula}`;
            }
        } 
        else if (puzzle.type === "trig") {
            if (puzzle.options) {
                if (trigRatio() === ans) {
                    isCorrect = true;
                } else {
                    errMsg = `Incorrect value selected. Formula: ${puzzle.formula}`;
                }
            } else {
                if (trigRatio() === 'tan' && trigDistance() === ans) {
                    isCorrect = true;
                } else {
                    if (trigRatio() !== 'tan') {
                        errMsg = "Check selected trigonometric ratio formula.";
                    } else {
                        errMsg = `Lighthouse laser is not locked (Current: ${trigDistance()}m). Formula: ${puzzle.formula}`;
                    }
                }
            }
        } 
        else if (puzzle.type === "logic") {
            if (logicOutput() === ans) {
                isCorrect = true;
            } else {
                errMsg = `Incorrect logic gate output value. Formula: ${puzzle.formula}`;
            }
        }

        if (isCorrect) {
            Sound.playVictory();

            // Trigger particle burst
            const particles = [];
            for (let i = 0; i < 25; i++) {
                particles.push({
                    id: Math.random(),
                    x: Math.random() * 80 + 10,
                    y: Math.random() * 30 + 50,
                    symbol: ['⭐', '✨', '🎉', '💥', '✏️', '➕', '➖', '➗', '✖️', '💡'][Math.floor(Math.random() * 10)],
                    size: Math.random() * 1.5 + 1.2,
                    delay: Math.random() * 0.4,
                    duration: Math.random() * 1.0 + 1.0
                });
            }
            setFloatingParticles(particles);
            setTimeout(() => setFloatingParticles([]), 2500);

            setPuzzleFeedback("VAULT SECURED! UNLOCKING CORE...");
            setPuzzleFeedbackType("success");
            
            Vaults.markVaultUnlocked(puzzle.id);
            Player.incrementScore();

            setTimeout(() => {
                setActivePuzzle(null);
                if (GameEngine.getControls()) {
                    GameEngine.getControls().lock();
                }
            }, 1500);
        } else {
            Sound.playDamage();
            setPuzzleFeedback(errMsg || "Verification Failed. Decryption Error.");
            setPuzzleFeedbackType("error");
            
            setShakeOverlay(true);
            setTimeout(() => setShakeOverlay(false), 450);
        }
    };

    // Calculate SVG Timer variables
    const maxTimer = 30;
    const svgCircumference = 2 * Math.PI * 16;
    const svgOffset = () => svgCircumference * (1 - (gravityDuration() / maxTimer));

    return (
        <div class="App">
            {/* Title / Startup Screen */}
            <Show when={!gameStarted()}>
                <div id="start-screen" class="overlay-screen active comic-theme">
                    {/* Comic Top Bar */}
                    <div class="comic-top-bar animate-panel-pop">
                        <div class="comic-title-container" style={{ width: '100%', 'justify-content': 'center' }}>
                            <h1 class="comic-game-title font-orbitron">MATH TREASURE HUNT</h1>
                        </div>
                    </div>

                    {/* Comic Book Spread Slider */}
                    <div class="comic-slider-container">
                        <button class="comic-nav-arrow prev font-orbitron animate-pulse-slow" onClick={handlePrevLevel}>
                            &lsaquo;
                        </button>

                        <div class="comic-spread">
                            {/* Left Page: Mission Dossier */}
                            <div 
                                class="comic-panel left-panel-dossier animate-panel-pop"
                                style={{ 
                                    background: LEVEL_CARDS_DATA[activeLevelIndex()].id > unlockedLevels() 
                                        ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' 
                                        : LEVEL_CARDS_DATA[activeLevelIndex()].gradient
                                }}
                            >
                                <div class="panel-dots-bg"></div>
                                <div class="panel-border-skew"></div>
                                <div class="panel-content">
                                    <div class="panel-badge-row">
                                        <span class="panel-badge-level font-orbitron" style={{ color: LEVEL_CARDS_DATA[activeLevelIndex()].color }}>
                                            {LEVEL_CARDS_DATA[activeLevelIndex()].id > unlockedLevels() ? '🔒 LOCKED' : `LVL ${LEVEL_CARDS_DATA[activeLevelIndex()].id}`}
                                        </span>
                                        <span class={`panel-badge-diff font-orbitron ${LEVEL_CARDS_DATA[activeLevelIndex()].diff.toLowerCase().replace(" ", "-")}`}>
                                            {LEVEL_CARDS_DATA[activeLevelIndex()].diff}
                                        </span>
                                    </div>
                                    <div class="panel-main-info">
                                        <div class="comic-icon-large">
                                            {LEVEL_CARDS_DATA[activeLevelIndex()].id > unlockedLevels() ? '🔒' : LEVEL_CARDS_DATA[activeLevelIndex()].icon}
                                        </div>
                                        <h2 class="comic-level-name font-orbitron">
                                            {LEVEL_CARDS_DATA[activeLevelIndex()].name.split(': ')[1]}
                                        </h2>
                                        <div class="comic-concept-badge font-rajdhani">
                                            <span class="concept-label font-orbitron">TARGET CONCEPTS:</span>
                                            <p class="concept-text">{LEVEL_CARDS_DATA[activeLevelIndex()].concept}</p>
                                        </div>
                                    </div>
                                    <div class="comic-danger-progress">
                                        <div class="danger-labels font-orbitron">
                                            <span>DANGER RATING</span>
                                            <span>{LEVEL_CARDS_DATA[activeLevelIndex()].difficultyProgress}%</span>
                                        </div>
                                        <div class="danger-track">
                                            <div 
                                                class="danger-fill" 
                                                style={{ 
                                                    width: `${LEVEL_CARDS_DATA[activeLevelIndex()].difficultyProgress}%`,
                                                    background: LEVEL_CARDS_DATA[activeLevelIndex()].id > unlockedLevels() ? '#4b5563' : LEVEL_CARDS_DATA[activeLevelIndex()].color
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Page: Formula File */}
                            <div 
                                class="comic-panel right-panel-formula animate-panel-pop"
                                style={{ 
                                    background: LEVEL_CARDS_DATA[activeLevelIndex()].id > unlockedLevels() 
                                        ? 'linear-gradient(135deg, #111827 0%, #030712 100%)' 
                                        : LEVEL_CARDS_DATA[activeLevelIndex()].rightGradient
                                }}
                            >
                                <div class="panel-dots-bg"></div>
                                <div class="panel-border-skew"></div>
                                <div class="panel-content">
                                    <div class="formula-header-tab font-orbitron">
                                        📁 DECRYPTION SCHEMA
                                    </div>
                                    <div class="formula-dossier-body font-rajdhani">
                                        <div class="comic-formula-display font-orbitron">
                                            {LEVEL_CARDS_DATA[activeLevelIndex()].id > unlockedLevels() ? 'CLASSIFIED' : LEVEL_CARDS_DATA[activeLevelIndex()].formulaText}
                                        </div>
                                        <p class="comic-formula-instructions">
                                            {LEVEL_CARDS_DATA[activeLevelIndex()].id > unlockedLevels() 
                                                ? 'DECRYPT PREVIOUS VAULTS TO DISCLOSE FORMULA SPECIFICATIONS.' 
                                                : LEVEL_CARDS_DATA[activeLevelIndex()].formulaDesc}
                                        </p>
                                    </div>
                                    <div class="comic-launch-panel">
                                        {LEVEL_CARDS_DATA[activeLevelIndex()].id > unlockedLevels() ? (
                                            <div class="comic-warning-stamp font-orbitron">
                                                LOCKED!
                                            </div>
                                        ) : (
                                            <button 
                                                class="comic-launch-button font-orbitron"
                                                onClick={() => {
                                                    setLevel(LEVEL_CARDS_DATA[activeLevelIndex()].id);
                                                    handleEnterStation();
                                                }}
                                            >
                                                LAUNCH MISSION!
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button class="comic-nav-arrow next font-orbitron animate-pulse-slow" onClick={handleNextLevel}>
                            &rsaquo;
                        </button>
                    </div>

                    {/* Comic Bottom Control & Mascot Briefing */}
                    <div class="comic-bottom-panel animate-panel-pop">
                        {/* Controls Panel */}
                        <div class="comic-panel bottom-controls font-rajdhani">
                            <div class="panel-border-skew"></div>
                            <div class="panel-content">
                                <h3 class="controls-heading font-orbitron">🎮 MOVEMENT BRIEFING</h3>
                                <div class="controls-grid">
                                    <div class="control-item"><span class="comic-key">W</span><span class="comic-key">A</span><span class="comic-key">S</span><span class="comic-key">D</span> MOVE</div>
                                    <div class="control-item"><span class="comic-key">G</span> ANTI-GRAVITY</div>
                                    <div class="control-item"><span class="comic-key">E</span> DECRYPT / INTERACT</div>
                                    <div class="control-item"><span class="comic-key">CLICK</span> SHOTGUN</div>
                                </div>
                            </div>
                        </div>

                        {/* Level Navigation Dots Selector */}
                        <div class="comic-quick-selector font-orbitron">
                            <For each={LEVEL_CARDS_DATA}>
                                {(card, idx) => {
                                    const cardIsLocked = () => card.id > unlockedLevels();
                                    const isSelected = () => idx() === activeLevelIndex();
                                    return (
                                        <button
                                            class={`comic-selector-dot ${isSelected() ? 'selected' : ''} ${cardIsLocked() ? 'locked' : ''}`}
                                            onClick={() => setActiveLevelIndex(idx())}
                                            style={{ 
                                                'border-color': isSelected() ? card.color : '#000',
                                                'background-color': isSelected() ? card.color : (cardIsLocked() ? 'rgba(0,0,0,0.5)' : '#1e293b')
                                            }}
                                        >
                                            {cardIsLocked() ? '🔒' : card.id}
                                        </button>
                                    );
                                }}
                            </For>
                        </div>

                        {/* Mascot Speech Bubble */}
                        <div class="comic-briefing">
                            <div class="mascot-badge animate-bounce-slow">🤖</div>
                            <div class="comic-speech-bubble font-rajdhani">
                                <div class="bubble-pointer"></div>
                                <p>
                                    Decrypt the math chests in each zone, defeat dynamic insect guards, and secure the keys to escape! Use your holographic heading dashboard to navigate.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>

            {/* Main Game Screen */}
            <Show when={gameStarted()}>
                <canvas 
                    id="game-canvas" 
                    ref={canvasRef}
                    class={(!isLocked() && isHovered()) ? 'hover-unlocked' : ''}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                ></canvas>
                <div id="crosshair"></div>

                {/* HUD Overlay */}
                <div id="hud" class={gravityInverted() ? 'gravity-inverted' : ''}>
                    {/* Top Center Pause Control */}
                    <button 
                        class="hud-pause-btn" 
                        onClick={handlePauseToggle}
                    >
                        {isPaused() ? '▶ RESUME' : '⏸ PAUSE'}
                    </button>
                    
                    {/* Stats Panel */}
                    <div class="hud-panel left-panel">
                        <div class="stat-row">
                            <span class="stat-label font-orbitron">HP</span>
                            <div class="bar-container">
                                <div class="bar-fill hp-fill" style={{ width: `${hp()}%` }}></div>
                            </div>
                            <span class="stat-value font-orbitron">{Math.round(hp())}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label font-orbitron">LEVEL</span>
                            <span class="stat-value text-gold font-orbitron">{level()} / 3</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label font-orbitron">DECRYPTED</span>
                            <span class="stat-value text-gold font-orbitron">{score()} / {LEVELS[level() - 1]?.vaults.length || 3}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label font-orbitron">KEYS HELD</span>
                            <span class="stat-value text-gold font-orbitron">{keys()} / {LEVELS[level() - 1]?.vaults.length || 3} 🔑</span>
                        </div>
                    </div>

                    {/* Right HUD Panel */}
                    <div class="hud-panel right-panel">
                        <div class="minimap-container">
                            <canvas ref={minimapRef} width="180" height="180" id="minimap-canvas"></canvas>
                        </div>
                        <div class="minimap-stats" style={{ width: '100%', 'display': 'flex', 'flex-direction': 'column', gap: '8px', 'align-items': 'stretch', 'margin-top': '5px' }}>
                            <div class="stat-row" style={{ 'justify-content': 'space-between', 'width': '100%' }}>
                                <span class="stat-label">HEADING</span>
                                <span id="nav-heading" class="stat-value text-gold">--</span>
                            </div>
                            <div class="stat-row" style={{ 'justify-content': 'space-between', 'width': '100%' }}>
                                <span class="stat-label">NEAR CHEST</span>
                                <span id="nav-nearest-vault" class="stat-value text-gold">--</span>
                            </div>
                            <div class="stat-row" style={{ 'justify-content': 'space-between', 'width': '100%' }}>
                                <span class="stat-label">EXIT PORTAL</span>
                                <span id="nav-portal-status" class="stat-value">OFFLINE</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Damage and Inversion Vignettes */}
                <div id="damage-vignette" class={damageFlash() ? 'flash' : ''}></div>
                <div id="gravity-vignette" class={gravityInverted() ? 'active' : ''}></div>

                {/* Action Toast Prompts */}
                <div id="action-prompt" class={prompt() ? 'font-rajdhani active' : 'font-rajdhani'}>
                    {prompt() || notification()}
                </div>
            </Show>

            {/* Pause Screen Overlay */}
            <Show when={isPaused()}>
                <div id="pause-screen" class="overlay-screen active" style={{ 'z-index': 9999 }} onClick={handleResume}>
                    <div class="comic-popup comic-popup-pause" onClick={(e) => e.stopPropagation()}>
                        <h1 class="comic-game-title font-orbitron" style={{ 'font-size': '2.8rem', 'text-shadow': '3px 3px 0px #fff, 5px 5px 0px #000' }}>GAME PAUSED</h1>
                        <p class="comic-formula-instructions" style={{ 'font-weight': 'bold', 'margin-top': '5px', 'margin-bottom': '15px' }}>Click Resume or hit Pause to return to the mission.</p>
                        <div style={{ display: 'flex', gap: '15px', 'justify-content': 'center' }}>
                            <button onClick={handleResume} class="comic-btn comic-btn-resume" style={{ width: '150px' }}>▶ RESUME</button>
                            <button onClick={handleGoHome} class="comic-btn comic-btn-home" style={{ width: '150px' }}>🏠 HOME</button>
                        </div>
                    </div>
                </div>
            </Show>

            {/* Game Over Screen */}
            <Show when={gameOver()}>
                <div id="end-screen" class="overlay-screen active">
                    <div class="comic-popup comic-popup-gameover">
                        <h1 class="comic-game-title font-orbitron" style={{ 'font-size': '2.8rem', 'text-shadow': '3px 3px 0px #fff, 5px 5px 0px #000', 'color': '#ff3b30' }}>💥 SYSTEM CRASH! 💥</h1>
                        <p class="comic-formula-instructions" style={{ 'font-weight': 'bold', 'margin-top': '5px', 'margin-bottom': '15px' }}>Your health dropped to 0%.</p>
                        <button onClick={handleRedeploy} class="comic-btn comic-btn-home" style={{ width: '200px', background: '#ffe600', color: '#000' }}>⚡ REDEPLOY! ⚡</button>
                    </div>
                </div>
            </Show>

            {/* Victory Screen */}
            <Show when={victory()}>
                <div id="end-screen" class="overlay-screen active">
                    <div class="comic-popup comic-popup-victory">
                        <h1 class="comic-game-title font-orbitron" style={{ 'font-size': '2.8rem', 'text-shadow': '3px 3px 0px #fff, 5px 5px 0px #000', 'color': '#22c55e' }}>🏆 MISSION SECURED! 🏆</h1>
                        <p class="comic-formula-instructions" style={{ 'font-weight': 'bold', 'margin-top': '5px', 'margin-bottom': '15px' }}>All treasure vaults decrypted.</p>
                        <button onClick={handleRedeploy} class="comic-btn comic-btn-resume" style={{ width: '200px', background: '#ffe600', color: '#000' }}>⭐ REPLAY! ⭐</button>
                    </div>
                </div>
            </Show>

            {/* Math Puzzle Modal Overlay */}
            <Show when={activePuzzle()}>
                {(() => {
                    const puzzle = activePuzzle();
                    return (
                        <div id="puzzle-overlay" class="overlay-screen active">
                            <For each={floatingParticles()}>
                                {(p) => (
                                    <span 
                                        class="comic-floating-particle"
                                        style={{
                                            left: `${p.x}%`,
                                            top: `${p.y}%`,
                                            'font-size': `${p.size}rem`,
                                            'animation-delay': `${p.delay}s`,
                                            'animation-duration': `${p.duration}s`
                                        }}
                                    >
                                        {p.symbol}
                                    </span>
                                )}
                            </For>
                            <Show when={true} fallback={
                                <div class={`puzzle-container comic-popup comic-popup-puzzle ${shakeOverlay() ? 'shake' : ''}`}>
                                    {/* Decorative Background Numbers */}
                                    <div class="comic-bg-numbers-container">
                                        <span class="comic-bg-num" style={{ top: '10%', left: '8%', 'font-size': '2rem', 'animation-delay': '0s' }}>5</span>
                                        <span class="comic-bg-num" style={{ top: '25%', right: '12%', 'font-size': '3rem', 'animation-delay': '1s' }}>9</span>
                                        <span class="comic-bg-num" style={{ top: '65%', left: '15%', 'font-size': '2.5rem', 'animation-delay': '2s' }}>3</span>
                                        <span class="comic-bg-num" style={{ top: '75%', right: '8%', 'font-size': '1.8rem', 'animation-delay': '1.5s' }}>7</span>
                                        <span class="comic-bg-num" style={{ top: '45%', left: '85%', 'font-size': '2.2rem', 'animation-delay': '0.5s' }}>4</span>
                                        <span class="comic-bg-num" style={{ top: '80%', left: '50%', 'font-size': '2.8rem', 'animation-delay': '2.5s' }}>2</span>
                                        <span class="comic-bg-num" style={{ top: '5%', right: '35%', 'font-size': '2.4rem', 'animation-delay': '3s' }}>8</span>
                                        <span class="comic-bg-num" style={{ top: '55%', left: '30%', 'font-size': '2.1rem', 'animation-delay': '0.8s' }}>6</span>
                                    </div>
                                    
                                    {/* Sidebar controls */}
                                    <div class="puzzle-sidebar">
                                        <div class="puzzle-header">
                                            <span class="zone-badge font-bangers">
                                                {puzzle.type.toUpperCase()} VAULT
                                            </span>
                                            <h2 class="font-bangers">
                                                {puzzle.name}
                                            </h2>
                                        </div>
                                        
                                        <div class="puzzle-body font-rajdhani">
                                            <Show when={puzzle.type === "algebra" || puzzle.type === "geometry"}>
                                                <p class="problem-description">{puzzle.problem}</p>
                                                <div class="input-group">
                                                    <span class="input-label">{puzzle.label || "Value"}</span>
                                                    <Show when={puzzle.options} fallback={
                                                        puzzle.max - puzzle.min > 30 ? (
                                                            <div style={{ 'margin-top': '10px' }}>
                                                                <span class="input-label">Current: <span class="text-gold">{algebraDial()}</span></span>
                                                                <input 
                                                                    type="range" 
                                                                    min={puzzle.min} 
                                                                    max={puzzle.max} 
                                                                    value={algebraDial()} 
                                                                    onInput={handleAlgebraSlider}
                                                                    class="cyber-slider" 
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div class="dial-controls">
                                                                <button onClick={() => handleAlgebraChange('dec')} class="dial-btn">-</button>
                                                                <span class="dial-value">{algebraDial()}</span>
                                                                <button onClick={() => handleAlgebraChange('inc')} class="dial-btn">+</button>
                                                            </div>
                                                        )
                                                    }>
                                                        <div class="button-grid">
                                                            <For each={puzzle.options}>
                                                                {(opt) => (
                                                                    <button 
                                                                        onClick={() => {
                                                                            setAlgebraDial(opt);
                                                                            Vaults.updateVisualizer(puzzle.id, opt);
                                                                            Sound.playPickup();
                                                                        }}
                                                                        class={algebraDial() === opt ? "ratio-btn active" : "ratio-btn"}
                                                                    >
                                                                        {opt}
                                                                    </button>
                                                                )}
                                                            </For>
                                                        </div>
                                                    </Show>
                                                </div>
                                            </Show>
 
                                            <Show when={puzzle.type === "quadratics"}>
                                                <p class="problem-description">{puzzle.problem}</p>
                                                <button onClick={handleQuadraticsLaunch} class="glow-button font-bangers" style={{ 'margin-bottom': '15px' }}>
                                                    LAUNCH PROJECTILE
                                                </button>
                                                <Show when={puzzle.options}>
                                                    <div class="input-group">
                                                        <span class="input-label">Select Ground Intersection Root</span>
                                                        <div class="button-grid">
                                                            <For each={puzzle.options}>
                                                                {(opt) => (
                                                                    <button 
                                                                        onClick={() => handleQuadraticsSelectRoot(opt)} 
                                                                        class={quadraticsRoot() === opt ? "ratio-btn active" : "ratio-btn"}
                                                                    >
                                                                        t = {opt}s
                                                                    </button>
                                                                )}
                                                            </For>
                                                        </div>
                                                    </div>
                                                </Show>
                                            </Show>
 
                                            <Show when={puzzle.type === "trig"}>
                                                <p class="problem-description">{puzzle.problem}</p>
                                                <Show when={puzzle.options} fallback={
                                                    <>
                                                        <div class="input-group">
                                                            <span class="input-label">Select Trig Ratio Formula</span>
                                                            <div class="button-grid">
                                                                <For each={['sin', 'cos', 'tan']}>
                                                                    {(ratio) => (
                                                                        <button 
                                                                            onClick={() => handleTrigSelectRatio(ratio)}
                                                                            class={trigRatio() === ratio ? "ratio-btn active" : "ratio-btn"}
                                                                        >
                                                                            {ratio} 30°
                                                                        </button>
                                                                    )}
                                                                </For>
                                                            </div>
                                                        </div>
                                                        <div class="input-group" style={{ 'margin-top': '10px' }}>
                                                            <span class="input-label">Distance (d): <span class="text-gold">{trigDistance()}m</span></span>
                                                            <input 
                                                                type="range" 
                                                                min={puzzle.min} 
                                                                max={puzzle.max} 
                                                                value={trigDistance()} 
                                                                onInput={handleTrigSlider}
                                                                class="cyber-slider" 
                                                            />
                                                        </div>
                                                    </>
                                                }>
                                                    <div class="input-group">
                                                        <span class="input-label">Select Dimension Value</span>
                                                        <div class="button-grid">
                                                            <For each={puzzle.options}>
                                                                {(opt) => (
                                                                    <button 
                                                                        onClick={() => handleTrigSelectRatio(opt)}
                                                                        class={trigRatio() === opt ? "ratio-btn active" : "ratio-btn"}
                                                                    >
                                                                        {opt}m
                                                                    </button>
                                                                )}
                                                            </For>
                                                        </div>
                                                    </div>
                                                </Show>
                                            </Show>
 
                                            <Show when={puzzle.type === "logic"}>
                                                <p class="problem-description">{puzzle.problem}</p>
                                                <div class="input-group">
                                                    <span class="input-label">Select Gate Output</span>
                                                    <div class="button-grid">
                                                        <button 
                                                            onClick={() => setLogicOutput(0)} 
                                                            class={logicOutput() === 0 ? "ratio-btn active" : "ratio-btn"}
                                                        >
                                                            Output Y = 0
                                                        </button>
                                                        <button 
                                                            onClick={() => setLogicOutput(1)} 
                                                            class={logicOutput() === 1 ? "ratio-btn active" : "ratio-btn"}
                                                        >
                                                            Output Y = 1
                                                        </button>
                                                    </div>
                                                </div>
                                            </Show>
                                        </div>
 
                                        <div class="puzzle-actions">
                                            <button onClick={handleSubmitAnswer} class="glow-button font-bangers">SUBMIT ANSWER</button>
                                            <button onClick={handleAbandonVault} class="exit-button font-bangers">ABANDON VAULT</button>
                                        </div>
                                        
                                        <div class={`feedback-msg font-rajdhani ${puzzleFeedbackType() === 'success' ? 'feedback-success' : 'feedback-error'}`}>
                                            {puzzleFeedback()}
                                        </div>
                                    </div>
 
                                    {/* Visualizer Canvas */}
                                    <div class="puzzle-visualizer">
                                        <div class="visualizer-header font-bangers">HOLOGRAPHIC DIAGRAM SYSTEM</div>
                                        <div class="canvas-wrapper">
                                            <canvas ref={puzzleCanvasRef} id="puzzle-canvas"></canvas>
                                        </div>
                                        <div class="visualizer-footer font-rajdhani">
                                            Drag to rotate model. Look for coordinates and dimensions.
                                        </div>
                                    </div>

                                </div>
                            }>
                                {/* Fully Comic Animated Drag-and-Drop Puzzle Overlay for Level 1 */}
                                <div class={`puzzle-container comic-popup ${shakeOverlay() ? 'shake' : ''}`}>
                                    {/* Decorative Background Numbers */}
                                    <div class="comic-bg-numbers-container">
                                        <span class="comic-bg-num" style={{ top: '10%', left: '8%', 'font-size': '2rem', 'animation-delay': '0s' }}>5</span>
                                        <span class="comic-bg-num" style={{ top: '25%', right: '12%', 'font-size': '3rem', 'animation-delay': '1s' }}>9</span>
                                        <span class="comic-bg-num" style={{ top: '65%', left: '15%', 'font-size': '2.5rem', 'animation-delay': '2s' }}>3</span>
                                        <span class="comic-bg-num" style={{ top: '75%', right: '8%', 'font-size': '1.8rem', 'animation-delay': '1.5s' }}>7</span>
                                        <span class="comic-bg-num" style={{ top: '45%', left: '85%', 'font-size': '2.2rem', 'animation-delay': '0.5s' }}>4</span>
                                        <span class="comic-bg-num" style={{ top: '80%', left: '50%', 'font-size': '2.8rem', 'animation-delay': '2.5s' }}>2</span>
                                        <span class="comic-bg-num" style={{ top: '5%', right: '35%', 'font-size': '2.4rem', 'animation-delay': '3s' }}>8</span>
                                        <span class="comic-bg-num" style={{ top: '55%', left: '30%', 'font-size': '2.1rem', 'animation-delay': '0.8s' }}>6</span>
                                    </div>
                                    {/* Header row with Title and Resume / Home buttons */}
                                    <div class="comic-header-row">
                                        <h2 class="comic-vault-title font-bangers">
                                            💥 TREASURE CHEST {puzzle.id + 1} 💥
                                        </h2>
                                        <div class="comic-control-btns">
                                            <button class="comic-btn comic-btn-resume" onClick={handleAbandonVault}>
                                                ▶ RESUME GAME
                                            </button>
                                            <button class="comic-btn comic-btn-home" onClick={handleGoHome}>
                                                🏠 HOME
                                            </button>
                                        </div>
                                    </div>

                                    {/* Concept Header */}
                                    <div class="comic-concept-header font-bangers" style={{ 'text-align': 'center', 'font-weight': 'bold', 'margin-bottom': '2px', 'font-size': '1.3rem', 'color': '#c2410c' }}>
                                        {"🎯 CONCEPT: " + (puzzle.concept || "MATH CHALLENGE").toUpperCase()}
                                    </div>

                                    {/* Star Progress Bar */}
                                    <div class="comic-stars-container" style={{ 'text-align': 'center' }}>
                                        <p style={{ 'font-weight': 'bold', 'margin-bottom': '2px', 'font-size': '0.95rem', 'color': '#000' }}>
                                            Question {lvl1QuestionIdx() + 1} of {activeLevelPuzzles()[puzzle.id] ? activeLevelPuzzles()[puzzle.id].length : 3}
                                        </p>
                                        <div class="comic-stars">
                                            <For each={activeLevelPuzzles()[puzzle.id] || []}>
                                                {(_, idx) => (
                                                    <span class={`comic-star ${lvl1QuestionIdx() >= idx() ? 'active' : ''}`}>⭐</span>
                                                )}
                                            </For>
                                        </div>
                                    </div>

                                    {/* Mascot Briefing Bubble */}
                                    <div class="comic-mascot-row">
                                        <div class="comic-mascot">🤖</div>
                                        <div class="comic-speech-bubble-inside">
                                            <p class="comic-bubble">
                                                {activeLevelPuzzles()[puzzle.id] ? activeLevelPuzzles()[puzzle.id][lvl1QuestionIdx()].instruction : ""}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Question Game Board Area */}
                                    <div class="comic-game-area">
                                        {/* Render sorting cards or equation cards */}
                                        <Show when={activeLevelPuzzles()[puzzle.id] && activeLevelPuzzles()[puzzle.id][lvl1QuestionIdx()].type === "sort"} fallback={
                                            /* Equation Completion Case */
                                            <div class="comic-equation-row">
                                                <For each={activeLevelPuzzles()[puzzle.id] ? activeLevelPuzzles()[puzzle.id][lvl1QuestionIdx()].template : []}>
                                                    {(part) => {
                                                        if (part === "SLOT") {
                                                            const isFilled = () => lvl1Slots()[0] !== null;
                                                            return (
                                                                <div 
                                                                    class={`comic-slot ${isDragOver() ? 'dragover' : ''}`}
                                                                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                                                    onDragLeave={() => setIsDragOver(false)}
                                                                    onDrop={(e) => { setIsDragOver(false); handleDropToSlot(e, 0); }}
                                                                    onClick={() => handleSlotItemClick(0)}
                                                                >
                                                                    <Show when={isFilled()} fallback={<span class="comic-slot-hint">?</span>}>
                                                                        <div 
                                                                            class="comic-card animate-pulse-slow" 
                                                                            draggable="true" 
                                                                            onDragStart={(e) => handleDragStart(e, lvl1Slots()[0], 0, 'slot')}
                                                                            onClick={(e) => { e.stopPropagation(); handleSlotItemClick(0); }}
                                                                            style={{ 
                                                                                'background-color': getColorForItem(lvl1Slots()[0]),
                                                                                'transform': 'rotate(2deg)'
                                                                            }}
                                                                        >
                                                                            {lvl1Slots()[0]}
                                                                        </div>
                                                                    </Show>
                                                                </div>
                                                            );
                                                        } else {
                                                            return <span style={{ 'font-size': '2.8rem', 'font-weight': '900', 'color': '#000', 'text-shadow': '2px 2px 0px #fff' }}>{part}</span>;
                                                        }
                                                    }}
                                                </For>
                                            </div>
                                        }>
                                            {/* Sorting Case */}
                                            <div class="comic-slots-container">
                                                <For each={lvl1Slots()}>
                                                    {(slotItem, idx) => {
                                                        const isFilled = () => slotItem !== null;
                                                        return (
                                                            <div 
                                                                class={`comic-slot ${isDragOver() ? 'dragover' : ''}`}
                                                                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                                                onDragLeave={() => setIsDragOver(false)}
                                                                onDrop={(e) => { setIsDragOver(false); handleDropToSlot(e, idx()); }}
                                                                onClick={() => handleSlotItemClick(idx())}
                                                            >
                                                                <Show when={isFilled()} fallback={<span class="comic-slot-hint">Slot {idx() + 1}</span>}>
                                                                    <div 
                                                                        class="comic-card animate-pulse-slow" 
                                                                        draggable="true" 
                                                                        onDragStart={(e) => handleDragStart(e, slotItem, idx(), 'slot')}
                                                                        onClick={(e) => { e.stopPropagation(); handleSlotItemClick(idx()); }}
                                                                        style={{ 
                                                                            'background-color': getColorForItem(slotItem),
                                                                            'transform': `rotate(${idx() % 2 === 0 ? '-2deg' : '2deg'})`
                                                                        }}
                                                                    >
                                                                        {slotItem}
                                                                    </div>
                                                                </Show>
                                                            </div>
                                                        );
                                                    }}
                                                </For>
                                            </div>
                                        </Show>

                                        <p style={{ 'font-weight': 'bold', 'margin-top': '4px', 'font-size': '0.9rem', 'color': '#555' }}>
                                            👇 Drag cards into slots, or click cards to place/remove them! 👇
                                        </p>

                                        {/* Card Pool */}
                                        <div 
                                            class="comic-card-pool"
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => handleDropToPool(e)}
                                        >
                                            <For each={lvl1Items()}>
                                                {(item, idx) => (
                                                    <div 
                                                        class="comic-card animate-pulse-slow" 
                                                        draggable="true" 
                                                        onDragStart={(e) => handleDragStart(e, item, lvl1Items().indexOf(item), 'pool')}
                                                        onClick={() => handlePoolItemClick(item)}
                                                        style={{ 
                                                            'background-color': getColorForItem(item),
                                                            'transform': `rotate(${idx() % 2 === 0 ? '3deg' : '-3deg'})`
                                                        }}
                                                    >
                                                        {item}
                                                    </div>
                                                )}
                                            </For>
                                        </div>
                                    </div>

                                    {/* Actions & Feedback */}
                                    <div style={{ 'display': 'flex', 'flex-direction': 'column', 'align-items': 'center', 'width': '100%' }}>
                                        <button class="comic-btn comic-btn-check" onClick={handleComicSubmit}>
                                            🚀 CHECK ANSWER! 🚀
                                        </button>
                                        <div class={`feedback-msg font-rajdhani ${puzzleFeedbackType() === 'success' ? 'feedback-success' : 'feedback-error'}`} style={{ 'margin-top': '15px' }}>
                                            {puzzleFeedback()}
                                        </div>
                                    </div>
                                </div>
                            </Show>
                        </div>
                    );
                })()}
            </Show>
            
            {/* Loading Screen Overlay */}
            <Show when={loadingProgress() !== null}>
                <div id="loading-screen" class="overlay-screen active">
                    <div class="comic-popup comic-popup-loading">
                        <h1 class="comic-game-title font-orbitron" style={{ 'font-size': '2.4rem', 'text-shadow': '3px 3px 0px #fff, 5px 5px 0px #000' }}>INITIALIZING STATION!</h1>
                        <p class="comic-formula-instructions" style={{ 'font-weight': 'bold', 'margin-bottom': '5px' }}>LOADING LEVEL {level()}</p>
                        
                        <div class="comic-progress-container">
                            <div class="comic-progress-bar-fill" style={{ width: `${loadingProgress()}%` }}></div>
                        </div>
                        
                        <div class="comic-formula-display" style={{ 'font-size': '1.1rem', padding: '6px 12px', background: '#fff', border: '3px solid #000', 'box-shadow': '3px 3px 0px #000' }}>
                            {loadingProgress()}% OF ASSETS SECURED
                        </div>
                        
                        <div class="comic-mascot-row" style={{ 'margin-top': '15px', width: '100%', 'box-sizing': 'border-box' }}>
                            <div class="comic-mascot">🤖</div>
                            <div class="comic-speech-bubble-inside">
                                <p class="comic-bubble" style={{ 'font-size': '0.95rem' }}>
                                    <span style={{ 'font-family': 'Bangers', 'color': '#ff3b30' }}>TIP:</span> Decrypt vaults to get anti-gravity orbs and escape keys!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
}

export default App;
