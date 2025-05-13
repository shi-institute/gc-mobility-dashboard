import express from "express";
import { existsSync } from "fs";
import fs from "fs/promises";

const isDocker =
  existsSync("/.dockerenv") && !process.env.VERCEL_PROJECT_PRODUCTION_URL;

const app = express();

const client_id =
  "189253846803-cae4r4271bv6drnc5sas1hfkm0o1t0u9.apps.googleusercontent.com";
const client_secret = "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";
const redirect_uri = (() => {
  if (isDocker) {
    return "http://localhost:3000/oauth";
  }
  return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}/oauth`;
})();
const scope = "https://www.googleapis.com/auth/bigquery";

app.get("/", (req, res) => {
  console.log("Redirecting to Google OAuth...");
  console.log("Redirect URI: ", redirect_uri);
  console.log(process.env);

  const state = serializeState({
    lastChance: req.query.lastChance === "1" ? "1" : "0",
    postUrl: req.query.postUrl,
  });

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("scope", scope);
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("access_type", "offline"); // this is needed to get a refresh token
  url.searchParams.set("response_type", "code"); // this gets a code instead of a token so we can get a refresh token
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirect_uri);
  url.searchParams.set("client_id", client_id);

  console.log("Redirecting to: ", url.href);
  res.redirect(url.href);
});

/**
 * @param {string} code
 */
async function getTokensFromCode(code) {
  const url = new URL("https://oauth2.googleapis.com/token");
  url.searchParams.set("code", code);
  url.searchParams.set("client_id", client_id);
  url.searchParams.set("client_secret", client_secret);
  url.searchParams.set("redirect_uri", redirect_uri);
  url.searchParams.set("grant_type", "authorization_code");

  const data = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  })
    .then((response) => response.json())
    .then((json) => {
      return {
        /** @type {string} */
        access_token: json.access_token,
        /** @type {number} */
        expires_in: json.expires_in,
        /** @type {string} */
        token_type: json.token_type,
        /** @type {string} */
        scope: json.scope,
        /** @type {string | undefined} */
        refresh_token: json.refresh_token,
      };
    });

  return data;
}

/**
 * @param {string} token
 */
async function revokeToken(token) {
  const url = new URL("https://oauth2.googleapis.com/revoke");
  url.searchParams.set("token", token);
  url.searchParams.set("client_id", client_id);
  url.searchParams.set("client_secret", client_secret);

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
}

/**
 * @param {string} state
 * @returns {Record<string, string>}
 */
function parseState(state) {
  const parsedState = state.split(";").reduce((acc, curr) => {
    const [key, value] = curr.split("=");
    acc[key] = value;
    return acc;
  }, {});

  return parsedState;
}

/**
 *
 * @param {Record<string, string>} state
 * @returns {string}
 */
function serializeState(state) {
  return Object.entries(state)
    .map(([key, value]) => `${key}=${value}`)
    .join(";");
}

/**
 * @param {string} str
 */
function isURL(str) {
  try {
    new URL(str);
    return true;
  } catch (e) {
    return false;
  }
}

app.get("/oauth", async (req, res) => {
  const { code, error, state } = req.query;
  const parsedState = parseState(state?.toString() || "");
  const lastChance = parsedState["lastChance"] === "1";

  if (error) {
    res.status(400).send(`Error: ${error}`);
    return;
  }

  if (!code) {
    res.status(400).send("No code provided");
    return;
  }

  const { access_token, refresh_token } = await getTokensFromCode(
    code.toString()
  );

  // If there is no refresh token provided, that means there is already
  // a refresh token that was issued for this user.
  // We can use the associated access token to revoke the refresh token.
  // Then, we can get a new authorization code and exchange it for a new refresh token.
  if (!refresh_token) {
    // if lastChance is true, that means we already tried to revoke the token
    // and it failed. We should not try to revoke the token again.
    if (lastChance) {
      res
        .status(400)
        .send(
          "No refresh token provided. <br /> Please try again. <br /> <a href='/'>Try again</a>"
        );
      return;
    }

    await revokeToken(access_token);
    res.redirect(
      "/?lastChance=1&postUrl=" + encodeURIComponent(parsedState["postUrl"])
    );
    return;
  }

  // build the credentials json needed to access the BigQuery API usiing pandas-gbq
  const credentials = {
    refresh_token,
    id_token: null,
    token_uri: "https://oauth2.googleapis.com/token",
    client_id: client_id,
    client_secret: client_secret,
    scopes: scope.split(" ").map((s) => s.trim()),
    type: "authorized_user",
  };

  // if working in the docker image, save the credentials to a file
  if (isDocker) {
    await fs.mkdir("./credentials", { recursive: true });
    await fs.writeFile(
      "./credentials/bigquery_credentials.json",
      JSON.stringify(credentials)
    );
  }

  // otherwise, post them to the url in state
  else {
    const postUrl = parsedState["postUrl"];
    if (!postUrl) {
      res.status(400).send("No post URL provided");
      return;
    }
    if (!isURL(postUrl)) {
      res.status(400).send("Invalid post URL provided");
      return;
    }
    await fetch(postUrl, {
      method: "POST",
      body: JSON.stringify(credentials),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  res.status(200).send(
    "Done. You can close this window now." +
      `<script>
      // remove search params from the URL
      const url = new URL(window.location.href);
      const keys = url.searchParams.keys();
      for (const key of keys) {
        url.searchParams.delete(key);
      }
      window.history.replaceState({}, document.title, url.href);
    </script>`
  );

  // if we are in a docker container, we need to stop the server
  // after we get the credentials so it does not keep running
  // and consuming resources
  if (isDocker) {
    console.log("Credentials retrieved. Stopping server...");
    server.close();
  }
});

const server = app.listen(3000, () => {
  if (isDocker) {
    console.log("Server available at http://localhost:3000");
  }
});

export default app;
