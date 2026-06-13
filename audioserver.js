const express = require('express');
const { exec } = require('child_process');
const { Readable, pipeline } = require('stream'); // Import pipeline
const app = express();
const PORT = 3001; // Matches your log configuration

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

    const command = `yt-dlp -f 140 -j "${videoUrl}"`;

    exec(command, async (error, stdout, stderr) => {
        if (error) {
            console.error(`yt-dlp Error: ${error.message}`);
            return res.status(500).json({ error: 'Failed to extract audio details.' });
        }

        try {
            const videoData = JSON.parse(stdout);
            const directGooglevideoUrl = videoData.url;
            const youtubeHeaders = videoData.http_headers;
            const cleanTitle = (videoData.title || 'audio').replace(/[^a-z0-9]/gi, '_').toLowerCase();

            res.setHeader('Content-Disposition', `attachment; filename="${cleanTitle}.m4a"`);
            res.setHeader('Content-Type', 'audio/mp4');

            console.log(`Piping audio stream for: ${videoData.title}`);

            const googleResponse = await fetch(directGooglevideoUrl, {
                headers: youtubeHeaders
            });

            if (!googleResponse.ok) {
                return res.status(googleResponse.status).send('Google CDN rejected the request.');
            }

            // Convert the Web Stream to a Node stream structure
            const nodeStream = Readable.fromWeb(googleResponse.body);

            // Use pipeline instead of .pipe() to safely catch network drops
            pipeline(nodeStream, res, (err) => {
                if (err) {
                    // This blocks the crash! It safely catches the connection drop.
                    if (err.code === 'ECONNRESET') {
                        console.log(`ℹ️ Stream closed abruptly: Client disconnected or Google reset connection.`);
                    } else {
                        console.error('❌ Pipeline streaming error encountered:', err.message);
                    }
                } else {
                    console.log(`✅ Transmission finished successfully for: ${videoData.title}`);
                }
            });

        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to process audio metadata.' });
            }
        }
    });
});

app.listen(PORT, () => {
    console.log(`M4A Audio Downloader backend running at http://localhost:${PORT}`);
});
