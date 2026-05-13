import { exec } from "child_process";
import fs from "fs/promises";
import { createServer } from "http";

/**
 * @param {unknown} str
 * @returns {str is string}
 */
function isString(str) {
  return typeof str === "string" || str instanceof String;
}

/**
 * @param {unknown} value
 * @returns {value is null}
 */
function isNull(value) {
  return value === null;
}

const server = createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        message: "Server is running",
        instructions:
          "Send a POST request with the credentials to save them to the job output.",
      }),
    );
    return;
  }

  if (req.method === "POST" && req.url === "/") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
        return;
      }

      // check if the request body is valid
      const credentials = {
        refresh_token: isString(parsed.refresh_token)
          ? parsed.refresh_token
          : undefined,
        id_token: isNull(parsed.id_token) ? parsed.id_token : undefined,
        token_uri: isString(parsed.token_uri) ? parsed.token_uri : undefined,
        client_id: isString(parsed.client_id) ? parsed.client_id : undefined,
        client_secret: isString(parsed.client_secret)
          ? parsed.client_secret
          : undefined,
        scopes: Array.isArray(parsed.scopes)
          ? parsed.scopes.filter((s) => isString(s))
          : undefined,
        type: isString(parsed.type) ? parsed.type : undefined,
      };

      // if any of the values are undefined, return 400
      if (Object.values(credentials).some((v) => v === undefined)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid credentials" }));
        return;
      }

      // write the credentials to a file
      fs.writeFile("credentials.json", JSON.stringify(credentials));

      // write the json to the GITHUB_OUTPUT variable
      /**
       * ## Example Usage
       *
       *  jobs:
       *    job-one:
       *      runs-on: ubuntu-latest
       *      outputs:
       *        bigquery_credentials: ${{ steps.job-one.outputs.BIGQUERY_CREDENTIALS }}
       *      steps:
       *        # logic to start a nodejs server wait for the credentials
       *        # tip: add a timeout to the server to stop it after 5 minutes
       *
       *    job-two:
       *     needs: [job-one]
       *     runs-on: ubuntu-latest
       *     env:
       *       BIGQUERY_CREDENTIALS: ${{ needs.job-one.outputs.bigquery_credentials }}
       *     steps:
       *       # logic to use the credentials
       */
      exec(
        `echo 'BIGQUERY_CREDENTIALS=${JSON.stringify(
          credentials,
        )}' >> $GITHUB_OUTPUT`,
        (err) => {
          if (err) {
            console.error("Error writing to GITHUB_OUTPUT:", err);
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ error: "Error writing to GITHUB_OUTPUT" }),
            );
            return;
          }
        },
      );

      // stop the server
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Credentials saved" }));
      console.log("Credentials saved to job output");
      server.close();
      process.exit(0);
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(3000, () => {
  if (process.env.LISTEN_URL) {
    console.log(`Listing for credentials at ${process.env.LISTEN_URL}...`);
  } else {
    console.log("Listing for credentials on port 3000...");
  }

  // log the multi-line message, but indent each line by two spaces
  if (process.env.POST_START_MESSAGE) {
    const lines = process.env.POST_START_MESSAGE.split("\n");
    console.log("  " + lines.join("\n  "));
  }

  // if the server has a timeout variable, stop the server after the timeout
  const serverTimeoutSeconds = parseInt(process.env.TIMEOUT || "0");
  if (serverTimeoutSeconds > 0) {
    console.log(
      `  Server will time out after ${serverTimeoutSeconds} seconds.`,
    );
    setTimeout(() => {
      console.log(
        `  Server timed out after ${serverTimeoutSeconds} seconds. Stopping server...`,
      );
      server.close();
      process.exit(1);
    }, serverTimeoutSeconds * 1000);
  }
});
