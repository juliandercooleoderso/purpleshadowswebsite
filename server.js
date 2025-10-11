import express from "express";
import fs from "fs";
import { Server } from "socket.io";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;

app.use(express.static(__dirname));
app.use(express.json());

const membersFile = path.join(__dirname, "members.json");
const loginFile = path.join(__dirname, "login.json");

function loadJSON(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
  return JSON.parse(fs.readFileSync(file));
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let members = loadJSON(membersFile);
let logins = loadJSON(loginFile);
let viewers = 0;
let onlineUsers = [];
let auditLogs = [];

// ================= ROUTES =================
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = logins.find(u => u.username === username && u.password === password);
  res.json({ success: !!user });
});

app.get("/members", (req, res) => res.json(members));

// ================= SOCKET.IO =================
io.on("connection", socket => {
  viewers++;
  io.emit("updateViewers", viewers);

  // Live Mitglieder
  socket.emit("updateMembers", members);

  socket.on("userOnline", username => {
    if (!onlineUsers.includes(username)) {
      onlineUsers.push(username);
      io.emit("updateOnlineUsers", onlineUsers);
      addAuditLog(`🟢 ${username} ist online gekommen.`);
    }
    socket.username = username;
  });

  socket.on("disconnect", () => {
    viewers--;
    io.emit("updateViewers", viewers);
    if (socket.username) {
      onlineUsers = onlineUsers.filter(u => u !== socket.username);
      io.emit("updateOnlineUsers", onlineUsers);
      addAuditLog(`🔴 ${socket.username} ist offline gegangen.`);
    }
  });

  // Sende Online-Users und Logs beim Verbinden
  socket.emit("updateOnlineUsers", onlineUsers);
  auditLogs.forEach(log => socket.emit("newAuditLog", log));
});

// 🔥 Logs
function addAuditLog(text) {
  const entry = `${text}`;
  auditLogs.push(entry);
  if (auditLogs.length > 200) auditLogs.shift();
  io.emit("newAuditLog", entry);
}

// Watcher für members.json, um automatisch zu aktualisieren
fs.watchFile(membersFile, () => {
  members = loadJSON(membersFile);
  io.emit("updateMembers", members);
});

server.listen(PORT, () =>
  console.log(`💜 Server läuft auf http://localhost:${PORT}`)
);

