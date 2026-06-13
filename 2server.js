const express = require('express');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON payloads for POST requests
app.use(express.json());

/**
 * Core function to extract the stream link
 */
function getStreamingLink(videoUrl, userIp) {
    return new Promise((resolve, reject) => {
        const args = [
            '--get-url',
            '-f', 'best[ext=mp4]', // Combined stream for instant browser playback
            
            // Injecting headers directly bypasses strict yt-dlp CIDR parsing
            '--add-header', `X-Forwarded-For:${userIp}`,
            '--add-header', `X-Real-IP:${userIp}`,
            
            // Client emulation bypasses
            '--extractor-args', 'youtube:player_client=ios,tv,default',
            
            // Uncomment this line if your server requires forced IPv6 routing:
            // '--force-ipv6', 
            
            videoUrl
        ];

        execFile('yt-dlp', args, (error, stdout, stderr) => {
            if (error) {
                return reject(new Error(`yt-dlp failed: ${stderr || error.message}`));
            }

            const directUrl = stdout.trim();

            if (!directUrl || !directUrl.includes('googlevideo.com')) {
                return reject(new Error('Failed to retrieve a valid googlevideo.com link.'));
            }

            resolve(directUrl);
        });
    });
}

/**
 * Method 1: GET Endpoint
 * Usage: http://localhost:3000/api/stream?url=VIDEO_URL&ip=USER_IP
 */
app.get('/api/stream', async (req, res) => {
    const videoUrl = req.query.url;
    const userIp = req.query.ip;

    if (!videoUrl || !userIp) {
        return res.status(400).json({
            success: false,
            error: 'Missing parameters. Both "url" and "ip" query parameters are required.'
        });
    }

    try {
        const link = await getStreamingLink(videoUrl, userIp);
        return res.json({ success: true, url: link });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * Method 2: POST Endpoint
 * Usage: Send JSON payload {"url": "...", "ip": "..."} to http://localhost:3000/api/stream
 */
app.post('/api/stream', async (req, res) => {
    const { url, ip } = req.body;

    if (!url || !ip) {
        return res.status(400).json({
            success: false,
            error: 'Missing fields. "url" and "ip" are required in the request body.'
        });
    }

    try {
        const link = await getStreamingLink(url, ip);
        return res.json({ success: true, url: link });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 YouTube Extractor API is live at http://localhost:${PORT}`);
});