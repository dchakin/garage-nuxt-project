#!/bin/sh
set -e

cd /opt/garage
git fetch origin
git checkout master
git reset --hard origin/master
docker compose up -d --build
docker image prune -f
