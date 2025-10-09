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

let members = JSON.parse(fs.readFileSync(membersFile));
let logins = JSON.parse(fs.readFileSync(loginFile));

// Login prüfen
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = logins.find(u => u.username === username && u.password === password);
  res.json({ success: !!user });
});

// Mitgliederliste holen
app.get("/members", (req, res) => res.json(members));

// Socket.io
io.on("connection", socket => {
  console.log("🔗 Client verbunden");
  socket.emit("updateMembers", members);

  socket.on("addMember", data => {
    if (!data.username) return; // leerer Name verboten
    members.push(data);
    fs.writeFileSync(membersFile, JSON.stringify(members, null, 2));
    io.emit("updateMembers", members);
  });

  socket.on("deleteMember", username => {
    members = members.filter(m => m.username !== username);
    fs.writeFileSync(membersFile, JSON.stringify(members, null, 2));
    io.emit("updateMembers", members);
  });
});

server.listen(PORT, () => console.log(`💜 Server läuft auf http://localhost:${PORT}`));
