const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'treasure_chest.glb');
if (!fs.existsSync(filePath)) {
    console.error('File does not exist:', filePath);
    process.exit(1);
}

const buffer = fs.readFileSync(filePath);
const chunkLength = buffer.readUInt32LE(12);
const chunkType = buffer.readUInt32LE(16);

if (chunkType === 0x4E4F534A) {
    const jsonStr = buffer.toString('utf8', 20, 20 + chunkLength);
    const gltf = JSON.parse(jsonStr);
    
    console.log('--- ACCESSORS ---');
    if (gltf.accessors) {
        gltf.accessors.forEach((acc, idx) => {
            if (acc.min || acc.max) {
                console.log(`Accessor ${idx} (Type: ${acc.type}, ComponentType: ${acc.componentType}, Count: ${acc.count}):`);
                console.log('  Min:', acc.min);
                console.log('  Max:', acc.max);
            }
        });
    }
} else {
    console.error('Not JSON chunk!');
}
