const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

// --- Multer Setup ---
const upload = multer({ dest: "uploads/" });

// --- Serve index.html directly ---
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// --- Serve uploaded clips ---
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// --- Load Clips ---
function loadClipsData() {
    if (!fs.existsSync("clips.json")) {
        fs.writeFileSync("clips.json", JSON.stringify([]));
    }
    const data = fs.readFileSync("clips.json", "utf8");
    return JSON.parse(data);
}

function saveClipsData(clips) {
    fs.writeFileSync("clips.json", JSON.stringify(clips, null, 2));
}

// --- Upload Clip ---
app.post("/upload-clip", upload.single("clip"), (req, res) => {
    if (!req.file || !req.body.desc || !req.body.user) {
        return res.status(400).send("Missing data");
    }

    const clips = loadClipsData();

    const ext = path.extname(req.file.originalname);
    const newName = `${req.file.filename}${ext}`;
    const newPath = path.join(__dirname, "uploads", newName);

    fs.renameSync(req.file.path, newPath);

    clips.push({
        file: `/uploads/${newName}`,
        desc: req.body.desc,
        user: req.body.user
    });

    saveClipsData(clips);
    res.send("OK");
});

// --- Get Clips ---
app.get("/clips", (req, res) => {
    const clips = loadClipsData();
    res.json(clips);
});

// --- Delete Clip ---
app.post("/delete-clip", (req, res) => {
    const { file } = req.body;
    if (!file) return res.status(400).send("No file specified");

    let clips = loadClipsData();
    const clip = clips.find(c => c.file === file);
    if (clip) {
        // Remove file from uploads
        const filePath = path.join(__dirname, file);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        // Remove from array
        clips = clips.filter(c => c.file !== file);
        saveClipsData(clips);
        res.send("Deleted");
    } else {
        res.status(404).send("Clip not found");
    }
});

// --- Socket.io for user count ---
let userCount = 0;
io.on("connection", (socket) => {
    socket.on("userLogin", () => {
        userCount++;
        io.emit("updateUserCount", userCount);
    });
    socket.on("userLogout", () => {
        userCount--;
        if(userCount<0) userCount=0;
        io.emit("updateUserCount", userCount);
    });
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
