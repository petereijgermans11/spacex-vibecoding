const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors'); // Om CORS-fouten voor uw p5.js app op te lossen

const app = express();
const port = 3000; // U kunt elke vrije poort gebruiken

// Schakel CORS in voor alle verzoeken van uw p5.js app
app.use(cors()); 

// Endpoint om afbeeldingen door te sturen
// Voorbeeld gebruik: GET /proxy?url=https://live.staticflickr.com/...
app.get('/proxy', async (req, res) => {
    const imageUrl = req.query.url;

    if (!imageUrl) {
        return res.status(400).send('Geen URL opgegeven.');
    }

    try {
        const response = await fetch(imageUrl);
        if (!response.ok) {
            throw new Error(`HTTP fout! status: ${response.status}`);
        }

        // Stel de juiste Content-Type header in
        const contentType = response.headers.get('content-type');
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        // Stuur de afbeeldingsgegevens direct door
        response.body.pipe(res);
    } catch (error) {
        console.error(`Fout bij proxing van afbeelding ${imageUrl}:`, error);
        res.status(500).send('Fout bij het ophalen van de afbeelding.');
    }
});

app.listen(port, () => {
    console.log(`Proxy server luistert op http://localhost:${port}`);
    console.log(`Gebruik in p5.js: const PROXY_URL = 'http://localhost:${port}/proxy?url=';`);
});
