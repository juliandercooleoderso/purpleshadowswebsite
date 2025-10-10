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

// JSON-Dateien
const membersFile = path.join(__dirname, "members.json");
const loginFile = path.join(__dirname, "login.json");
const meetingsFile = path.join(__dirname, "meetings.json");
const changesFile = path.join(__dirname, "aenderungen.json");
const warsFile = path.join(__dirname, "kriege.json");

// JSON Helper
function loadJSON(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
  return JSON.parse(fs.readFileSync(file));
}
function saveJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Daten laden
let members = loadJSON(membersFile);
let logins = loadJSON(loginFile);
let meetings = loadJSON(meetingsFile);
let changes = loadJSON(changesFile);
let wars = loadJSON(warsFile);

// Live-Viewer Zähler
let viewers = 0;

// 🔥 NEU: Online-User und Audit-Logs
let onlineUsers = [];
let auditLogs = [];

// ================= ROUTES =================

// Login prüfen
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = logins.find(u => u.username === username && u.password === password);
  res.json({ success: !!user });
});

// Mitgliederliste holen
app.get("/members", (req, res) => res.json(members));

// Items holen
app.get("/items/:table", (req, res) => {
  const table = req.params.table;
  if (table === "meetings-table") return res.json(meetings);
  if (table === "changes-table") return res.json(changes);
  if (table === "wars-table") return res.json(wars);
  res.json([]);
});

// ================= SOCKET.IO =================
io.on("connection", socket => {
  viewers++;
  io.emit("updateViewers", viewers);
  console.log(`🔗 Client verbunden, Viewer: ${viewers}`);

  // Initial Daten senden
  socket.emit("updateMembers", members);
  socket.emit("updateItems", { table: "meetings-table", items: meetings });
  socket.emit("updateItems", { table: "changes-table", items: changes });
  socket.emit("updateItems", { table: "wars-table", items: wars });

  // 🔥 NEU: Login-Event von Client
  socket.on("userOnline", username => {
    if (!onlineUsers.includes(username)) {
      onlineUsers.push(username);
      io.emit("updateOnlineUsers", onlineUsers);
      addAuditLog(`🟢 ${username} ist online gekommen.`);
    }
    socket.username = username;
  });

  // ================= MEMBERS =================
  socket.on("addMember", data => {
    if (!data.username) return;
    members.push(data);
    saveJSON(membersFile, members);
    io.emit("updateMembers", members);
    addAuditLog(`➕ Mitglied hinzugefügt: ${data.username} (${data.rank})`);
  });

  socket.on("deleteMember", username => {
    members = members.filter(m => m.username !== username);
    saveJSON(membersFile, members);
    io.emit("updateMembers", members);
    addAuditLog(`❌ Mitglied gelöscht: ${username}`);
  });

  // ================= ITEMS =================
  socket.on("addItem", ({ table, date, text }) => {
    const item = { date, text };
    if (table === "meetings-table") { meetings.push(item); saveJSON(meetingsFile, meetings); }
    if (table === "changes-table") { changes.push(item); saveJSON(changesFile, changes); }
    if (table === "wars-table") { wars.push(item); saveJSON(warsFile, wars); }

    const items = table === "meetings-table" ? meetings : table === "changes-table" ? changes : wars;
    io.emit("updateItems", { table, items });

    addAuditLog(`📝 Neuer Eintrag in ${table}: "${text}" (${date})`);
  });

  socket.on("deleteItem", ({ table, date, text }) => {
    if (table === "meetings-table") { meetings = meetings.filter(i => i.date !== date || i.text !== text); saveJSON(meetingsFile, meetings); }
    if (table === "changes-table") { changes = changes.filter(i => i.date !== date || i.text !== text); saveJSON(changesFile, changes); }
    if (table === "wars-table") { wars = wars.filter(i => i.date !== date || i.text !== text); saveJSON(warsFile, wars); }

    const items = table === "meetings-table" ? meetings : table === "changes-table" ? changes : wars;
    io.emit("updateItems", { table, items });

    addAuditLog(`🗑️ Eintrag gelöscht aus ${table}: "${text}"`);
  });

  // ================= DISCONNECT =================
  socket.on("disconnect", () => {
    viewers--;
    io.emit("updateViewers", viewers);
    console.log(`❌ Client getrennt, Viewer: ${viewers}`);

    // 🔥 NEU: Entfernen aus Online-User-Liste
    if (socket.username) {
      onlineUsers = onlineUsers.filter(u => u !== socket.username);
      io.emit("updateOnlineUsers", onlineUsers);
      addAuditLog(`🔴 ${socket.username} ist offline gegangen.`);
    }
  });

  // 🔥 NEU: Beim Verbinden Logs und Online-User senden
  socket.emit("updateOnlineUsers", onlineUsers);
  auditLogs.forEach(log => socket.emit("newAuditLog", log));
});

// 🔥 NEU: Funktion für Logs
function addAuditLog(text) {
  const entry = `${text}`;
  auditLogs.push(entry);
  if (auditLogs.length > 200) auditLogs.shift(); // Alte löschen
  io.emit("newAuditLog", entry);
}

// ================= SERVER START =================
server.listen(PORT, () =>
  console.log(`💜 Server läuft auf http://localhost:${PORT}`)
);

