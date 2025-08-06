#!/usr/bin/env node
/**
 * Simple OAuth Callback Server
 * 
 * This script creates a simple HTTP server that serves the OAuth callback handler
 * on a custom port (default: 18820). This allows you to configure OAuth providers
 * with redirect URIs like https://localhost:18820 while your main Angular 
 * application runs on a different port.
 * 
 * Usage:
 *   node oauth-callback-server.js [port]
 *   
 * Example:
 *   node oauth-callback-server.js 18820
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Configuration
const DEFAULT_PORT = 18820;
const MAIN_APP_URL = process.env.MAIN_APP_URL || 'http://localhost:4200';

// Get port from command line argument or use default
const port = process.argv[2] ? parseInt(process.argv[2]) : DEFAULT_PORT;

// Path to the callback HTML file
const callbackHtmlPath = path.join(__dirname, '..', 'src', 'assets', 'oauth-callback.html');

// Check if the callback HTML file exists
if (!fs.existsSync(callbackHtmlPath)) {
    console.error(`❌ Callback HTML file not found: ${callbackHtmlPath}`);
    console.error('Please make sure oauth-callback.html exists in src/assets/');
    process.exit(1);
}

// Read and prepare the callback HTML
let callbackHtml;
try {
    callbackHtml = fs.readFileSync(callbackHtmlPath, 'utf8');
    // Replace the main app URL in the HTML
    callbackHtml = callbackHtml.replace(
        "mainAppUrl: 'http://localhost:4200'",
        `mainAppUrl: '${MAIN_APP_URL}'`
    );
} catch (error) {
    console.error(`❌ Error reading callback HTML file: ${error.message}`);
    process.exit(1);
}

// Create the HTTP server
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    console.log(`📥 Request: ${req.method} ${req.url}`);
    
    // Handle CORS for development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }
    
    // Serve the callback page for any GET request
    if (req.method === 'GET') {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(callbackHtml);
        
        // Log OAuth parameters if present
        if (parsedUrl.query.code) {
            console.log('✅ OAuth authorization code received');
        } else if (parsedUrl.query.error) {
            console.log('❌ OAuth error received:', parsedUrl.query.error);
        }
        
        return;
    }
    
    // For other methods, return 404
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Not Found');
});

// Handle server errors
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is already in use`);
        console.error('Try a different port or stop the process using this port');
    } else {
        console.error(`❌ Server error: ${error.message}`);
    }
    process.exit(1);
});

// Start the server
server.listen(port, 'localhost', () => {
    console.log('🚀 OAuth Callback Server started');
    console.log(`📍 Server running at: http://localhost:${port}`);
    console.log(`🎯 Main app URL: ${MAIN_APP_URL}`);
    console.log('');
    console.log('📋 Configuration Instructions:');
    console.log('1. In your OAuth provider (Keycloak/Entra), configure the redirect URI as:');
    console.log(`   http://localhost:${port}`);
    console.log('2. In your Angular app configuration, use the same redirect URI');
    console.log('3. The server will automatically redirect OAuth callbacks to your main app');
    console.log('');
    console.log('💡 To stop the server, press Ctrl+C');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down OAuth Callback Server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down OAuth Callback Server...');
    server.close(() => {
        console.log('✅ Server stopped');
        process.exit(0);
    });
});
