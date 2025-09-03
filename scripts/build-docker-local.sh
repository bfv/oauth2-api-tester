#!/bin/bash

# Local Docker Build Script
# Simple build script for the OAuth2 API Tester application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Building OAuth2 API Tester Docker Image...${NC}"

# Build the Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t oauth2-api-tester:local .

echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${YELLOW}To run the container:${NC}"
echo "docker run -p 80:80 oauth2-api-tester:local"
echo ""
echo -e "${YELLOW}Note: This image only serves HTTP on port 80.${NC}"
echo -e "${YELLOW}For HTTPS, configure SSL at deployment time using a reverse proxy.${NC}"
