const express = require('express');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// 1. Define paths
const originalYtDlpPath = path.join(__dirname, 'yt-dlp');
const tmpYtDlpPath = '/tmp/yt-dlp';

// 2. Vercel Workaround: Copy binary to the writable /tmp folder during cold start
if (!fs.existsSync(tmpYtDlpPath)) {
    try {
        console.log("Copying yt-dlp to /tmp directory...");
        fs.copyFileSync(originalYtDlpPath, tmpYtDlpPath);
        
        // Now we can safely make it executable
        fs.chmodSync(tmpYtDlpPath, 0o777);
        console.log("Successfully prepared yt-dlp in /tmp.");
    } catch (err) {
        console.error("Critical Error preparing yt-dlp:", err);
    }
}

// Helper function to extract IP
function getClientIp(req) {
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (xForwardedFor) {
        return xForwardedFor.split(',')[0].trim();
    }
    return req.socket.remoteAddress || '127.0.0.1';
}

app.get('/api/download', (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: 'Missing "url" query parameter' });
    }

    const userIp = getClientIp(req);
    console.log(`Generating direct video link for IP: ${userIp}`);

    const args = [
        '--get-url',
        '-f', '18',
        '--add-header', `X-Forwarded-For:${userIp}`,
        '--add-header', `X-Real-IP:${userIp}`,
        '--extractor-args', 'youtube:player_client=ios,tv,default',
        videoUrl
    ];

    // 3. Execute the binary from the /tmp folder
    execFile(tmpYtDlpPath, args, (error, stdout, stderr) => {
        if (error) {
            console.error(`yt-dlp Error: ${stderr || error.message}`);
            return res.status(500).json({ error: 'Failed to extract video link.' });
        }

        const directGooglevideoUrl = stdout.trim();

        if (!directGooglevideoUrl || !directGooglevideoUrl.includes('googlevideo.com')) {
            return res.status(500).json({ error: 'Failed to retrieve a valid googlevideo.com link.' });
        }

        console.log(`Successfully generated direct link. Redirecting client...`);
        res.redirect(directGooglevideoUrl);
    });
});

// 4. CRITICAL FOR VERCEL: Export the app instead of using app.listen()
module.exports = app;
