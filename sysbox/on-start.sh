#!/bin/bash

# Start dockerd in the background
echo "Starting Docker daemon..."
dockerd > /var/log/dockerd.log 2>&1 &

# Wait for the Docker socket to be available
echo "Waiting for Docker daemon socket..."
while [ ! -S /var/run/docker.sock ]; do
  echo -n "."
  sleep 1
done
echo " Docker socket found!"

# Pull the required solang image
echo "Pulling solang image..."
docker pull ghcr.io/hyperledger-solang/solang:latest

# Start the backend application in the background
# Note: We remove the --frontend_folder flag as it's not needed when running next start
echo "Starting backend server in background..."
/app/backend --port 4444 & # Run in background

# Wait a moment for the backend to potentially start
sleep 3

# Start the frontend application in the foreground
echo "Starting frontend server (next start)..."
cd /app/packages/frontend
# Use npx to ensure 'next' command is found reliably
npx next start # Runs `next start` in the foreground, keeping the container alive

# If npx next start exits, the script finishes, and the container stops.























# #!/bin/bash

# # Start dockerd in the background
# echo "Starting Docker daemon..."
# dockerd > /var/log/dockerd.log 2>&1 &

# # Wait a few seconds for dockerd to initialize
# sleep 5

# # Pull the required solang image
# echo "Pulling solang image..."
# docker pull ghcr.io/hyperledger-solang/solang:latest

# # Start the backend application in the background
# # Note: We remove the --frontend_folder flag as it's not needed when running next start
# echo "Starting backend server in background..."
# /app/backend --port 4444 & # Run in background

# # Wait a moment for the backend to potentially start
# sleep 3

# # Start the frontend application in the foreground
# echo "Starting frontend server (next start)..."
# cd /app/packages/frontend
# npm run start # Runs `next start` in the foreground, keeping the container alive

# # If npm run start exits, the script finishes, and the container stops.


















# # # #!/bin/bash

# # # # dockerd start
# # # dockerd > /var/log/dockerd.log 2>&1 &
# # # sleep 3

# # # # pull solang image
# # # docker pull ghcr.io/hyperledger-solang/solang:latest

# # # cargo make run

# # # ##########################
# # # #!/bin/bash
# # # # dockerd start
# # # dockerd > /var/log/dockerd.log 2>&1 &
# # # sleep 3

# # # # pull solang image
# # # docker pull ghcr.io/hyperledger-solang/solang:latest

# # # # Execute the compiled backend directly instead of using cargo make
# # # # Ensure the path matches where it's copied in the Dockerfile
# # # /app/target/release/backend --frontend_folder /app/packages/app/dist --port 4444

# # #!/bin/bash

# # echo "--- Debugging Startup Script ---"

# # echo "Current working directory:"
# # pwd

# # echo "Listing files in current directory:"
# # ls -la

# # echo "Listing files in /app directory:"
# # ls -la /app

# # echo "Changing directory to /app"
# # cd /app

# # echo "Current working directory after cd:"
# # pwd

# # echo "Listing files in /app directory again:"
# # ls -la

# # echo "--- End Debugging --- Starting Original Script Logic ---"

# # # dockerd start
# # dockerd > /var/log/dockerd.log 2>&1 &
# # sleep 3

# # # pull solang image
# # docker pull ghcr.io/hyperledger-solang/solang:latest

# # echo "Attempting to run cargo make run from /app"
# # cargo make run

# # echo "--- Script Finished ---"

