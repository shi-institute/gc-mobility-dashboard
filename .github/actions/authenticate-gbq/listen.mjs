import { exec } from "child_process";
import express from "express";
import fs from "fs/promises";

const app = express();
app.use(express.json());

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

app.post("/", (req, res) => {
  const refresh_token = req.body.refresh_token;
  const id_token = req.body.id_token;
  const token_uri = req.body.token_uri;
  const client_id = req.body.client_id;
  const client_secret = req.body.client_secret;
  const scopes = req.body.scopes;
  const type = req.body.type;

  // check if the request body is valid
  const credentials = {
    refresh_token: isString(refresh_token) ? refresh_token : undefined,
    id_token: isNull(id_token) ? id_token : undefined,
    token_uri: isString(token_uri) ? token_uri : undefined,
    client_id: isString(client_id) ? client_id : undefined,
    client_secret: isString(client_secret) ? client_secret : undefined,
    scopes: Array.isArray(scopes)
      ? scopes.filter((scope) => isString(scope))
      : undefined,
    type: isString(type) ? type : undefined,
  };

  // if any of the values are undefined, return 400
  if (Object.values(credentials).some((value) => value === undefined)) {
    return res.status(400).json({ error: "Invalid credentials" });
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
      credentials
    )}' >> $GITHUB_OUTPUT`,
    (err) => {
      if (err) {
        console.error("Error writing to GITHUB_OUTPUT:", err);
        return res
          .status(500)
          .json({ error: "Error writing to GITHUB_OUTPUT" });
      }
    }
  );

  // stop the server
  res.status(200).json({ message: "Credentials saved" });
  console.log("Credentials saved to job output");
  server.close();
  process.exit(0);
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Server is running",
    instructions:
      "Send a POST request with the credentials to save them to the job output.",
  });
});

const server = app.listen(3000, () => {
  if (process.env.LISTEN_URL) {
    console.log(`Listing for credentials at ${process.env.LISTEN_URL}...`);
  } else {
    console.log("Listing for credentials on port 3000...");
  }

  // log the multi-line message, but put indentent each line by two sapces
  if (process.env.POST_START_MESSAGE) {
    const message = process.env.POST_START_MESSAGE;
    const lines = message.split("\n");
    console.log("  " + lines.join("\n  "));
  }

  // if the server has a timeout variable, stop the server
  // after the timeout is reached
  const serverTimeoutSeconds = parseInt(process.env.TIMEOUT || "0");
  if (serverTimeoutSeconds > 0) {
    console.log(
      `  Server will time out after ${serverTimeoutSeconds} seconds.`
    );
    setTimeout(() => {
      console.log(
        `  Server timed out after ${serverTimeoutSeconds} seconds. Stopping server...`
      );
      server.close();
      process.exit(1);
    }, parseInt(serverTimeoutSeconds) * 1000);
  }
});
