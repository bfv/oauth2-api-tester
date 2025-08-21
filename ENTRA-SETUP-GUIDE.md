# Entra ID Configuration for JWT Testing

## Current Issue
Getting error: `AADSTS9002326: Cross-origin token redemption is permitted only for the 'Single-Page Application' client-type`

## Required Azure Portal Configuration

### 1. App Registration Settings
Go to **Azure Portal** → **App registrations** → **Your App**

### 2. Authentication Configuration
Navigate to **Authentication** section:

#### Platform Configuration
- **Remove** any **Web** platform configurations that have `https://localhost:18820`
- **Add** or ensure **Single-page application** platform exists
- Under **Single-page application**, add:
  - `https://localhost:18820` (for custom redirect handler)
  - `http://localhost:4200` (for Angular app)

#### Implicit Grant and Hybrid Flows (Optional)
For SPA applications, you might need:
- ✅ **Access tokens** (used for implicit flow)
- ✅ **ID tokens** (used for implicit flow)

### 3. API Permissions
Ensure you have the necessary permissions:
- **Microsoft Graph** → **User.Read** (Delegated)
- Any other APIs your desktop app uses

### 4. Token Configuration
Go to **Token configuration**:
- Add optional claims if needed
- Configure token lifetime if required

## Testing Flow

1. **Start HTTPS Redirect Server:**
   ```bash
   cd c:\dev\oe\cokz\cert-app\ngclient\oauth2-api-tester
   ws --port 18820 --https --spa oauth-redirect.html
   ```

2. **Start Angular App:**
   ```bash
   ng serve
   ```

3. **Configure Entra Provider:**
   - Set your actual Client ID in the app
   - Set tenant ID/authority URL
   - Set redirect URI to `https://localhost:18820`

4. **Test OAuth Flow:**
   - Click "Login with Entra"
   - Should redirect to Entra ID
   - After auth, redirect to `https://localhost:18820`
   - Should forward to Angular app with tokens

## JWT Token Examination

Once working, you can examine:
- **Access Token**: API access credentials
- **ID Token**: User identity information
- **Refresh Token**: For token renewal

Compare these with your desktop MSAL implementation.

## Common Desktop vs Web Differences

### Desktop (MSAL)
- Uses Authorization Code flow with PKCE
- Can store tokens securely
- Direct API calls to Microsoft Graph
- No CORS restrictions

### Web SPA (angular-oauth2-oidc)
- Uses Authorization Code flow with PKCE or Implicit flow
- Tokens stored in browser (sessionStorage/localStorage)
- CORS restrictions apply
- Requires proper redirect URI configuration
