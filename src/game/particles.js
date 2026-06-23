/**
 * Particle systems manager using Three.js in ES6
 */
import * as THREE from 'three';

const Particles = (() => {
    let sceneRef;
    let ambientParticles;
    const activeSparks = [];
    const sparkTextures = new Map();
    const sparkMaterials = new Map();
    
    const particleCount = 150; // Optimized down for lag reduction
    const boxSize = 80;
    let positions;
    let velocities;
    
    function init(scene) {
        sceneRef = scene;
        
        // 1. Create Ambient Space Dust
        const geometry = new THREE.BufferGeometry();
        positions = new Float32Array(particleCount * 3);
        velocities = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * boxSize;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 20 + 10;
            positions[i * 3 + 2] = (Math.random() - 0.5) * boxSize;
            
            velocities[i * 3] = (Math.random() - 0.5) * 0.08;
            velocities[i * 3 + 1] = -Math.random() * 0.08 - 0.03;
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 16;
        pCanvas.height = 16;
        const pCtx = pCanvas.getContext('2d');
        const gradient = pCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 0, 122, 0.7)');
        gradient.addColorStop(1, 'rgba(255, 0, 122, 0)');
        pCtx.fillStyle = gradient;
        pCtx.fillRect(0, 0, 16, 16);
        
        const texture = new THREE.CanvasTexture(pCanvas);
        
        const material = new THREE.PointsMaterial({
            size: 0.28,
            map: texture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        ambientParticles = new THREE.Points(geometry, material);
        sceneRef.add(ambientParticles);
    }
    
    function getSparkMaterial(color) {
        let key = 'cyan';
        if (color === 0xffd700) {
            key = 'gold';
        } else if (color === 0xff007a || color === 0xff0044 || color === 0xff0022) {
            key = 'pink';
        }
        
        if (sparkMaterials.has(key)) {
            return sparkMaterials.get(key);
        }
        
        const sCanvas = document.createElement('canvas');
        sCanvas.width = 16;
        sCanvas.height = 16;
        const sCtx = sCanvas.getContext('2d');
        const gradient = sCtx.createRadialGradient(8, 8, 0, 8, 8, 8);
        const colStr = key === 'gold' ? '255, 215, 0' : (key === 'pink' ? '255, 0, 122' : '0, 240, 255');
        gradient.addColorStop(0, `rgba(255, 255, 255, 1)`);
        gradient.addColorStop(0.3, `rgba(${colStr}, 1)`);
        gradient.addColorStop(1, `rgba(${colStr}, 0)`);
        sCtx.fillStyle = gradient;
        sCtx.fillRect(0, 0, 16, 16);
        
        const texture = new THREE.CanvasTexture(sCanvas);
        const material = new THREE.PointsMaterial({
            size: 0.4,
            map: texture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        sparkTextures.set(key, texture);
        sparkMaterials.set(key, material);
        return material;
    }

    function spawnSparks(position, color = 0x00f0ff, count = 12) {
        const geometry = new THREE.BufferGeometry();
        const pts = new Float32Array(count * 3);
        const vels = [];
        
        for (let i = 0; i < count; i++) {
            pts[i * 3] = position.x;
            pts[i * 3 + 1] = position.y;
            pts[i * 3 + 2] = position.z;
            
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const speed = Math.random() * 6 + 2;
            
            vels.push({
                x: Math.sin(phi) * Math.cos(theta) * speed,
                y: Math.sin(phi) * Math.sin(theta) * speed + 1,
                z: Math.cos(phi) * speed
            });
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(pts, 3));
        
        const material = getSparkMaterial(color);
        const points = new THREE.Points(geometry, material);
        sceneRef.add(points);
        
        activeSparks.push({
            points: points,
            geometry: geometry,
            positionsArray: pts,
            velocities: vels,
            age: 0,
            maxAge: 0.5,
            color: color
        });
    }

    function spawnGoldExplosion(position, count = 30) {
        spawnSparks(position, 0xffd700, count);
    }
    
    function update(deltaTime, gravityInverted) {
        if (ambientParticles) {
            const posAttr = ambientParticles.geometry.attributes.position;
            const positionsArray = posAttr.array;
            
            const targetYDrift = gravityInverted ? 0.25 : -0.25;
            
            for (let i = 0; i < particleCount; i++) {
                velocities[i * 3 + 1] += (targetYDrift - velocities[i * 3 + 1]) * deltaTime * 2;
                
                positionsArray[i * 3] += velocities[i * 3] * deltaTime;
                positionsArray[i * 3 + 1] += velocities[i * 3 + 1] * deltaTime;
                positionsArray[i * 3 + 2] += velocities[i * 3 + 2] * deltaTime;
                
                if (positionsArray[i * 3 + 1] > 20) {
                    positionsArray[i * 3 + 1] = 0;
                } else if (positionsArray[i * 3 + 1] < 0) {
                    positionsArray[i * 3 + 1] = 20;
                }
                
                if (Math.abs(positionsArray[i * 3]) > boxSize / 2) {
                    positionsArray[i * 3] = (Math.random() - 0.5) * boxSize;
                }
                if (Math.abs(positionsArray[i * 3 + 2]) > boxSize / 2) {
                    positionsArray[i * 3 + 2] = (Math.random() - 0.5) * boxSize;
                }
            }
            posAttr.needsUpdate = true;
        }
        
        const gravityY = gravityInverted ? 12.0 : -12.0;
        
        for (let s = activeSparks.length - 1; s >= 0; s--) {
            const spark = activeSparks[s];
            spark.age += deltaTime;
            
            if (spark.age >= spark.maxAge) {
                sceneRef.remove(spark.points);
                spark.geometry.dispose();
                activeSparks.splice(s, 1);
                continue;
            }
            
            const arr = spark.positionsArray;
            for (let i = 0; i < arr.length / 3; i++) {
                const vel = spark.velocities[i];
                vel.y += gravityY * deltaTime;
                
                arr[i * 3] += vel.x * deltaTime;
                arr[i * 3 + 1] += vel.y * deltaTime;
                arr[i * 3 + 2] += vel.z * deltaTime;
            }
            
            spark.points.geometry.attributes.position.needsUpdate = true;
            spark.points.material.opacity = 1 - (spark.age / spark.maxAge);
        }
    }
    
    function clearCachedMaterials() {
        sparkMaterials.forEach(m => m.dispose());
        sparkTextures.forEach(t => t.dispose());
        sparkMaterials.clear();
        sparkTextures.clear();
        activeSparks.length = 0;
    }
    
    return {
        init,
        spawnSparks,
        spawnGoldExplosion,
        update,
        clearCachedMaterials
    };
})();

export default Particles;
