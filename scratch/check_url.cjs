const http = require('http');

function test(host) {
    return new Promise((resolve) => {
        const req = http.request({
            hostname: host,
            port: 5173,
            path: '/treasure_chest.glb',
            method: 'HEAD',
            timeout: 2000
        }, (res) => {
            console.log(`STATUS (${host}):`, res.statusCode);
            console.log(`HEADERS (${host}):`, JSON.stringify(res.headers));
            resolve(true);
        });

        req.on('error', (e) => {
            console.error(`Error for ${host}: ${e.message}`);
            resolve(false);
        });

        req.end();
    });
}

async function run() {
    await test('localhost');
    await test('127.0.0.1');
    process.exit(0);
}
run();
