# Docker Setup for Keycloak JWT Client

This document explains how to run the Keycloak JWT Client Angular application using Docker.

## Quick Start

### Production Build

Build and run the production version:

```bash
# Build the Docker image
docker build -t oauth2-api-tester .

# Run the container
docker run -p 8080:80 oauth2-api-tester
```

The application will be available at http://localhost:8080

### Using Docker Compose

For easier management, use Docker Compose:

```bash
# Build and start the production service
docker-compose up --build

# Run in background
docker-compose up -d --build
```

## Development Setup

For development with hot reloading:

```bash
# Start development services
docker-compose --profile dev up --build

# This will start:
# - Angular dev server on port 4200
# - OAuth callback server on port 3000
```

## Available Services

### Production Service
- **Service**: `oauth2-api-tester`
- **Ports**: 8080 (HTTP), 8443 (HTTPS)
- **Image**: Multi-stage build with nginx
- **Health Check**: Available at `/health`

### Development Services (Profile: dev)
- **Angular Dev Server**: Port 4200 with hot reloading
- **OAuth Callback Server**: Port 3000 for OAuth flows

## SSL/HTTPS Support

The application includes SSL certificate support:

1. Place your SSL certificates in the project root:
   - `cert.pem` - SSL certificate
   - `key.pem` - Private key

2. Uncomment the HTTPS server block in `nginx.conf`

3. The application will be available on HTTPS port 8443

## Docker Commands Reference

### Building
```bash
# Build the image
docker build -t oauth2-api-tester .

# Build with custom tag
docker build -t oauth2-api-tester:v1.0.0 .
```

### Running
```bash
# Run with port mapping
docker run -p 8080:80 oauth2-api-tester

# Run in background
docker run -d -p 8080:80 oauth2-api-tester

# Run with SSL certificates
docker run -p 8080:80 -p 8443:443 \
  -v $(pwd)/cert.pem:/etc/ssl/certs/cert.pem:ro \
  -v $(pwd)/key.pem:/etc/ssl/certs/key.pem:ro \
  oauth2-api-tester
```

### Docker Compose Commands
```bash
# Start all services
docker-compose up

# Start with build
docker-compose up --build

# Start development profile
docker-compose --profile dev up

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Scale services
docker-compose up --scale oauth2-api-tester=3
```

## Configuration

### Environment Variables
The application supports these environment variables:

- `NODE_ENV`: Set to 'production' or 'development'

### Nginx Configuration
The nginx configuration (`nginx.conf`) includes:

- Angular routing support (SPA)
- Security headers
- Gzip compression
- Static asset caching
- OAuth callback routing
- Health check endpoint

### Docker Compose Profiles
- **Default**: Production services only
- **dev**: Include development services (Angular dev server, OAuth callback server)

## Troubleshooting

### Common Issues

1. **Port conflicts**: Change the port mapping if 8080 is in use
   ```bash
   docker run -p 3000:80 oauth2-api-tester
   ```

2. **SSL certificate errors**: Ensure certificates exist or comment out SSL server block

3. **Build failures**: Check that Node.js dependencies are compatible
   ```bash
   # Clean build
   docker build --no-cache -t oauth2-api-tester .
   ```

### Health Checks
Check if the application is healthy:
```bash
curl http://localhost:8080/health
```

### Logs
View application logs:
```bash
# Docker run logs
docker logs <container_id>

# Docker compose logs
docker-compose logs oauth2-api-tester
```

## Performance Optimization

The Docker setup includes several optimizations:

1. **Multi-stage build**: Reduces final image size
2. **nginx**: Efficient static file serving
3. **Gzip compression**: Reduces bandwidth usage
4. **Static asset caching**: Improves load times
5. **Health checks**: Ensures service reliability

## Security Features

- Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- SSL/TLS support
- Non-root user execution
- Minimal attack surface with Alpine Linux

## Integration with CI/CD

Example GitHub Actions workflow:

```yaml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t oauth2-api-tester .
      - name: Run tests
        run: docker run --rm oauth2-api-tester npm test
```
