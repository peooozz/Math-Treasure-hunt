import { LEVELS } from './src/game/levels.js';

console.log("Checking Levels...");
LEVELS.forEach((lvl, idx) => {
    const grid = lvl.grid;
    const gridRows = grid.length;
    const gridCols = grid[0].length;
    const halfW = (gridCols * 4) / 2;
    const halfD = (gridRows * 4) / 2;
    
    console.log(`\n=== Level ${idx + 1}: ${lvl.name} (${gridCols}x${gridRows}) ===`);
    
    // Spawn
    const spawnVal = grid[lvl.spawn.z][lvl.spawn.x];
    if (spawnVal !== 0) {
        console.error(`  [ERROR] Player spawn at (${lvl.spawn.x}, ${lvl.spawn.z}) is inside wall/pillar (value: ${spawnVal})`);
    } else {
        console.log(`  [OK] Player spawn is empty (0)`);
    }
    
    // Exit
    const exitVal = grid[lvl.exit.z][lvl.exit.x];
    if (exitVal !== 0) {
        console.error(`  [ERROR] Exit at (${lvl.exit.x}, ${lvl.exit.z}) is inside wall/pillar (value: ${exitVal})`);
    } else {
        console.log(`  [OK] Exit is empty (0)`);
    }
    
    // Vaults
    lvl.vaults.forEach((v, vIdx) => {
        const val = grid[v.gridZ][v.gridX];
        if (val !== 0) {
            console.error(`  [ERROR] Vault ${vIdx} (${v.name}) at (${v.gridX}, ${v.gridZ}) is inside wall/pillar (value: ${val})`);
        } else {
            console.log(`  [OK] Vault ${vIdx} (${v.name}) is empty (0)`);
        }
    });
    
    // Enemies
    lvl.enemies.forEach((e, eIdx) => {
        const cellX = Math.floor((e.x + halfW) / 4);
        const cellZ = Math.floor((e.z + halfD) / 4);
        if (cellX < 0 || cellX >= gridCols || cellZ < 0 || cellZ >= gridRows) {
            console.error(`  [ERROR] Enemy ${eIdx} (${e.name}) at world (${e.x}, ${e.z}) is out of bounds!`);
        } else {
            const val = grid[cellZ][cellX];
            if (val !== 0) {
                console.error(`  [ERROR] Enemy ${eIdx} (${e.name}) at cell (${cellX}, ${cellZ}) is inside wall/pillar (value: ${val})`);
            } else {
                console.log(`  [OK] Enemy ${eIdx} (${e.name}) is empty (0)`);
            }
        }
    });
});
