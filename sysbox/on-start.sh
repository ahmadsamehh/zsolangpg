#!/bin/bash

# Start dockerd in the background
echo "Starting Docker daemon..."
dockerd > /var/log/dockerd.log 2>&1 &

# Wait a few seconds for dockerd to initialize
sleep 5

# Pull the required solang image
echo "Pulling solang image..."
docker pull ghcr.io/hyperledger-solang/solang:latest

# Start the backend application
# Point it to the location where frontend assets were copied
echo "Starting backend server..."
/app/backend --frontend_folder /app/frontend_dist --port 4444

# If the backend exits, the script finishes, and the container stops.
# Keep the container running if the backend runs in the foreground.

