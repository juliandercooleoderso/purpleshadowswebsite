const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------- FILE STORAGE --------------------
const clipsFile = path.join(__dirname, "clips.json");
if (!fs.existsSync(clipsFile)) fs.writeFileSync(clipsFile, "[]");

const upload = multer({ dest: path.join(__dirname, "uploads/") });

// -------------------- SOCKET.IO --------------------
let userCount = 0;
io.on("connection", (socket) => {
  userCount++;
  io.emit("updateUserCount", userCount);

  socket.on("disconnect", () => {
    userCount--;
    io.emit("updateUserCount", userCount);
  });
});

// -------------------- SERVE FILES --------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/login.json", (req, res) => {
  res.sendFile(path.join(__dirname, "login.json"));
});

// -------------------- CLIPS --------------------
app.get("/clips", (req, res) => {
  const clips = JSON.parse(fs.readFileSync(clipsFile));
  res.json(clips);
});

app.post("/upload-clip", upload.single("clip"), (req, res) => {
  const { desc, user } = req.body;
  if (!req.file || !desc || !user) return res.status(400).send("Fehler");

  const filePath = `/uploads/${req.file.filename}`;
  const clips = JSON.parse(fs.readFileSync(clipsFile));
  clips.push({ file: filePath, desc, user });
  fs.writeFileSync(clipsFile, JSON.stringify(clips, null, 2));
  res.sendStatus(200);
});

app.post("/delete-clip", (req, res) => {
  const { file } = req.body;
  let clips = JSON.parse(fs.readFileSync(clipsFile));
  clips = clips.filter(c => c.file !== file);
  fs.writeFileSync(clipsFile, JSON.stringify(clips, null, 2));

  // Optional: delete file from /uploads
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);

  res.sendStatus(200);
});

// -------------------- STATIC UPLOADS --------------------
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// -------------------- OTHER SECTIONS --------------------
// Dummy endpoints for gallery/clothing/vehicles/members if needed
app.get("/gallery", (req, res) => res.json([]));
app.get("/clothing", (req, res) => res.json([]));
app.get("/vehicles", (req, res) => res.json([]));
app.get("/members", (req, res) => res.json([]));

// -------------------- SERVER --------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
