#!/bin/bash

echo 'Starting…'

# if /data is not mounted, throw an error
if [ ! -d "/credentials" ]; then
  echo "Error: /credentials directory is not mounted. Please mount the /credentials directory."
  exit 1
fi

# execute the provided command
exec npm run start "$@"
