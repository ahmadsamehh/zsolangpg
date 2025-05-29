# #!/bin/bash

# # dockerd start
# dockerd > /var/log/dockerd.log 2>&1 &
# sleep 3

# # pull solang image
# docker pull ghcr.io/hyperledger-solang/solang:latest

# cargo make run

##########################
#!/bin/bash
# dockerd start
dockerd > /var/log/dockerd.log 2>&1 &
sleep 3

# pull solang image
docker pull ghcr.io/hyperledger-solang/solang:latest

# Execute the compiled backend directly instead of using cargo make
# Ensure the path matches where it's copied in the Dockerfile
/app/target/release/backend --frontend_folder /app/packages/app/dist --port 4444

