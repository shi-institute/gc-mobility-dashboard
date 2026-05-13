export const client_id =
  "189253846803-cae4r4271bv6drnc5sas1hfkm0o1t0u9.apps.googleusercontent.com";
export const client_secret = "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";
export const scope = "https://www.googleapis.com/auth/bigquery";

/**
 * @param {string} state
 * @returns {Record<string, string>}
 */
export function parseState(state) {
  return state.split(";").reduce((acc, curr) => {
    const idx = curr.indexOf("=");
    acc[curr.slice(0, idx)] = curr.slice(idx + 1);
    return acc;
  }, {});
}

/**
 * @param {Record<string, string>} state
 * @returns {string}
 */
export function serializeState(state) {
  return Object.entries(state)
    .filter(([, value]) => value != null)
    .map(([key, value]) => `${key}=${value}`)
    .join(";");
}

/**
 * @param {string} str
 */
export function isURL(str) {
  try {
    new URL(str);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * @param {string} code
 * @param {string} redirectUri
 */
export async function getTokensFromCode(code, redirectUri) {
  const url = new URL("https://oauth2.googleapis.com/token");
  url.searchParams.set("code", code);
  url.searchParams.set("client_id", client_id);
  url.searchParams.set("client_secret", client_secret);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("grant_type", "authorization_code");

  const json = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  }).then((r) => r.json());

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
}

/**
 * @param {string} token
 */
export async function revokeToken(token) {
  const url = new URL("https://oauth2.googleapis.com/revoke");
  url.searchParams.set("token", token);
  url.searchParams.set("client_id", client_id);
  url.searchParams.set("client_secret", client_secret);

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

/**
 * Builds the credentials JSON needed to access the BigQuery API using pandas-gbq.
 * @param {string} refreshToken
 * @returns {object}
 */
export function buildCredentials(refreshToken) {
  return {
    refresh_token: refreshToken,
    id_token: null,
    token_uri: "https://oauth2.googleapis.com/token",
    client_id,
    client_secret,
    scopes: scope.split(" ").map((s) => s.trim()),
    type: "authorized_user",
  };
}
