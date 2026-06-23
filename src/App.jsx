import { useState, useEffect, useRef } from 'react';
import GameEngine from './game/engine';
import Vaults from './game/vaults';
import Player from './game/player';
import { Sound } from './game/sound';
import './App.css';

const LEVEL_CARDS_DATA = [
    { 
        id: 1, 
        name: "Level 1: Arabic City", 
        concept: "Euclid's HCF, Linear AP terms", 
        diff: "Basic", 
        color: "#f59e0b", 
        icon: "🕌", 
        difficultyProgress: 10,
        formulaText: "HCF(a,b) & a_n = a+(n-1)d",
        formulaDesc: "Use Euclid's Division Lemma (a = bq + r) to find Highest Common Factor. Find Arithmetic Progression nth term."
    },
    { 
        id: 2, 
        name: "Level 2: Cyberpunk City", 
        concept: "Quadratic Roots, Coordinates", 
        diff: "Easy", 
        color: "#00f0ff", 
        icon: "🏙️", 
        difficultyProgress: 50,
        formulaText: "x = -b±√D / 2a & d = √Δx²+Δy²",
        formulaDesc: "Solve quadratic equations using standard formula roots. Calculate distance between Cartesian coordinates."
    },
    { 
        id: 3, 
        name: "Level 3: MDC Complex", 
        concept: "Spherical Volumes & Probability", 
        diff: "Medium", 
        color: "#10b981", 
        icon: "🏢", 
        difficultyProgress: 100,
        formulaText: "V = 4/3*πr³ & P(E) = n(E)/n(S)",
        formulaDesc: "Determine volume of spherical reactor shields. Compute the probability of drawing red/black objects, and sum of zeroes."
    }
];

function App() {
    const canvasRef = useRef(null);
    const puzzleCanvasRef = useRef(null);
    const minimapRef = useRef(null);

    // Menu States
    const [gameStarted, setGameStarted] = useState(false);
    const [gameOver, setGameOver] = useState(false);
    const [victory, setVictory] = useState(false);
    const [unlockedLevels, setUnlockedLevels] = useState(() => {
        const saved = localStorage.getItem('math_vault_unlocked_level');
        return saved ? Math.min(parseInt(saved, 10), 3) : 3;
    });
    const [devBypass, setDevBypass] = useState(false);
    const [activeLevelIndex, setActiveLevelIndex] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(null);
    
    // Pause and Cursor state variables
    const [isPaused, setIsPaused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handlePrevLevel = () => {
        setActiveLevelIndex((prev) => (prev > 0 ? prev - 1 : LEVEL_CARDS_DATA.length - 1));
    };

    const handleNextLevel = () => {
        setActiveLevelIndex((prev) => (prev < LEVEL_CARDS_DATA.length - 1 ? prev + 1 : 0));
    };

    // Player HUD States
    const [hp, setHp] = useState(100);
    const [score, setScore] = useState(0);
    const [orbs, setOrbs] = useState(0);
    const [keys, setKeys] = useState(0);
    const [gravityInverted, setGravityInverted] = useState(false);
    const [gravityDuration, setGravityDuration] = useState(0);
    const [notification, setNotification] = useState("");
    const [prompt, setPrompt] = useState("");
    const [damageFlash, setDamageFlash] = useState(false);

    // Puzzle Modal Overlay States
    const [activePuzzle, setActivePuzzle] = useState(null);
    const [puzzleFeedback, setPuzzleFeedback] = useState("");
    const [puzzleFeedbackType, setPuzzleFeedbackType] = useState(""); // "success" or "error"
    const [shakeOverlay, setShakeOverlay] = useState(false);

    // Puzzle Inputs State
    const [algebraDial, setAlgebraDial] = useState(8);
    const [quadraticsRoot, setQuadraticsRoot] = useState(null);
    const [trigRatio, setTrigRatio] = useState(null);
    const [trigDistance, setTrigDistance] = useState(30);
    const [logicOutput, setLogicOutput] = useState(null);
    const [level, setLevel] = useState(1);

    // Initialize Game Engine once started
    useEffect(() => {
        if (!gameStarted || gameOver || victory) return;

        const handleHPChange = (newHp) => {
            setHp(newHp);
            if (newHp < hp) {
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

        GameEngine.start(canvasRef.current, {
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
                // Reset inputs dynamically based on vault details
                setAlgebraDial(vault.defaultVal !== undefined ? vault.defaultVal : 8);
                setQuadraticsRoot(null);
                setTrigRatio(null);
                setTrigDistance(vault.defaultVal !== undefined ? vault.defaultVal : 30);
                setLogicOutput(null);
                setPuzzleFeedback("");
                setPuzzleFeedbackType("");
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
        }, level);

        const handleLockChange = () => {
            if (document.pointerLockElement === canvasRef.current || document.pointerLockElement === document.body) {
                setIsLocked(true);
            } else {
                setIsLocked(false);
            }
        };
        document.addEventListener('pointerlockchange', handleLockChange);

        // Lock controls on start
        setTimeout(() => {
            if (GameEngine.getControls()) {
                GameEngine.getControls().lock();
            }
        }, 300);

        return () => {
            document.removeEventListener('pointerlockchange', handleLockChange);
            GameEngine.shutdown();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameStarted]);

    // Handle Puzzle sub-scene canvas rendering when open
    useEffect(() => {
        if (!activePuzzle || !puzzleCanvasRef.current) return;

        const cleanup = Vaults.setupPuzzleCanvas(
            puzzleCanvasRef.current, 
            activePuzzle.id
        );

        return () => {
            cleanup();
        };
    }, [activePuzzle]);

    // Handle Minimap rendering loop
    useEffect(() => {
        if (!gameStarted || gameOver || victory) return;
        let animationId;
        
        const drawMinimap = () => {
            animationId = requestAnimationFrame(drawMinimap);
            
            const canvas = minimapRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            
            const data = GameEngine.getMinimapData();
            if (!data || !data.grid) return;
            
            const { grid, openWorld, boundSize, buildingFootprints: footprints, playerPos, enemies, vaults, portalActive, portalCell, yaw } = data;
            
            // Direct DOM manipulation for smooth, lag-free navigation HUD updates
            const headingEl = document.getElementById('nav-heading');
            const vaultEl = document.getElementById('nav-nearest-vault');
            const portalStatusEl = document.getElementById('nav-portal-status');

            if (headingEl) {
                let deg = (-yaw * 180 / Math.PI) % 360;
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
            
            // Map display range (how many world-units fit in the minimap radius)
            // Center the entire map statically on (0, 0)
            const mapRange = openWorld ? (boundSize + 4.0) : (boundSize + 2.0);
            const mapRadius = Math.min(cx, cy) - 2;
            
            // Convert world pos to static minimap pixel (North-Up, stable, centered on 0,0)
            const worldToMinimap = (wx, wz) => {
                // Positive X is East (right), positive Z is South (down).
                // So East goes right, North (negative Z) goes up.
                const rx = wx;
                const ry = -wz;
                
                return {
                    x: cx + (rx / mapRange) * mapRadius,
                    y: cy - (ry / mapRange) * mapRadius
                };
            };

            // 1. Clear with a premium high-tech radial gradient background
            const bgGradient = ctx.createRadialGradient(cx, cy, 10, cx, cy, mapRadius);
            bgGradient.addColorStop(0, '#0a101d');
            bgGradient.addColorStop(0.8, '#05080f');
            bgGradient.addColorStop(1, '#020408');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, cw, ch);
            
            // Circular clip mask
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, mapRadius, 0, Math.PI * 2);
            ctx.clip();
            
            // 2. Draw static level grid lines
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.07)';
            ctx.lineWidth = 0.8;
            const gridStep = openWorld ? 10 : 4;
            // Draw vertical grid lines
            for (let gx = -Math.ceil(mapRange/gridStep)*gridStep; gx <= mapRange; gx += gridStep) {
                const a = worldToMinimap(gx, -mapRange);
                const b = worldToMinimap(gx, mapRange);
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
            // Draw horizontal grid lines
            for (let gz = -Math.ceil(mapRange/gridStep)*gridStep; gz <= mapRange; gz += gridStep) {
                const a = worldToMinimap(-mapRange, gz);
                const b = worldToMinimap(mapRange, gz);
                ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }

            // 3. Draw radar range/scan rings (premium graphic)
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(cx, cy, mapRadius * 0.33, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, mapRadius * 0.66, 0, Math.PI * 2);
            ctx.stroke();

            // 4. Draw a sweeping radar line (premium visual effect)
            const sweepAngle = (performance.now() * 0.0012) % (Math.PI * 2);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(sweepAngle) * mapRadius, cy + Math.sin(sweepAngle) * mapRadius);
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Draw maze walls (for grid-based levels)
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
                            const tr = worldToMinimap(wx + 2, wz - 2);
                            const br = worldToMinimap(wx + 2, wz + 2);
                            const bl = worldToMinimap(wx - 2, wz + 2);
                            
                            ctx.fillStyle = cell === 1 ? 'rgba(255, 0, 122, 0.35)' : 'rgba(168, 85, 247, 0.4)';
                            ctx.beginPath();
                            ctx.moveTo(tl.x, tl.y);
                            ctx.lineTo(tr.x, tr.y);
                            ctx.lineTo(br.x, br.y);
                            ctx.lineTo(bl.x, bl.y);
                            ctx.closePath();
                            ctx.fill();
                            
                            ctx.strokeStyle = cell === 1 ? 'rgba(255, 0, 122, 0.6)' : 'rgba(168, 85, 247, 0.7)';
                            ctx.lineWidth = 0.5;
                            ctx.stroke();
                        }
                    }
                }
            }
            
            // (Building footprints drawing loop is completely removed per user request)
            
            // Draw active vaults with a glowing shadow
            vaults.forEach(v => {
                if (v.unlocked) return;
                const pos = worldToMinimap(v.position.x, v.position.z);
                const pulse = 1.0 + Math.sin(performance.now() * 0.008 + v.id) * 0.25;
                ctx.save();
                ctx.shadowColor = v.opened ? '#39ff14' : '#bd00ff';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 4.5, 0, Math.PI * 2);
                ctx.fillStyle = v.opened ? '#39ff14' : '#bd00ff';
                ctx.fill();
                ctx.restore();
                
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 8.0 * pulse, 0, Math.PI * 2);
                ctx.strokeStyle = v.opened ? 'rgba(57, 255, 20, 0.35)' : 'rgba(189, 0, 255, 0.35)';
                ctx.lineWidth = 1;
                ctx.stroke();
            });
            
            // Draw active enemies with a glowing shadow (accurate tracking)
            enemies.forEach((e, idx) => {
                if (e.dead) return;
                const pos = worldToMinimap(e.mesh.position.x, e.mesh.position.z);
                const pulse = 1.0 + Math.sin(performance.now() * 0.01 + idx) * 0.22;
                ctx.save();
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
                ctx.fillStyle = '#ef4444';
                ctx.fill();
                ctx.restore();
                
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 6.5 * pulse, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.38)';
                ctx.lineWidth = 1;
                ctx.stroke();
            });
            
            // Draw portal
            if (portalActive && portalCell) {
                const portalWorldX = -halfW + portalCell.x * 4 + 2;
                const portalWorldZ = -halfD + portalCell.z * 4 + 2;
                const pos = worldToMinimap(portalWorldX, portalWorldZ);
                const pulse = 1.0 + Math.sin(performance.now() * 0.012) * 0.28;
                ctx.save();
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 5.5, 0, Math.PI * 2);
                ctx.fillStyle = '#00f0ff';
                ctx.fill();
                ctx.restore();

                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 10.0 * pulse, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
                ctx.lineWidth = 1.2;
                ctx.stroke();
            }
            
            // Draw player blip at their moving world coordinate, rotating with yaw direction
            const pPos = worldToMinimap(playerPos.x, playerPos.z);
            
            ctx.save();
            ctx.translate(pPos.x, pPos.y);
            // Camera yaw angle negated to rotate player blip correctly clockwise on canvas
            ctx.rotate(-yaw);
            
            // Draw player FOV cone (pointing UP relative to rotated context)
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, 32, -Math.PI / 2 - 0.35, -Math.PI / 2 + 0.35);
            ctx.closePath();
            const fovGradient = ctx.createRadialGradient(0, 0, 2, 0, 0, 32);
            fovGradient.addColorStop(0, 'rgba(57, 255, 20, 0.45)');
            fovGradient.addColorStop(1, 'rgba(57, 255, 20, 0)');
            ctx.fillStyle = fovGradient;
            ctx.fill();

            // Draw player green triangle blip (pointing UP relative to rotated context)
            ctx.beginPath();
            ctx.moveTo(0, -7);
            ctx.lineTo(-5, 5);
            ctx.lineTo(5, 5);
            ctx.closePath();
            ctx.fillStyle = '#39ff14';
            ctx.shadowColor = '#39ff14';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.shadowBlur = 0; // reset shadow
            
            ctx.restore();
            ctx.restore(); // Remove circular clip
            
            // Draw circular border with beautiful glow
            ctx.save();
            ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(cx, cy, mapRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
            ctx.lineWidth = 1.8;
            ctx.stroke();
            ctx.restore();
            
            // Compass labels (static directions: N is always UP, etc.)
            ctx.font = 'bold 9px Orbitron, monospace';
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
                ctx.fillStyle = d.label === 'N' ? '#ef4444' : 'rgba(148, 163, 184, 0.8)';
                ctx.fillText(d.label, lx, ly);
            });
        };
        
        drawMinimap();
        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [gameStarted, gameOver, victory]);

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
        
        if (gameStarted) {
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
        if (isPaused) {
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

    // Math Input Handlers
    const handleAlgebraChange = (dir) => {
        let next = algebraDial;
        const minVal = activePuzzle.min !== undefined ? activePuzzle.min : 1;
        const maxVal = activePuzzle.max !== undefined ? activePuzzle.max : 20;
        if (dir === 'inc' && algebraDial < maxVal) next++;
        if (dir === 'dec' && algebraDial > minVal) next--;
        setAlgebraDial(next);
        Vaults.updateVisualizer(activePuzzle.id, next);
        Sound.playShoot();
    };

    const handleAlgebraSlider = (e) => {
        const val = parseInt(e.target.value);
        setAlgebraDial(val);
        Vaults.updateVisualizer(activePuzzle.id, val);
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
        if (activePuzzle.options) {
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
        Vaults.updateVisualizer(activePuzzle.id, val);
    };



    // Verify Puzzle solution
    const handleSubmitAnswer = () => {
        let isCorrect = false;
        let errMsg = "";

        const ans = activePuzzle.ans;

        if (activePuzzle.type === "algebra") {
            if (algebraDial === ans) {
                isCorrect = true;
            } else {
                errMsg = `Incorrect: Current w is ${algebraDial} (Perimeter formula: ${activePuzzle.formula}).`;
            }
        } 
        else if (activePuzzle.type === "geometry") {
            if (algebraDial === ans) {
                isCorrect = true;
            } else {
                errMsg = `Incorrect visual value. Expected: ${ans}. Formula: ${activePuzzle.formula}`;
            }
        }
        else if (activePuzzle.type === "quadratics") {
            if (quadraticsRoot === ans) {
                isCorrect = true;
            } else {
                errMsg = `Incorrect root selected. Formula: ${activePuzzle.formula}`;
            }
        } 
        else if (activePuzzle.type === "trig") {
            if (activePuzzle.options) {
                if (trigRatio === ans) {
                    isCorrect = true;
                } else {
                    errMsg = `Incorrect value selected. Formula: ${activePuzzle.formula}`;
                }
            } else {
                if (trigRatio === 'tan' && trigDistance === ans) {
                    isCorrect = true;
                } else {
                    if (trigRatio !== 'tan') {
                        errMsg = "Check selected trigonometric ratio formula.";
                    } else {
                        errMsg = `Lighthouse laser is not locked (Current: ${trigDistance}m). Formula: ${activePuzzle.formula}`;
                    }
                }
            }
        } 
        else if (activePuzzle.type === "logic") {
            if (logicOutput === ans) {
                isCorrect = true;
            } else {
                errMsg = `Incorrect logic gate output value. Formula: ${activePuzzle.formula}`;
            }
        }

        if (isCorrect) {
            setPuzzleFeedback("VAULT SECURED! UNLOCKING CORE...");
            setPuzzleFeedbackType("success");
            
            // Mark vault unlocked in three.js scene (spawns coins)
            Vaults.markVaultUnlocked(activePuzzle.id);
            Player.incrementScore(); // updates score and checks victory

            setTimeout(() => {
                setActivePuzzle(null);
                if (GameEngine.getControls()) {
                    GameEngine.getControls().lock();
                }
            }, 1500);
        } else {
            setPuzzleFeedback(errMsg || "Verification Failed. Decryption Error.");
            setPuzzleFeedbackType("error");
            
            // Deal damage (6 HP - lighter balance!)
            Player.damage(6);
            
            // Trigger overlay shake
            setShakeOverlay(true);
            setTimeout(() => setShakeOverlay(false), 450);
        }
    };

    // Calculate SVG Timer variables
    const maxTimer = 30;
    const svgCircumference = 2 * Math.PI * 16;
    const svgOffset = svgCircumference * (1 - (gravityDuration / maxTimer));

    return (
        <div className="App">
            {/* Title / Startup Screen */}
            {!gameStarted && (
                <div id="start-screen" className="overlay-screen active comic-theme">
                    {/* Comic Top Bar */}
                    <div className="comic-top-bar animate-panel-pop">
                        <div className="comic-title-container">
                            <h1 className="comic-game-title font-orbitron">MATH VAULT</h1>
                            <div className="comic-burst animate-bounce-slow">
                                <span className="burst-text font-orbitron">ANTI-GRAVITY!</span>
                            </div>
                        </div>
                        <label className="dev-bypass-toggle font-orbitron comic-bypass">
                            <input 
                                type="checkbox" 
                                checked={devBypass} 
                                onChange={(e) => setDevBypass(e.target.checked)} 
                            />
                            <span className="toggle-slider"></span>
                            <span className="toggle-label">DEV BYPASS</span>
                        </label>
                    </div>

                    {/* Comic Book Spread Slider */}
                    <div className="comic-slider-container">
                        <button className="comic-nav-arrow prev font-orbitron animate-pulse-slow" onClick={handlePrevLevel}>
                            &lsaquo;
                        </button>

                        <div className="comic-spread">
                            {/* Left Page: Mission Dossier */}
                            <div className="comic-panel left-panel-dossier animate-panel-pop" key={`left-${activeLevelIndex}`}>
                                <div className="panel-dots-bg"></div>
                                <div className="panel-border-skew"></div>
                                <div className="panel-content">
                                    <div className="panel-badge-row">
                                        <span className="panel-badge-level font-orbitron" style={{ color: LEVEL_CARDS_DATA[activeLevelIndex].color }}>
                                            {LEVEL_CARDS_DATA[activeLevelIndex].id > unlockedLevels && !devBypass ? '🔒 LOCKED' : `LVL ${LEVEL_CARDS_DATA[activeLevelIndex].id}`}
                                        </span>
                                        <span className={`panel-badge-diff font-orbitron ${LEVEL_CARDS_DATA[activeLevelIndex].diff.toLowerCase().replace(" ", "-")}`}>
                                            {LEVEL_CARDS_DATA[activeLevelIndex].diff}
                                        </span>
                                    </div>
                                    <div className="panel-main-info">
                                        <div className="comic-icon-large">
                                            {LEVEL_CARDS_DATA[activeLevelIndex].id > unlockedLevels && !devBypass ? '🔒' : LEVEL_CARDS_DATA[activeLevelIndex].icon}
                                        </div>
                                        <h2 className="comic-level-name font-orbitron">
                                            {LEVEL_CARDS_DATA[activeLevelIndex].name.split(': ')[1]}
                                        </h2>
                                        <div className="comic-concept-badge font-rajdhani">
                                            <span className="concept-label font-orbitron">TARGET CONCEPTS:</span>
                                            <p className="concept-text">{LEVEL_CARDS_DATA[activeLevelIndex].concept}</p>
                                        </div>
                                    </div>
                                    <div className="comic-danger-progress">
                                        <div className="danger-labels font-orbitron">
                                            <span>DANGER RATING</span>
                                            <span>{LEVEL_CARDS_DATA[activeLevelIndex].difficultyProgress}%</span>
                                        </div>
                                        <div className="danger-track">
                                            <div 
                                                className="danger-fill" 
                                                style={{ 
                                                    width: `${LEVEL_CARDS_DATA[activeLevelIndex].difficultyProgress}%`,
                                                    background: LEVEL_CARDS_DATA[activeLevelIndex].id > unlockedLevels && !devBypass ? '#4b5563' : LEVEL_CARDS_DATA[activeLevelIndex].color
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Page: Formula File */}
                            <div className="comic-panel right-panel-formula animate-panel-pop" key={`right-${activeLevelIndex}`}>
                                <div className="panel-dots-bg"></div>
                                <div className="panel-border-skew"></div>
                                <div className="panel-content">
                                    <div className="formula-header-tab font-orbitron">
                                        📁 DECRYPTION SCHEMA
                                    </div>
                                    <div className="formula-dossier-body font-rajdhani">
                                        <div className="comic-formula-display font-orbitron">
                                            {LEVEL_CARDS_DATA[activeLevelIndex].id > unlockedLevels && !devBypass ? 'CLASSIFIED' : LEVEL_CARDS_DATA[activeLevelIndex].formulaText}
                                        </div>
                                        <p className="comic-formula-instructions">
                                            {LEVEL_CARDS_DATA[activeLevelIndex].id > unlockedLevels && !devBypass 
                                                ? 'DECRYPT PREVIOUS VAULTS TO DISCLOSE FORMULA SPECIFICATIONS.' 
                                                : LEVEL_CARDS_DATA[activeLevelIndex].formulaDesc}
                                        </p>
                                    </div>
                                    <div className="comic-launch-panel">
                                        {LEVEL_CARDS_DATA[activeLevelIndex].id > unlockedLevels && !devBypass ? (
                                            <div className="comic-warning-stamp font-orbitron">
                                                LOCKED!
                                            </div>
                                        ) : (
                                            <button 
                                                className="comic-launch-button font-orbitron"
                                                onClick={() => {
                                                    setLevel(LEVEL_CARDS_DATA[activeLevelIndex].id);
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

                        <button className="comic-nav-arrow next font-orbitron animate-pulse-slow" onClick={handleNextLevel}>
                            &rsaquo;
                        </button>
                    </div>

                    {/* Comic Bottom Control & Mascot Briefing */}
                    <div className="comic-bottom-panel animate-panel-pop">
                        {/* Controls Panel */}
                        <div className="comic-panel bottom-controls font-rajdhani">
                            <div className="panel-border-skew"></div>
                            <div className="panel-content">
                                <h3 className="controls-heading font-orbitron">🎮 MOVEMENT BRIEFING</h3>
                                <div className="controls-grid">
                                    <div className="control-item"><span className="comic-key">W</span><span className="comic-key">A</span><span className="comic-key">S</span><span className="comic-key">D</span> MOVE</div>
                                    <div className="control-item"><span className="comic-key">G</span> ANTI-GRAVITY</div>
                                    <div className="control-item"><span className="comic-key">E</span> DECRYPT / INTERACT</div>
                                    <div className="control-item"><span className="comic-key">CLICK</span> SHOTGUN</div>
                                </div>
                            </div>
                        </div>

                        {/* Level Navigation Dots Selector */}
                        <div className="comic-quick-selector font-orbitron">
                            {LEVEL_CARDS_DATA.map((card, idx) => {
                                const cardIsLocked = card.id > unlockedLevels && !devBypass;
                                const isSelected = idx === activeLevelIndex;
                                return (
                                    <button
                                        key={card.id}
                                        className={`comic-selector-dot ${isSelected ? 'selected' : ''} ${cardIsLocked ? 'locked' : ''}`}
                                        onClick={() => setActiveLevelIndex(idx)}
                                        style={{ 
                                            borderColor: isSelected ? card.color : '#000',
                                            backgroundColor: isSelected ? card.color : (cardIsLocked ? 'rgba(0,0,0,0.5)' : '#1e293b')
                                        }}
                                    >
                                        {cardIsLocked ? '🔒' : card.id}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Mascot Speech Bubble */}
                        <div className="comic-briefing">
                            <div className="mascot-badge animate-bounce-slow">🤖</div>
                            <div className="comic-speech-bubble font-rajdhani">
                                <div className="bubble-pointer"></div>
                                <p>
                                    Decrypt the math chests in each zone, defeat dynamic insect guards, and secure the keys to escape! Use your holographic heading dashboard to navigate.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Game Screen */}
            {gameStarted && (
                <>
                    <canvas 
                        id="game-canvas" 
                        ref={canvasRef}
                        className={(!isLocked && isHovered) ? 'hover-unlocked' : ''}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                    ></canvas>
                    <div id="crosshair"></div>

                    {/* HUD Overlay */}
                    <div id="hud" className={gravityInverted ? 'gravity-inverted' : ''}>
                        {/* Top Center Pause Control */}
                        <button 
                            className="hud-pause-btn font-orbitron" 
                            style={{ 
                                pointerEvents: 'auto',
                                position: 'absolute',
                                top: '20px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 100,
                                background: 'var(--bg-glass)',
                                border: '1px solid var(--border-glass)',
                                color: 'var(--color-primary)',
                                textShadow: 'var(--glow-cyan)',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.85rem'
                            }}
                            onClick={handlePauseToggle}
                        >
                            {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
                        </button>
                        
                        {/* Stats Panel */}
                        <div className="hud-panel left-panel">
                            <div className="stat-row">
                                <span className="stat-label font-orbitron">HP</span>
                                <div className="bar-container">
                                    <div className="bar-fill hp-fill" style={{ width: `${hp}%` }}></div>
                                </div>
                                <span className="stat-value font-orbitron">{Math.round(hp)}</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label font-orbitron">LEVEL</span>
                                <span className="stat-value text-gold font-orbitron">{level} / 9</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label font-orbitron">DECRYPTED</span>
                                <span className="stat-value text-gold font-orbitron">{score} / 3</span>
                            </div>
                            <div className="stat-row">
                                <span className="stat-label font-orbitron">KEYS HELD</span>
                                <span className="stat-value text-gold font-orbitron">{keys} / 3 🔑</span>
                            </div>
                        </div>


                        {/* Right HUD Panel (Minimap Only) */}
                        <div className="hud-panel right-panel">
                            <div className="minimap-container">
                                <canvas ref={minimapRef} width="180" height="180" id="minimap-canvas"></canvas>
                            </div>
                        </div>
                    </div>

                    {/* Damage and Inversion Vignettes */}
                    <div id="damage-vignette" className={damageFlash ? 'flash' : ''}></div>
                    <div id="gravity-vignette" className={gravityInverted ? 'active' : ''}></div>

                    {/* Action Toast Prompts */}
                    <div id="action-prompt" className={prompt ? 'font-rajdhani active' : 'font-rajdhani'}>
                        {prompt || notification}
                    </div>
                </>
            )}


            {/* Pause Screen Overlay */}
            {isPaused && (
                <div id="pause-screen" className="overlay-screen active" style={{ zIndex: 9999 }}>
                    <div className="glass-container menu-box">
                        <h1 className="game-title font-orbitron" style={{ color: 'var(--color-primary)' }}>GAME PAUSED</h1>
                        <p className="game-subtitle font-rajdhani">Click Resume or hit Pause to return to the mission.</p>
                        <button onClick={handleResume} className="glow-button font-orbitron" style={{ width: '200px' }}>RESUME</button>
                    </div>
                </div>
            )}

            {/* Game Over Screen */}
            {gameOver && (
                <div id="end-screen" className="overlay-screen active">
                    <div className="glass-container menu-box">
                        <h1 className="game-title font-orbitron" style={{ color: 'var(--color-accent)' }}>SYSTEM FAILURE</h1>
                        <p className="game-subtitle font-orbitron">Your health dropped to 0%.</p>
                        <button onClick={handleRedeploy} className="glow-button font-orbitron">REDEPLOY</button>
                    </div>
                </div>
            )}

            {/* Victory Screen */}
            {victory && (
                <div id="end-screen" className="overlay-screen active">
                    <div className="glass-container menu-box">
                        <h1 className="game-title font-orbitron" style={{ color: 'var(--color-success)' }}>MISSION SECURED</h1>
                        <p className="game-subtitle font-orbitron">All treasure vaults decrypted.</p>
                        <button onClick={handleRedeploy} className="glow-button font-orbitron">REPLAY</button>
                    </div>
                </div>
            )}

            {/* Math Puzzle Modal Overlay */}
            {activePuzzle && (
                <div id="puzzle-overlay" className="overlay-screen active">
                    <div className={`puzzle-container glass-container ${shakeOverlay ? 'shake' : ''}`}>
                        
                        {/* Sidebar controls */}
                        <div className="puzzle-sidebar">
                            <div className="puzzle-header">
                                <span className="zone-badge font-orbitron">
                                    {activePuzzle.type.toUpperCase()} VAULT
                                </span>
                                <h2 className="font-orbitron">
                                    {activePuzzle.name}
                                </h2>
                            </div>
                            
                            <div className="puzzle-body font-rajdhani">
                                {(activePuzzle.type === "algebra" || activePuzzle.type === "geometry") && (
                                    <>
                                        <p className="problem-description">{activePuzzle.problem}</p>
                                        <div className="input-group">
                                            <span className="input-label">{activePuzzle.label || "Value"}</span>
                                            {activePuzzle.options ? (
                                                <div className="button-grid">
                                                    {activePuzzle.options.map(opt => (
                                                        <button 
                                                            key={opt}
                                                            onClick={() => {
                                                                setAlgebraDial(opt);
                                                                Vaults.updateVisualizer(activePuzzle.id, opt);
                                                                Sound.playPickup();
                                                            }}
                                                            className={algebraDial === opt ? "ratio-btn active" : "ratio-btn"}
                                                        >
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                activePuzzle.max - activePuzzle.min > 30 ? (
                                                    <div style={{ marginTop: '10px' }}>
                                                        <span className="input-label">Current: <span className="text-gold">{algebraDial}</span></span>
                                                        <input 
                                                            type="range" 
                                                            min={activePuzzle.min} 
                                                            max={activePuzzle.max} 
                                                            value={algebraDial} 
                                                            onChange={handleAlgebraSlider}
                                                            className="cyber-slider" 
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="dial-controls">
                                                        <button onClick={() => handleAlgebraChange('dec')} className="dial-btn">-</button>
                                                        <span className="dial-value">{algebraDial}</span>
                                                        <button onClick={() => handleAlgebraChange('inc')} className="dial-btn">+</button>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </>
                                )}

                                {activePuzzle.type === "quadratics" && (
                                    <>
                                        <p className="problem-description">{activePuzzle.problem}</p>
                                        <button onClick={handleQuadraticsLaunch} className="glow-button font-orbitron" style={{ marginBottom: '15px' }}>
                                            LAUNCH PROJECTILE
                                        </button>
                                        {activePuzzle.options && (
                                            <div className="input-group">
                                                <span className="input-label">Select Ground Intersection Root</span>
                                                <div className="button-grid">
                                                    {activePuzzle.options.map(opt => (
                                                        <button 
                                                            key={opt}
                                                            onClick={() => handleQuadraticsSelectRoot(opt)} 
                                                            className={quadraticsRoot === opt ? "ratio-btn active" : "ratio-btn"}
                                                        >
                                                            t = {opt}s
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {activePuzzle.type === "trig" && (
                                    <>
                                        <p className="problem-description">{activePuzzle.problem}</p>
                                        {activePuzzle.options ? (
                                            <div className="input-group">
                                                <span className="input-label">Select Dimension Value</span>
                                                <div className="button-grid">
                                                    {activePuzzle.options.map(opt => (
                                                        <button 
                                                            key={opt}
                                                            onClick={() => handleTrigSelectRatio(opt)}
                                                            className={trigRatio === opt ? "ratio-btn active" : "ratio-btn"}
                                                        >
                                                            {opt}m
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="input-group">
                                                    <span className="input-label">Select Trig Ratio Formula</span>
                                                    <div className="button-grid">
                                                        {['sin', 'cos', 'tan'].map(ratio => (
                                                            <button 
                                                                key={ratio}
                                                                onClick={() => handleTrigSelectRatio(ratio)}
                                                                className={trigRatio === ratio ? "ratio-btn active" : "ratio-btn"}
                                                            >
                                                                {ratio} 30°
                              </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="input-group" style={{ marginTop: '10px' }}>
                                                    <span className="input-label">Distance (d): <span className="text-gold">{trigDistance}m</span></span>
                                                    <input 
                                                        type="range" 
                                                        min={activePuzzle.min} 
                                                        max={activePuzzle.max} 
                                                        value={trigDistance} 
                                                        onChange={handleTrigSlider}
                                                        className="cyber-slider" 
                                                    />
                                                </div>
                                            </>
                                        )}
                                    </>
                                )}

                                {activePuzzle.type === "logic" && (
                                    <>
                                        <p className="problem-description">{activePuzzle.problem}</p>
                                        <div className="input-group">
                                            <span className="input-label">Select Gate Output</span>
                                            <div className="button-grid">
                                                <button 
                                                    onClick={() => setLogicOutput(0)} 
                                                    className={logicOutput === 0 ? "ratio-btn active" : "ratio-btn"}
                                                >
                                                    Output Y = 0
                                                </button>
                                                <button 
                                                    onClick={() => setLogicOutput(1)} 
                                                    className={logicOutput === 1 ? "ratio-btn active" : "ratio-btn"}
                                                >
                                                    Output Y = 1
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="puzzle-actions">
                                <button onClick={handleSubmitAnswer} className="glow-button font-orbitron">SUBMIT ANSWER</button>
                                <button onClick={handleAbandonVault} className="exit-button font-orbitron">ABANDON VAULT</button>
                            </div>
                            
                            <div className={`feedback-msg font-rajdhani ${puzzleFeedbackType === 'success' ? 'feedback-success' : 'feedback-error'}`}>
                                {puzzleFeedback}
                            </div>
                        </div>

                        {/* Visualizer Canvas */}
                        <div className="puzzle-visualizer">
                            <div className="visualizer-header font-orbitron">HOLOGRAPHIC DIAGRAM SYSTEM</div>
                            <div className="canvas-wrapper">
                                <canvas ref={puzzleCanvasRef} id="puzzle-canvas"></canvas>
                            </div>
                            <div className="visualizer-footer font-rajdhani">
                                Drag to rotate model. Look for coordinates and dimensions.
                            </div>
                        </div>

                    </div>
                </div>
            )}
            
            {/* Loading Screen Overlay */}
            {loadingProgress !== null && (
                <div id="loading-screen" className="overlay-screen active">
                    <div className="glass-container loading-box">
                        <div className="loading-dots-bg"></div>
                        <h1 className="loading-title font-orbitron">INITIALIZING SYSTEMS</h1>
                        <p className="loading-subtitle font-orbitron">LOADING LEVEL {level}</p>
                        
                        <div className="progress-container">
                            <div className="progress-bar-glow"></div>
                            <div className="progress-bar-fill" style={{ width: `${loadingProgress}%` }}></div>
                        </div>
                        
                        <div className="progress-text font-rajdhani">
                            {loadingProgress}% OF ASSETS SECURED
                        </div>
                        
                        <div className="loading-tip font-rajdhani">
                            <span className="tip-prefix font-orbitron">TIP:</span> Decrypt vaults to get anti-gravity orbs and escape keys.
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
