start_tunnel() {
  echo "Starting cloudflared tunnel and capturing URL..."
  cloudflared tunnel --url http://localhost:3000 --protocol http2 > /tmp/cloudflared_output.log 2>&1 &
  # cloudflared tunnel --url http://localhost:3000 --protocol http2 2>&1 | tee /tmp/cloudflared_output.log &
  TUNNEL_PID=$!
  echo "Cloudflared tunnel started with PID: $TUNNEL_PID"

  # wait for the line containing the quick tunnel URL to appear in the log file
  echo "Waiting for tunnel URL..."
  while ! grep -q 'Your quick Tunnel has been created! Visit it at' /tmp/cloudflared_output.log; do
    sleep 1
  done

  # Extract the URL using grep
  # We specifically look for the line below the creation message and then
  # extract the HTTPS URL from that line.
  # SAMPLE LINE:
  # 2025-05-12T17:30:24Z INF +--------------------------------------------------------------------------------------------+
  # 2025-05-12T17:30:24Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
  # 2025-05-12T17:30:24Z INF |  https://subdomain.trycloudflare.com                                                       |
  # 2025-05-12T17:30:24Z INF +--------------------------------------------------------------------------------------------+
  TUNNEL_URL=$(grep -A 1 'Your quick Tunnel has been created! Visit it at' /tmp/cloudflared_output.log | grep -o 'https://[-a-zA-Z0-9]*\.trycloudflare\.com')

  # wait for a connection to be established
  echo "Waiting for tunnel connection to be established..."
  while ! grep -q 'Registered tunnel connection connIndex=' /tmp/cloudflared_output.log; do
    sleep 1
  done
  echo "Connection established!"
}

# start the cloudflared tunnel
start_tunnel

# build a message to be displayed by the listener server once it starts
POST_START_MESSAGE=$(cat <<EOF



+-------------------------------------------------------------------------------------------------------------------------+
|  You need to sign authenticate with Google BigQuery before this workflow can complete.                                  |
|  Sign in at https://gbq-auth.shi.institute/?postUrl=${TUNNEL_URL}
+-------------------------------------------------------------------------------------------------------------------------+


 
EOF
)

# start the server and wait until it closes
LISTEN_URL=$TUNNEL_URL POST_START_MESSAGE=$POST_START_MESSAGE node ./listen.mjs
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo "Credentials process failed with a non-zero status code: $EXIT_CODE"
  exit $EXIT_CODE
else
  echo "Credentials received successfully."
fi

# stop the cloudflared tunnel
echo "Stopping cloudflared tunnel..."
kill $TUNNEL_PID
echo "Cloudflared tunnel stopped."
