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
    
    console.log('--- NODE TRANSFORMS ---');
    if (gltf.nodes) {
        gltf.nodes.forEach((node, index) => {
            console.log(`Node ${index}: "${node.name}"`);
            if (node.translation) console.log('  Translation:', node.translation);
            if (node.rotation) console.log('  Rotation:', node.rotation);
            if (node.scale) console.log('  Scale:', node.scale);
        });
    }
} else {
    console.error('Not JSON chunk!');
}
