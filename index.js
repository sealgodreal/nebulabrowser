import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { libcurlPath } from "@mercuryworkshop/libcurl-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { createBareServer } from "@tomphttp/bare-server-node";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import wisp from "wisp-server-node";

const __dirname = path.resolve();
const server = http.createServer();
const bareServer = createBareServer('/seal/');
const app = express(server);
const PORT = 8000;

app.use(express.json());
app.use(express.urlencoded({ extended: true, }));

app.use(express.static(path.join(__dirname, 'static')));
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/libcurl/", express.static(libcurlPath));
app.use("/baremux/", express.static(baremuxPath));

app.get('/math', (req, res) => { res.sendFile(path.join(__dirname, 'static', 'lesson.html')); });
app.get('/algebra', (req, res) => { res.sendFile(path.join(__dirname, 'static', 'settings.html')); });
app.get('/reading', (req, res) => { res.sendFile(path.join(__dirname, 'static', 'class.html')); });

app.get('/geometry', (req, res) => { res.sendFile(path.join(__dirname, 'static', 'education.html')); });
app.get('/stem', (req, res) => { res.sendFile(path.join(__dirname, 'static', 'projects.html')); });

app.use((req, res) => {
  res.statusCode = 404;
  res.sendFile(path.join(__dirname, './static/404.html'));
});

server.on("request", (req, res) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeRequest(req, res);
  } else app(req, res);
});

server.on("upgrade", (req, socket, head) => {
  if (bareServer.shouldRoute(req)) {
    bareServer.routeUpgrade(req, socket, head);
  } else if (req.url.endsWith("/wisp/")) {
    wisp.routeRequest(req, socket, head);
  } else socket.end();
});

server.on('listening', () => {
  console.log("     welcome to \x1b[38;5;205mNebula Static\x1b[0m!");
  console.log("    \x1b[38;5;242m---------------------------\x1b[0m");
  console.log("     \x1b[38;5;117mhttp://localhost:" + PORT + "\x1b[0m");
  console.log("     \x1b[38;5;117mhttp://127.0.0.1:" + PORT + "\x1b[0m");
  console.log("     \x1b[38;5;117mhttp://0.0.0.0:" + PORT + "\x1b[0m");
  console.log("\x1b[38;5;238m\n   best unbl0cker - by seal\x1b[0m");
});

function shutdown(signal) {
  console.log(`\n\n shutting down... signal: ${signal}`);
  process.exit(1);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));


server.listen({
  port: PORT,
});