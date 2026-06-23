const fs = require('fs');
const path = require('path');
const THREE = require('three');

global.self = global;
global.window = global;
global.document = {
    createElement: () => ({
        getContext: () => null
    })
};

global.fetch = async (url) => {
    const filePath = path.join(__dirname, '..', 'public', 'treasure_chest.glb');
    const data = fs.readFileSync(filePath);
    return {
        ok: true,
        status: 200,
        arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
        json: async () => JSON.parse(data.toString('utf8'))
    };
};

const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader.js');

const loader = new GLTFLoader();
loader.load('http://localhost/treasure_chest.glb', (gltf) => {
    const scene = gltf.scene;
    scene.traverse(child => {
        if (child.isMesh) {
            console.log(`Mesh: "${child.name}"`);
            const mat = child.material;
            if (mat) {
                console.log(`  Material Type: ${mat.type}`);
                console.log(`  Visible: ${mat.visible}`);
                console.log(`  Opacity: ${mat.opacity}`);
                console.log(`  Transparent: ${mat.transparent}`);
                console.log(`  Color: ${mat.color ? mat.color.getHexString() : 'N/A'}`);
                console.log(`  Roughness: ${mat.roughness}`);
                console.log(`  Metalness: ${mat.metalness}`);
                console.log(`  Map: ${mat.map ? 'Yes' : 'No'}`);
            } else {
                console.log(`  No material!`);
            }
        }
    });
    process.exit(0);
}, undefined, (err) => {
    console.error('Error:', err);
    process.exit(1);
});
