#!/bin/bash

echo 'Starting…'

# if /data is not mounted, throw an error
if [ ! -d "/data" ]; then
  echo "Error: /data directory is not mounted. Please mount the /data directory."
  exit 1
fi

# if /input is not mounted, throw an error
if [ ! -d "/input" ]; then
  echo "Error: /input directory is not mounted. Please mount the /input directory."
  exit 1
fi

# ensure /data has read-write-delete permissions for all users
if [ -d "/data" ]; then
  # echo "Ensuring permissions for /data"
  sudo chmod -R u+rwx /data
fi

# ensure /input has read-write-delete permissions for all users
if [ -d "/input" ]; then
  # echo "Ensuring permissions for /input"
  sudo chmod -R u+rwx /input
fi

# execute the provided command
exec conda run --no-capture-output --prefix ./env python src/main.py "$@"
