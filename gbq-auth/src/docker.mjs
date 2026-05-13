import fs from "fs/promises";
import { createServer } from "http";
import worker from "./worker.mjs";

const PORT = 3000;
const BASE = `http://localhost:${PORT}`;

const server = createServer(async (req, res) => {
  const url = new URL(req.url, BASE);

  // receive credentials POSTed by the worker and write them to disk
  if (req.method === "POST" && url.pathname === "/credentials") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", async () => {
      await fs.mkdir("./credentials", { recursive: true });
      await fs.writeFile("./credentials/bigquery_credentials.json", body);
      res.writeHead(200);
      res.end();
      console.log("Credentials retrieved. Stopping server...");
      server.close();
    });
    return;
  }

  // inject postUrl on the initial visit so the worker knows where to send credentials
  if (req.method === "GET" && url.pathname === "/") {
    url.searchParams.set("postUrl", `${BASE}/credentials`);
  }

  // proxy everything else through the worker
  const response = await worker.fetch(
    new Request(url.href, { method: req.method }),
  );
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
});

server.listen(PORT, () => {
  console.log(`Server available at ${BASE}`);
});
