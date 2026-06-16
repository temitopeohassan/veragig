// Custom server entry point for Phusion Passenger (cPanel "Setup Node.js App").
//
// Passenger loads this file and intercepts `.listen()` to bind the app to the
// socket it manages, so the PORT value below is only used as a local fallback.
// Run `npm run build` before starting — this serves the production build.
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const port = process.env.PORT || 3000;
const app = next({ dev: false });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res, parse(req.url, true));
  }).listen(port, () => {
    console.log(`> VeraGig frontend ready on port ${port}`);
  });
});
