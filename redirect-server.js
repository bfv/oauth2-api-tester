const express = require('express');
const https = require('https');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 18820;

// Create certificate options
let options = {};

// Try to use existing certificate files, otherwise use HTTP
try {
  if (fs.existsSync('cert.pem') && fs.existsSync('key.pem')) {
    options = {
      key: fs.readFileSync('key.pem'),
      cert: fs.readFileSync('cert.pem')
    };
    console.log('📋 Using existing certificate files');
  } else {
    console.log('⚠️  No certificate files found, using HTTP');
    console.log('💡 For HTTPS (required for production OAuth), use local-web-server:');
    console.log('   npm install -g local-web-server');
    console.log('   ws --port 18820 --https');
  }
} catch (error) {
  console.log('⚠️  Certificate error:', error.message);
}

// Serve static files from current directory
app.use(express.static(__dirname));

// Serve oauth-redirect.html for any request (including root)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'oauth-redirect.html'));
});

// Start server (HTTPS if certificates available, otherwise HTTP)
if (options.key && options.cert) {
  https.createServer(options, app).listen(PORT, () => {
    console.log(`🔒 HTTPS OAuth redirect handler running at https://localhost:${PORT}`);
    console.log(`📍 Serving oauth-redirect.html for OAuth callbacks`);
    console.log('⚠️  Certificate is self-signed - you will see browser warnings');
    console.log('💡 Click "Advanced" → "Proceed to localhost" in your browser');
    console.log('🚀 Make sure your Angular app is running on http://localhost:4200');
  });
} else {
  // Fallback to HTTP (won't work with production OAuth providers like Entra)
  app.listen(PORT, () => {
    console.log(`⚠️  HTTP OAuth redirect handler running at http://localhost:${PORT}`);
    console.log(`📍 Serving oauth-redirect.html for OAuth callbacks`);
    console.log('❌ Production OAuth providers (like Entra ID) require HTTPS!');
    console.log('💡 Install local-web-server for easy HTTPS: npm install -g local-web-server');
    console.log('   Then run: ws --port 18820 --https');
  });
}
