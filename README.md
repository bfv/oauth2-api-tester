# Keycloak JWT Client

A simple Angular web application to test JWT token integration between Keycloak and Progress OpenEdge PAS instances.

## Features

- **Keycloak Configuration**: Configure Keycloak server settings (issuer, client ID, redirect URI, scope) through a web UI
- **Authentication**: Login using OpenID Connect Authorization Code Flow with PKCE
- **Token Display**: View both raw and decoded JWT tokens (access, refresh, and ID tokens)
- **API Testing**: Make HTTP requests (GET, POST, PUT, DELETE) to configurable endpoints with automatic JWT Bearer token inclusion
- **Persistent Configuration**: All settings are saved in localStorage and persist across browser sessions

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Angular CLI 20.1.4+ installed
- A running Keycloak server
- A Progress OpenEdge PAS instance (optional, for testing)

### Installation

1. The project is already set up in this directory
2. Dependencies are already installed

### Running the Application

```bash
npm start
```

The application will be available at `http://localhost:4200`

## Usage

### 1. Configuration

1. Navigate to the **Configuration** tab
2. Enter your Keycloak settings:
   - **Issuer URL**: Your Keycloak realm URL (e.g., `http://localhost:8080/realms/master`)
   - **Client ID**: Your Keycloak client ID
   - **Redirect URI**: The application URL (defaults to current origin)
   - **Scope**: OIDC scopes (e.g., `openid profile email`)

3. Configure your API endpoints:
   - **Base URL**: Your PAS server URL (e.g., `http://localhost:8810`)
   - **Endpoints**: Define named endpoints with their paths

4. Save the configuration

### 2. Authentication

1. Navigate to the **Authentication** tab
2. Click **Login with Keycloak**
3. Complete the login flow in Keycloak
4. You'll be redirected back with authentication status

### 3. Token Display

1. Navigate to the **Token Display** tab (available after authentication)
2. View token summary (type, expiration, scope, validity)
3. View and copy raw tokens
4. View decoded token headers and payloads
5. Available for Access Token, Refresh Token, and ID Token

### 4. API Testing

1. Navigate to the **API Test** tab (available after authentication)
2. Configure your request:
   - Select HTTP method (GET, POST, PUT, DELETE)
   - Enter or select endpoint URL
   - Add request body (for POST/PUT)
   - Add custom headers
3. Send request - JWT token is automatically included as Bearer token
4. View response with status, headers, and body
5. Copy response data

## Configuration Persistence

All configuration is automatically saved to localStorage:
- Keycloak settings
- API endpoints
- The configuration persists across browser sessions and page reloads

## Default Configuration

The application comes with sensible defaults:
- **Keycloak Issuer**: `http://localhost:8080/realms/master`
- **Client ID**: `jwt-client`
- **Scope**: `openid profile email`
- **API Base URL**: `http://localhost:8810`
- **Test Endpoint**: `/web/test`

## Security Features

- Uses PKCE (Proof Key for Code Exchange) for secure OAuth2 flow
- Automatic token refresh
- Token validation
- Secure token storage

## Development

### Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── auth/           # Authentication component
│   │   ├── config/         # Configuration component
│   │   ├── token-display/  # Token display component
│   │   └── api-test/       # API test component
│   ├── services/
│   │   ├── auth.service.ts     # Authentication service
│   │   ├── config.service.ts   # Configuration service
│   │   └── api.service.ts      # API service
│   ├── models/
│   │   ├── config.model.ts     # Configuration interfaces
│   │   └── api.model.ts        # API interfaces
│   └── ...
```

### Building for Production

```bash
npm run build
```

### Running Tests

```bash
npm test
```

## Troubleshooting

### Common Issues

1. **CORS Issues**: Ensure your Keycloak and PAS servers are configured to allow the application origin
2. **Invalid Client**: Verify the client ID exists in Keycloak and is configured for public clients
3. **Redirect URI Mismatch**: Ensure the redirect URI in Keycloak matches the application URL
4. **Token Expired**: Use the refresh token functionality or re-authenticate

### Support

This is a development/testing tool. For production use, ensure proper security configurations in both Keycloak and your PAS server.
