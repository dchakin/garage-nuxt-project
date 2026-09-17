#!/bin/sh
set -e

cd /opt/garage
git fetch origin
git checkout master
git reset --hard origin/master
docker compose pull
docker compose up -d
docker image prune -f
