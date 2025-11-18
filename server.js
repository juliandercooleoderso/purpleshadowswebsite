const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// -------------------- MIDDLEWARE --------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // Hier muss dein index.html + assets liegen

// -------------------- USER TRACKING --------------------
let onlineUsers = 0;

io.on('connection', (socket) => {
    onlineUsers++;
    io.emit('updateUserCount', onlineUsers);

    socket.on('userLogin', () => {
        onlineUsers++;
        io.emit('updateUserCount', onlineUsers);
    });

    socket.on('userLogout', () => {
        onlineUsers = Math.max(0, onlineUsers - 1);
        io.emit('updateUserCount', onlineUsers);
    });

    socket.on('disconnect', () => {
        onlineUsers = Math.max(0, onlineUsers - 1);
        io.emit('updateUserCount', onlineUsers);
    });
});

// -------------------- MULTER SETUP --------------------
const clipsDir = path.join(__dirname, 'public', 'clips');
if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: function (req, file, cb) { cb(null, clipsDir); },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
        cb(null, uniqueName);
    }
});
const upload = multer({ storage: storage });

// -------------------- CLIPS ROUTES --------------------

// Alle Clips laden
app.get('/clips', (req, res) => {
    const clipsFile = path.join(clipsDir, 'clips.json');
    if (!fs.existsSync(clipsFile)) return res.json([]);
    const data = JSON.parse(fs.readFileSync(clipsFile));
    res.json(data);
});

// Clip hochladen
app.post('/upload-clip', upload.single('clip'), (req, res) => {
    const { desc, user } = req.body;
    if (!req.file || !desc || !user) return res.status(400).send('Fehler beim Upload');

    const clipPath = `/clips/${req.file.filename}`;
    const clipsFile = path.join(clipsDir, 'clips.json');
    let clips = [];
    if (fs.existsSync(clipsFile)) clips = JSON.parse(fs.readFileSync(clipsFile));

    clips.push({ file: clipPath, desc, user });
    fs.writeFileSync(clipsFile, JSON.stringify(clips, null, 2));

    res.sendStatus(200);
});

// Clip löschen
app.post('/delete-clip', (req, res) => {
    const { file } = req.body;
    if (!file) return res.status(400).send('Keine Datei angegeben');

    const clipsFile = path.join(clipsDir, 'clips.json');
    if (!fs.existsSync(clipsFile)) return res.sendStatus(200);

    let clips = JSON.parse(fs.readFileSync(clipsFile));
    clips = clips.filter(c => c.file !== file);

    fs.writeFileSync(clipsFile, JSON.stringify(clips, null, 2));

    const filePath = path.join(__dirname, 'public', file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    res.sendStatus(200);
});

// -------------------- SERVER START --------------------
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));

