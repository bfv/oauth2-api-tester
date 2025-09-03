# Multi-stage build for Angular application
FROM node:20-alpine AS builder

# Build argument for the tag
ARG BUILD_TAG=dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies needed for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Replace the placeholder version in the production environment file
RUN sed -i "s/PLACEHOLDER_VERSION/${BUILD_TAG}/g" src/environments/environment.prod.ts

# Build the application with the tag as an environment variable
ENV NG_APP_VERSION=$BUILD_TAG
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app from builder stage
COPY --from=builder /app/dist/oauth2-api-tester/browser /usr/share/nginx/html

# Copy SSL certificates if they exist
COPY cert.pem /etc/ssl/certs/cert.pem
COPY key.pem /etc/ssl/certs/key.pem

# Expose port
EXPOSE 80
EXPOSE 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
