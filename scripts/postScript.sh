#!/bin/bash
cd /home/ubuntu/fileforge-docker-aws

# Purane containers band karein
docker compose -f docker-compose.yaml down

# Images build karein
docker compose -f docker-compose.yaml build

# Containers start karein (background mein)
docker compose -f docker-compose.yaml up -d
