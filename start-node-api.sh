#!/bin/bash

# Start Node.js JSON2Video API
echo "Starting JSON2Video Node.js TypeScript API..."

# Check if Redis is running
if ! pgrep -x "redis-server" > /dev/null; then
    echo "Starting Redis server..."
    redis-server --daemonize yes
    sleep 2
fi

# Check if Node.js dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

# Build TypeScript
echo "Building TypeScript..."
npm run build

# Create required directories
mkdir -p cache movies logs movies/testkey

# Start the API
echo "Starting Node.js API on port 3000..."
npm start
