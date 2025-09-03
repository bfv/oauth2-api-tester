#!/bin/bash

# GitHub Workflow Validation Script
# This script checks if the Docker build workflow configuration is correct

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}GitHub Workflow Configuration Checker${NC}"
echo "======================================"

# Check if workflow file exists
if [[ -f ".github/workflows/docker-build.yml" ]]; then
    echo -e "${GREEN}✓${NC} GitHub workflow file exists"
else
    echo -e "${RED}✗${NC} GitHub workflow file missing"
    exit 1
fi

# Check if .gitignore excludes certificate files
echo ""
echo -e "${YELLOW}Git Configuration:${NC}"
if grep -q "*.pem" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✓${NC} .gitignore excludes .pem files (SSL certificates)"
else
    echo -e "${YELLOW}⚠${NC}  .gitignore should exclude .pem files to prevent committing certificates"
fi

# Check if Dockerfile is simplified (no certificate handling)
echo ""
echo -e "${YELLOW}Docker Configuration:${NC}"
if ! grep -q "CERT_PEM\|KEY_PEM" Dockerfile 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Dockerfile does not handle SSL certificates (good practice)"
else
    echo -e "${RED}✗${NC} Dockerfile contains certificate handling (should be removed)"
fi

# Display checklist for manual verification
echo ""
echo -e "${BLUE}Manual Verification Checklist:${NC}"
echo ""
echo -e "${YELLOW}GitHub Repository Secrets (Settings → Secrets and variables → Actions → Secrets):${NC}"
echo "□ DOCKER_USERNAME - Your Docker Hub username"
echo "□ DOCKER_PASSWORD - Your Docker Hub access token"
echo ""
echo -e "${YELLOW}SSL Certificate Handling:${NC}"
echo "□ SSL certificates are NOT included in the Docker image"
echo "□ SSL will be handled at deployment time (reverse proxy, volume mounts, etc.)"
echo ""
echo -e "${YELLOW}To trigger the workflow:${NC}"
echo "git tag v1.0.0"
echo "git push origin v1.0.0"
echo ""
echo -e "${BLUE}The built image will serve HTTP on port 80 only.${NC}"
echo -e "${BLUE}Configure SSL/TLS at deployment time for production use.${NC}"
echo ""
echo -e "${BLUE}For detailed setup instructions, see GITHUB-SETUP.md${NC}"
