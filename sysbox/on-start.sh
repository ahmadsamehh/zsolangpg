#!/bin/bash

# dockerd start
dockerd > /var/log/dockerd.log 2>&1 &
sleep 3

# pull solang image 
docker pull ghcr.io/hyperledger-solang/solang:latest

cargo make run
