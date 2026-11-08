// Starts the real routers on a local port so tests can call them like a browser would.
import express from "express";
import http from "node:http";

// Start the routers. `users` maps a name to the person that request pretends to be logged in as; `mounts` is a list of [path, router].
export async function startTestServer({ mounts, users }) {
  const app = express();
  app.use(express.json());

  // Instead of real login, the request says who it is in a header.
  app.use((req, res, next) => {
    req.user = users[req.get("x-test-user")] ?? null;
    next();
  });
  for (const [path, router] of mounts) app.use(path, router);

  const server = await new Promise((resolve) => {
    const started = app.listen(0, () => resolve(started));
  });
  const base = `http://127.0.0.1:${server.address().port}`;

  // Remember every route that was called (with ids swapped for :id) and every answer that came back.
  const hits = new Set();
  const bodies = [];

  const call = async (method, path, { as, body } = {}) => {
    hits.add(`${method} ${path.split("?")[0].replace(/\/\d+/g, "/:id")}`);

    const response = await fetch(base + path, {
      method,
      headers: { "content-type": "application/json", ...(as ? { "x-test-user": as } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const parsed = text ? JSON.parse(text) : null;
    bodies.push(parsed);
    return { status: response.status, body: parsed };
  };

  return { call, hits, bodies, close: () => new Promise((resolve) => server.close(resolve)) };
}

// Start a tiny stand-in for the address-lookup service. `places` maps a typed address to the place it should answer with.
export async function startFakeGeocoder(places) {
  const server = http.createServer((req, res) => {
    const address = new URL(req.url, "http://localhost").searchParams.get("q");
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(places[address] ? [places[address]] : []));
  });
  await new Promise((resolve) => server.listen(0, resolve));

  return {
    url: `http://127.0.0.1:${server.address().port}/search`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
