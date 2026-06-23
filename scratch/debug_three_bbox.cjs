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
    const urlStr = (typeof url === 'string') ? url : url.url || url.toString();
    console.log('FETCH REQUEST:', urlStr);
    
    let filename = urlStr.split('/').pop();
    if (filename === '[object Request]') {
        filename = 'treasure_chest.glb';
    }
    const filePath = path.join(__dirname, '..', 'public', filename);
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
    
    const bbox = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    
    console.log('--- BBOX RESULT ---');
    console.log('Min:', bbox.min.toArray());
    console.log('Max:', bbox.max.toArray());
    console.log('Size:', size.toArray());
    
    process.exit(0);
}, undefined, (err) => {
    console.error('Error loading:', err);
    process.exit(1);
});
