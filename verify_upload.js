const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const dataPath = path.join(__dirname, 'data.json');
const backupPath = path.join(__dirname, 'data.json.bak');

// Backup data.json
fs.copyFileSync(dataPath, backupPath);

// Start server
const serverProcess = spawn('node', ['index.js'], { stdio: 'pipe', cwd: __dirname });

let serverOutput = '';
serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.log('Server:', output.trim());
    if (output.includes('Server running')) {
        setTimeout(runTest, 1000); // Wait a bit for server to be ready
    }
});

serverProcess.stderr.on('data', (data) => {
    console.error('Server Error:', data.toString());
});

function runTest() {
    const boundary = '--------------------------1234567890';
    const personId = 1;
    const folder = 'test_folder';
    const filePath = path.join(__dirname, 'test_image.png');
    const fileContent = fs.readFileSync(filePath);

    const bodyParts = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="person"`,
        '',
        personId.toString(),
        `--${boundary}`,
        `Content-Disposition: form-data; name="folder"`,
        '',
        folder,
        `--${boundary}`,
        `Content-Disposition: form-data; name="isPrimary"`,
        '',
        'true',
        `--${boundary}`,
        `Content-Disposition: form-data; name="image"; filename="test_image.png"`,
        `Content-Type: image/png`,
        '',
        fileContent,
        `--${boundary}--`,
        ''
    ];
    const body = bodyParts.join('\r\n');

    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/upload',
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': Buffer.byteLength(body)
        }
    };

    console.log('Sending request...');
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
            console.log('Response:', data);
            
            // Check data.json
            try {
                const jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                const person = jsonData.find(p => p.stt == personId);
                
                if (person && person.images && person.images.length > 0) {
                    const lastImage = person.images[person.images.length - 1];
                    const expectedFileNamePart = `${person.stt}.${person.fullName}`;
                    
                    if (lastImage.folder === folder && lastImage.path.includes(expectedFileNamePart)) {
                         console.log('Verification SUCCESS: Image added with correct naming convention');
                    } else {
                         console.error('Verification FAILED: Image naming or folder incorrect', lastImage);
                    }

                    if (lastImage.isPrimary === true) {
                        console.log('Verification SUCCESS: isPrimary flag is set');
                    } else {
                        console.error('Verification FAILED: isPrimary flag is NOT set');
                    }

                } else {
                    console.error('Verification FAILED: Image not found in data.json');
                }
            } catch (err) {
                console.error('Error reading data.json:', err);
            }

            // Check index page for data-images and link
            http.get('http://localhost:3000/', (res) => {
                let html = '';
                res.on('data', (chunk) => html += chunk);
                res.on('end', () => {
                    if (html.includes(`data-images='[`)) {
                         console.log('Verification SUCCESS: Index page contains data-images attribute');
                    } else {
                         console.error('Verification FAILED: Index page missing data-images attribute');
                    }
                    
                    if (html.includes('href="/uploaded"')) {
                         console.log('Verification SUCCESS: Index page contains link to /uploaded');
                    } else {
                         console.error('Verification FAILED: Index page missing link to /uploaded');
                    }

                    // Check uploaded page for link
                    http.get('http://localhost:3000/uploaded', (res) => {
                        let uploadedHtml = '';
                        res.on('data', (chunk) => uploadedHtml += chunk);
                        res.on('end', () => {
                            if (uploadedHtml.includes('href="/"')) {
                                console.log('Verification SUCCESS: Uploaded page contains link to /');
                            } else {
                                console.error('Verification FAILED: Uploaded page missing link to /');
                            }

                            // Cleanup and Restore
                            serverProcess.kill();
                            
                            // Restore data.json
                            fs.copyFileSync(backupPath, dataPath);
                            fs.unlinkSync(backupPath);
                            
                            process.exit(0);
                        });
                    });
                });
            });
        });
    });

    req.on('error', (e) => {
        console.error('Request error:', e);
        serverProcess.kill();
        // Restore data.json
        if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, dataPath);
            fs.unlinkSync(backupPath);
        }
        process.exit(1);
    });

    req.write(body);
    req.end();
}
