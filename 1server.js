const express = require('express');
const { exec } = require('child_process');
const { Readable } = require('stream'); // Built into Node.js
const app = express();
const PORT = 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.use(express.static('public'));

app.get('/api/download', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: 'Missing "url" query parameter' });
    }

    const command = `yt-dlp -f 18 -j "${videoUrl}"`;

    exec(command, async (error, stdout, stderr) => {
        if (error) {
            console.error(`yt-dlp Error: ${error.message}`);
            return res.status(500).json({ error: 'Failed to extract video details.' });
        }

        try {
            const videoData = JSON.parse(stdout);
            const directGooglevideoUrl = videoData.url;
            const youtubeHeaders = videoData.http_headers;
            const cleanTitle = (videoData.title || 'video').replace(/[^a-z0-9]/gi, '_').toLowerCase();

            res.setHeader('Content-Disposition', `attachment; filename="${cleanTitle}.mp4"`);
            res.setHeader('Content-Type', 'video/mp4');

            console.log(`Starting proxy stream for: ${videoData.title}`);

            // Using Node 22's global native fetch engine
            const googleResponse = await fetch(directGooglevideoUrl, {
                headers: youtubeHeaders
            });

            if (!googleResponse.ok) {
                return res.status(googleResponse.status).send('Google CDN rejected the proxy request.');
            }

            // Converts the native Web Stream to a Node.js stream for Express compatibility
            Readable.fromWeb(googleResponse.body).pipe(res);

        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            res.status(500).json({ error: 'Failed to process video metadata.' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Downloader Engine backend running at http://localhost:${PORT}`);
});
