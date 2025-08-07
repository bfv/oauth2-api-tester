# Multi-stage build for Angular application
FROM node:20-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app from builder stage
COPY --from=builder /app/dist/keycloak-jwt-client /usr/share/nginx/html

# Copy SSL certificates if they exist
COPY cert.pem /etc/ssl/certs/cert.pem
COPY key.pem /etc/ssl/certs/key.pem

# Expose port
EXPOSE 80
EXPOSE 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
