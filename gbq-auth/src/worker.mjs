import {
  buildCredentials,
  client_id,
  getTokensFromCode,
  isURL,
  parseState,
  revokeToken,
  scope,
  serializeState,
} from "./oauth.mjs";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const redirectUri = `${url.origin}/oauth`;

    if (url.pathname === "/") {
      const state = serializeState({
        lastChance: url.searchParams.get("lastChance") === "1" ? "1" : "0",
        postUrl: url.searchParams.get("postUrl"),
      });

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("scope", scope);
      authUrl.searchParams.set("include_granted_scopes", "true");
      authUrl.searchParams.set("access_type", "offline"); // this is needed to get a refresh token
      authUrl.searchParams.set("response_type", "code"); // this gets a code instead of a token so we can get a refresh token
      authUrl.searchParams.set("state", state);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("client_id", client_id);

      return Response.redirect(authUrl.href, 302);
    }

    if (url.pathname === "/oauth") {
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      const parsedState = parseState(url.searchParams.get("state") || "");
      const lastChance = parsedState["lastChance"] === "1";

      if (error) {
        return new Response(`Error: ${error}`, { status: 400 });
      }

      if (!code) {
        return new Response("No code provided", { status: 400 });
      }

      const { access_token, refresh_token } = await getTokensFromCode(
        code,
        redirectUri,
      );

      // If there is no refresh token provided, that means there is already
      // a refresh token that was issued for this user.
      // We can use the associated access token to revoke the refresh token.
      // Then, we can get a new authorization code and exchange it for a new refresh token.
      if (!refresh_token) {
        // if lastChance is true, that means we already tried to revoke the token
        // and it failed. We should not try to revoke the token again.
        if (lastChance) {
          return new Response(
            "No refresh token provided. <br /> Please try again. <br /> <a href='/'>Try again</a>",
            { status: 400, headers: { "Content-Type": "text/html" } },
          );
        }

        await revokeToken(access_token);

        const retryUrl = new URL(`${url.origin}/`);
        retryUrl.searchParams.set("lastChance", "1");
        retryUrl.searchParams.set("postUrl", parsedState["postUrl"] || "");
        return Response.redirect(retryUrl.href, 302);
      }

      const postUrl = parsedState["postUrl"];
      if (!postUrl) {
        return new Response("No post URL provided", { status: 400 });
      }
      if (!isURL(postUrl)) {
        return new Response("Invalid post URL provided", { status: 400 });
      }

      // post the credentials to the url in state
      await fetch(postUrl, {
        method: "POST",
        body: JSON.stringify(buildCredentials(refresh_token)),
        headers: { "Content-Type": "application/json" },
      });

      return new Response(
        `Done. You can close this window now.<script>
const url = new URL(window.location.href);
for (const key of [...url.searchParams.keys()]) url.searchParams.delete(key);
window.history.replaceState({}, document.title, url.href);
</script>`,
        { status: 200, headers: { "Content-Type": "text/html" } },
      );
    }

    return new Response("Not found", { status: 404 });
  },
};
