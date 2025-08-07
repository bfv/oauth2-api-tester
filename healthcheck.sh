#!/bin/sh
# Simple health check script for the application

# Check if nginx is running
if ! pgrep nginx > /dev/null; then
    echo "Nginx is not running"
    exit 1
fi

# Check if the application responds to HTTP requests
if ! wget --quiet --tries=1 --spider http://localhost/health; then
    echo "Application health check failed"
    exit 1
fi

echo "Application is healthy"
exit 0
