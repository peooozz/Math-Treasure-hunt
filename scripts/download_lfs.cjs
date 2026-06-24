const fs = require('fs');
const path = require('path');
const https = require('https');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const GITHUB_REPO_URL = 'https://media.githubusercontent.com/media/peooozz/Math-Treasure-hunt/main/public';

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                // Handle redirect
                downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
                return;
            }

            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download: Status Code ${res.statusCode}`));
                return;
            }

            const fileStream = fs.createWriteStream(destPath);
            res.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });

            fileStream.on('error', (err) => {
                fs.unlink(destPath, () => {});
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function run() {
    console.log('=== CHECKING FOR GIT LFS POINTERS ===');
    
    if (!fs.existsSync(PUBLIC_DIR)) {
        console.error('Public directory does not exist:', PUBLIC_DIR);
        process.exit(1);
    }

    const files = fs.readdirSync(PUBLIC_DIR);
    const glbFiles = files.filter(f => f.endsWith('.glb'));

    console.log(`Found ${glbFiles.length} GLB files in public directory.`);

    for (const filename of glbFiles) {
        const filePath = path.join(PUBLIC_DIR, filename);
        const stats = fs.statSync(filePath);
        
        // Git LFS pointers are tiny text files, usually less than 500 bytes.
        if (stats.size < 1000) {
            const content = fs.readFileSync(filePath, 'utf8');
            if (content.startsWith('version https://git-lfs.github.com')) {
                console.log(`\n[LFS POINTER DETECTED] File: ${filename} (${stats.size} bytes)`);
                const downloadUrl = `${GITHUB_REPO_URL}/${filename}`;
                console.log(`Downloading real asset from: ${downloadUrl}`);
                
                try {
                    const start = Date.now();
                    await downloadFile(downloadUrl, filePath);
                    const newStats = fs.statSync(filePath);
                    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
                    console.log(`[SUCCESS] Downloaded ${filename}. New size: ${(newStats.size / (1024 * 1024)).toFixed(2)} MB (took ${elapsed}s)`);
                } catch (err) {
                    console.error(`[ERROR] Failed to download ${filename}:`, err.message);
                }
            } else {
                console.log(`File ${filename} is small but not an LFS pointer.`);
            }
        } else {
            console.log(`File ${filename} is already a real asset (${(stats.size / (1024 * 1024)).toFixed(2)} MB).`);
        }
    }
    
    console.log('\n=== LFS CHECK COMPLETE ===\n');
}

run().catch(err => {
    console.error('Unhandled error in LFS download script:', err);
    process.exit(1);
});
