const https = require('https');
const fs = require('fs');
const path = require('path');

// Simple self-signed certificate (for development only)
const cert = `-----BEGIN CERTIFICATE-----
MIICpDCCAYwCCQC8w9X/HQFmYDANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls
b2NhbGhvc3QwHhcNMjQwMTA5MDAwMDAwWhcNMjUwMTA5MDAwMDAwWjAUMRIwEAYD
VQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC5
8w9X/HQFmYDGSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC58w9X/HQFmYDGSqGSI
b3DQEBAQUAA4IBDwAwggEKAoIBAQC58w9X/HQFmYDGSqGSIb3DQEBAQUAA4IBDwAw
ggEKAoIBAQC58w9X/HQFmYDGSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC5
-----END CERTIFICATE-----`;

const key = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC58w9X/HQFmYDG
SqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC58w9X/HQFmYDGSqGSIb3DQEBAQUAA4I
BDwAwggEKAoIBAQC58w9X/HQFmYDGSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC5
8w9X/HQFmYDGSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC5
-----END PRIVATE KEY-----`;

// Create HTTPS server
const options = {
    cert: cert,
    key: key
};

const server = https.createServer(options, (req, res) => {
    try {
        const htmlContent = fs.readFileSync('oauth-redirect.html', 'utf8');
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlContent);
    } catch (error) {
        res.writeHead(404);
        res.end('oauth-redirect.html not found');
    }
});

server.listen(18820, () => {
    console.log('🔒 HTTPS OAuth redirect handler running at https://localhost:18820');
    console.log('⚠️  Certificate is self-signed - you will see browser warnings');
    console.log('💡 Click "Advanced" → "Proceed to localhost" in your browser');
});
