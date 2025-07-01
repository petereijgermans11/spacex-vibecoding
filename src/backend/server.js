const express = require('express');
const cors = require('cors');
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
// Remove this line: const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// Proxy endpoint for SpaceX API
app.get('/api/spacex/*', async (req, res) => {
  try {
    const spacexUrl = `https://api.spacexdata.com${req.path.replace('/api/spacex', '')}`;
    console.log('Proxying request to:', spacexUrl);
    
    // Use built-in fetch (Node 18+)
    const response = await fetch(spacexUrl);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch from SpaceX API' });
  }
});

app.listen(PORT, () => {
  console.log(`CORS proxy server running on http://localhost:${PORT}`);
});