# GitHub Secrets Setup for Docker Build

This document explains how to configure GitHub secrets for the Docker build workflow.

## Required GitHub Secrets

Navigate to your repository settings → Secrets and variables → Actions → Secrets tab:

### 1. `DOCKER_USERNAME`
- **Type**: Repository Secret
- **Value**: Your Docker Hub username
- **Purpose**: Authentication for pushing images to Docker Hub

### 2. `DOCKER_PASSWORD`
- **Type**: Repository Secret  
- **Value**: Your Docker Hub access token (recommended) or password
- **Purpose**: Authentication for pushing images to Docker Hub
- **Note**: It's recommended to use a Docker Hub access token instead of your password for better security

## How to Set Up

### Step 1: Create Docker Hub Access Token
1. Log in to Docker Hub
2. Go to Account Settings → Security → Access Tokens
3. Click "New Access Token"
4. Give it a descriptive name (e.g., "GitHub Actions - oauth2-api-tester")
5. Copy the generated token

### Step 2: Add Docker Hub Credentials to GitHub
1. Go to your repository on GitHub
2. Click Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add `DOCKER_USERNAME` with your Docker Hub username
5. Add `DOCKER_PASSWORD` with your Docker Hub access token

## Workflow Trigger

The workflow is triggered when you push a tag starting with "v" to the repository:

```bash
# Create and push a tag
git tag v1.0.0
git push origin v1.0.0
```

## Docker Image Details

The workflow will create Docker images with the following specifications:
- **Repository**: `docker.io/{your-github-username}/oauth2-api-tester`
- **Tags**: Based on the git tag (e.g., `v1.0.0`, `1.0.0`, `1.0`, `1`)
- **Platforms**: linux/amd64, linux/arm64
- **Exposed Port**: 80 (HTTP only)

## SSL/TLS Certificates

SSL certificates are **not** included in the Docker image. This is intentional for security and flexibility reasons. Handle SSL/TLS at deployment time using one of these approaches:

### Option 1: Reverse Proxy (Recommended)
Use a reverse proxy like nginx, Traefik, or a cloud load balancer to handle SSL termination:

```yaml
# docker-compose.yml example with Traefik
version: '3.8'
services:
  app:
    image: your-username/oauth2-api-tester:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.oauth2-app.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.oauth2-app.tls.certresolver=letsencrypt"
```

### Option 2: Volume Mount Certificates
Mount certificates at runtime:

```bash
docker run -d \
  -p 443:443 \
  -v /path/to/cert.pem:/etc/ssl/certs/cert.pem:ro \
  -v /path/to/key.pem:/etc/ssl/certs/key.pem:ro \
  your-username/oauth2-api-tester:latest
```

### Option 3: Environment-Specific Images
Build environment-specific images at deployment time that include certificates.

## Security Notes

- **Never commit SSL certificates to your repository**
- **Use Docker Hub access tokens instead of passwords**
- **Regularly rotate your access tokens**
- **Handle SSL/TLS certificates at deployment time, not build time**
- **Review repository access and permissions periodically**

## Troubleshooting

### Docker Push Fails
- Verify `DOCKER_USERNAME` and `DOCKER_PASSWORD` are correct
- Ensure the Docker Hub access token has write permissions
- Check that the repository name matches your Docker Hub namespace

### Missing Secrets
- Go to repository Settings → Secrets and variables → Actions
- Verify both `DOCKER_USERNAME` and `DOCKER_PASSWORD` are present in the Secrets tab
