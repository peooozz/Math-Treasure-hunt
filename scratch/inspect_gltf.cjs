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
    scene.updateMatrixWorld(true);
    
    console.log('--- HIERARCHY AND POSITIONS ---');
    scene.traverse(child => {
        console.log(`Node: "${child.name}" (Type: ${child.type})`);
        console.log(`  Position:`, child.position.toArray());
        console.log(`  Scale:`, child.scale.toArray());
        console.log(`  Rotation:`, child.rotation.toArray().slice(0, 3));
        
        if (child.isMesh) {
            const geom = child.geometry;
            geom.computeBoundingBox();
            console.log(`  Mesh Bounding Box Min:`, geom.boundingBox.min.toArray());
            console.log(`  Mesh Bounding Box Max:`, geom.boundingBox.max.toArray());
            
            const worldBox = new THREE.Box3().setFromObject(child);
            console.log(`  Mesh World Box Min:`, worldBox.min.toArray());
            console.log(`  Mesh World Box Max:`, worldBox.max.toArray());
        }
    });
    process.exit(0);
}, undefined, (err) => {
    console.error('Error:', err);
    process.exit(1);
});
