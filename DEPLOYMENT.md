# Deployment Guide

This guide explains how to deploy the OAuth2 API Tester application with proper SSL/TLS configuration.

## Overview

The Docker image built by the GitHub Actions workflow serves HTTP only on port 80. This is intentional - SSL certificates should be handled at deployment time for security and flexibility.

## Deployment Options

### Option 1: Reverse Proxy with SSL Termination (Recommended)

Use a reverse proxy to handle SSL termination. This is the most secure and flexible approach.

#### Using Traefik

```yaml
# docker-compose.yml
version: '3.8'

services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.email=your-email@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/acme.json"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./acme.json:/acme.json
    networks:
      - oauth2-network

  oauth2-app:
    image: your-username/oauth2-api-tester:latest
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.oauth2-app.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.oauth2-app.entrypoints=websecure"
      - "traefik.http.routers.oauth2-app.tls.certresolver=letsencrypt"
      - "traefik.http.services.oauth2-app.loadbalancer.server.port=80"
    networks:
      - oauth2-network

networks:
  oauth2-network:
    external: false
```

#### Using nginx Reverse Proxy

```nginx
# nginx.conf for reverse proxy
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    location / {
        proxy_pass http://oauth2-app:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```yaml
# docker-compose.yml for nginx reverse proxy
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./cert.pem:/etc/ssl/certs/cert.pem:ro
      - ./key.pem:/etc/ssl/private/key.pem:ro
    depends_on:
      - oauth2-app
    networks:
      - oauth2-network

  oauth2-app:
    image: your-username/oauth2-api-tester:latest
    networks:
      - oauth2-network

networks:
  oauth2-network:
    external: false
```

### Option 2: Cloud Load Balancer

When deploying to cloud platforms, use their load balancer services for SSL termination:

#### AWS Application Load Balancer
- Configure ALB with SSL certificate from ACM
- Point ALB to your container running on port 80
- Use AWS ECS or EKS for container orchestration

#### Google Cloud Load Balancer
- Use Google-managed SSL certificates
- Configure load balancer to forward to your service on port 80

#### Azure Application Gateway
- Configure Application Gateway with SSL certificate
- Point to your container service on port 80

### Option 3: Volume Mount Certificates

If you must include certificates in the container, mount them at runtime:

```bash
docker run -d \
  -p 443:443 \
  -v /path/to/cert.pem:/etc/ssl/certs/cert.pem:ro \
  -v /path/to/key.pem:/etc/ssl/certs/key.pem:ro \
  -v /path/to/nginx-ssl.conf:/etc/nginx/nginx.conf:ro \
  your-username/oauth2-api-tester:latest
```

You'll need to create a custom nginx configuration that enables the HTTPS server block.

### Option 4: Kubernetes Ingress

```yaml
# kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oauth2-api-tester
spec:
  replicas: 2
  selector:
    matchLabels:
      app: oauth2-api-tester
  template:
    metadata:
      labels:
        app: oauth2-api-tester
    spec:
      containers:
      - name: oauth2-api-tester
        image: your-username/oauth2-api-tester:latest
        ports:
        - containerPort: 80

---
apiVersion: v1
kind: Service
metadata:
  name: oauth2-api-tester-service
spec:
  selector:
    app: oauth2-api-tester
  ports:
  - port: 80
    targetPort: 80

---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: oauth2-api-tester-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: oauth2-api-tester-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: oauth2-api-tester-service
            port:
              number: 80
```

## Security Considerations

1. **Certificate Management**: Use automated certificate management (Let's Encrypt, cloud-managed certificates)
2. **Private Key Security**: Never commit private keys to repositories
3. **Certificate Rotation**: Implement automated certificate renewal
4. **Security Headers**: Ensure your reverse proxy adds appropriate security headers
5. **Network Security**: Use private networks for container-to-container communication

## Environment Variables

The application doesn't require SSL-specific environment variables since SSL is handled externally. However, you may need to configure:

- OAuth callback URLs to use HTTPS endpoints
- CORS settings if using different domains
- Security policy headers via your reverse proxy

## Testing

After deployment, verify:

1. HTTP to HTTPS redirection works
2. SSL certificate is valid and trusted
3. OAuth flows work with HTTPS callback URLs
4. All static assets load over HTTPS

## Production Checklist

- [ ] SSL certificate is valid and from a trusted CA
- [ ] HTTP to HTTPS redirection is configured
- [ ] Security headers are properly set
- [ ] OAuth callback URLs use HTTPS
- [ ] Certificate auto-renewal is configured
- [ ] Monitoring and logging are in place
- [ ] Backup and disaster recovery plans include certificate management
