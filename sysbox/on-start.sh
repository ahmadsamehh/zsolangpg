# #!/bin/bash

# # dockerd start
# dockerd > /var/log/dockerd.log 2>&1 &
# sleep 3

# # pull solang image
# docker pull ghcr.io/hyperledger-solang/solang:latest

# cargo make run

# ##########################
# #!/bin/bash
# # dockerd start
# dockerd > /var/log/dockerd.log 2>&1 &
# sleep 3

# # pull solang image
# docker pull ghcr.io/hyperledger-solang/solang:latest

# # Execute the compiled backend directly instead of using cargo make
# # Ensure the path matches where it's copied in the Dockerfile
# /app/target/release/backend --frontend_folder /app/packages/app/dist --port 4444

#!/bin/bash

echo "--- Debugging Startup Script ---"

echo "Current working directory:"
pwd

echo "Listing files in current directory:"
ls -la

echo "Listing files in /app directory:"
ls -la /app

echo "Changing directory to /app"
cd /app

echo "Current working directory after cd:"
pwd

echo "Listing files in /app directory again:"
ls -la

echo "--- End Debugging --- Starting Original Script Logic ---"

# dockerd start
dockerd > /var/log/dockerd.log 2>&1 &
sleep 3

# pull solang image
docker pull ghcr.io/hyperledger-solang/solang:latest

echo "Attempting to run cargo make run from /app"
cargo make run

echo "--- Script Finished ---"

