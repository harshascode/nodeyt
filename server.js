const express = require('express');
const { execFile } = require('child_process');

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(express.static('public'));

// Helper function to extract the real IP address of the user
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

    // Using the optimized arguments to bypass IP locks
    const args = [
        '--get-url',                                 // Return just the URL, no JSON parsing needed
        '-f', '18',                                  // Standard MP4 video format
        '--add-header', `X-Forwarded-For:${userIp}`, // Inject user's IP
        '--add-header', `X-Real-IP:${userIp}`,       // Inject user's IP
        '--extractor-args', 'youtube:player_client=ios,tv,default', // Client emulation
        // '--force-ipv6', 
        videoUrl
    ];

    execFile('yt-dlp', args, (error, stdout, stderr) => {
        if (error) {
            console.error(`yt-dlp Error: ${stderr || error.message}`);
            return res.status(500).json({ error: 'Failed to extract video link.' });
        }

        const directGooglevideoUrl = stdout.trim();

        if (!directGooglevideoUrl || !directGooglevideoUrl.includes('googlevideo.com')) {
            return res.status(500).json({ error: 'Failed to retrieve a valid googlevideo.com link.' });
        }

        console.log(`Successfully generated direct link. Redirecting client...`);

        // Redirect the client's browser directly to Google's server
        res.redirect(directGooglevideoUrl);
    });
});

app.listen(PORT, () => {
    console.log(`Zero-Bandwidth Video Engine running at http://localhost:${PORT}`);
});