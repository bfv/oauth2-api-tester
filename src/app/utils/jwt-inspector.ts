/**
 * Simple JWT Token Inspector
 * Use this to decode and examine JWT tokens from Entra ID vs your desktop MSAL app
 */

export interface JWTHeader {
  typ?: string;
  alg?: string;
  kid?: string;
  x5t?: string;
}

export interface EntraIDTokenPayload {
  // Standard claims
  iss?: string;           // Issuer
  sub?: string;           // Subject (user ID)
  aud?: string;           // Audience (client ID)
  exp?: number;           // Expiration time
  iat?: number;           // Issued at
  nbf?: number;           // Not before
  
  // Entra ID specific claims
  tid?: string;           // Tenant ID
  oid?: string;           // Object ID (user's unique ID in tenant)
  upn?: string;           // User Principal Name
  unique_name?: string;   // Unique name
  name?: string;          // Display name
  given_name?: string;    // First name
  family_name?: string;   // Last name
  email?: string;         // Email address
  
  // Application specific
  azp?: string;           // Authorized party
  appid?: string;         // Application ID
  appidacr?: string;      // Application authentication context class reference
  ver?: string;           // Token version
  
  // Roles and permissions
  roles?: string[];       // Application roles
  groups?: string[];      // Security groups
  scp?: string;           // Scopes (space-separated)
  
  // Session information
  auth_time?: number;     // Authentication time
  ipaddr?: string;        // IP address
  
  [key: string]: any;     // Additional custom claims
}

export interface EntraAccessTokenPayload {
  // Standard claims
  iss?: string;           // Issuer
  sub?: string;           // Subject
  aud?: string;           // Audience
  exp?: number;           // Expiration
  iat?: number;           // Issued at
  nbf?: number;           // Not before
  
  // Entra ID access token specific
  appid?: string;         // Application ID
  appidacr?: string;      // Auth context class reference
  idp?: string;           // Identity provider
  oid?: string;           // Object ID
  tid?: string;           // Tenant ID
  upn?: string;           // User principal name
  ver?: string;           // Version
  
  // Permissions and scopes
  scp?: string;           // Scopes
  roles?: string[];       // Application roles
  groups?: string[];      // Group membership
  
  // Additional info
  acr?: string;           // Authentication context class reference
  aio?: string;           // Internal use
  
  [key: string]: any;
}

export class JWTInspector {
  
  /**
   * Decode JWT without verification (for inspection only)
   */
  static decode(token: string): { header: JWTHeader; payload: any; signature: string } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      const header = JSON.parse(this.base64UrlDecode(parts[0]));
      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      const signature = parts[2];

      return { header, payload, signature };
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      return null;
    }
  }

  /**
   * Get readable token information
   */
  static inspect(token: string): any {
    const decoded = this.decode(token);
    if (!decoded) return null;

    const { header, payload } = decoded;
    
    return {
      header,
      payload,
      // Convert timestamps to readable dates
      issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
      notBefore: payload.nbf ? new Date(payload.nbf * 1000).toISOString() : null,
      isExpired: payload.exp ? Date.now() > (payload.exp * 1000) : null,
      timeUntilExpiry: payload.exp ? Math.max(0, (payload.exp * 1000) - Date.now()) : null,
      
      // Entra ID specific info
      tenantId: payload.tid,
      userId: payload.oid || payload.sub,
      userPrincipalName: payload.upn,
      displayName: payload.name,
      email: payload.email,
      scopes: payload.scp ? payload.scp.split(' ') : [],
      roles: payload.roles || [],
      groups: payload.groups || []
    };
  }

  /**
   * Compare two tokens (e.g., web vs desktop)
   */
  static compare(webToken: string, desktopToken: string): any {
    const webDecoded = this.inspect(webToken);
    const desktopDecoded = this.inspect(desktopToken);

    if (!webDecoded || !desktopDecoded) {
      return { error: 'Failed to decode one or both tokens' };
    }

    return {
      web: webDecoded,
      desktop: desktopDecoded,
      differences: {
        issuer: webDecoded.payload.iss !== desktopDecoded.payload.iss,
        audience: webDecoded.payload.aud !== desktopDecoded.payload.aud,
        scopes: JSON.stringify(webDecoded.scopes) !== JSON.stringify(desktopDecoded.scopes),
        roles: JSON.stringify(webDecoded.roles) !== JSON.stringify(desktopDecoded.roles),
        userId: webDecoded.userId !== desktopDecoded.userId,
        tenantId: webDecoded.tenantId !== desktopDecoded.tenantId
      }
    };
  }

  /**
   * Base64 URL decode
   */
  private static base64UrlDecode(str: string): string {
    // Convert base64url to base64
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed
    while (base64.length % 4) {
      base64 += '=';
    }
    
    // Decode base64 and convert to UTF-8
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  }
}

// Usage examples:
/*
// In your component or service:
import { JWTInspector } from './jwt-inspector';

// Inspect access token
const accessToken = this.oauthService.getAccessToken();
if (accessToken) {
  const tokenInfo = JWTInspector.inspect(accessToken);
  console.log('Access Token Info:', tokenInfo);
}

// Inspect ID token
const idToken = this.oauthService.getIdToken();
if (idToken) {
  const idTokenInfo = JWTInspector.inspect(idToken);
  console.log('ID Token Info:', idTokenInfo);
}

// Compare with desktop token
const desktopToken = 'your-desktop-msal-token';
const webToken = this.oauthService.getAccessToken();
const comparison = JWTInspector.compare(webToken, desktopToken);
console.log('Token Comparison:', comparison);
*/
