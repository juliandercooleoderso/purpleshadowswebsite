// server.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const PORT = process.env.PORT || 3000;

// Middleware für JSON Body
app.use(express.json());

// Ordner für Clips
const CLIP_DIR = path.join(__dirname, 'clips');
const CLIP_DATA = path.join(__dirname, 'clips.json');

// Stelle sicher, dass der Clips-Ordner existiert
if (!fs.existsSync(CLIP_DIR)) fs.mkdirSync(CLIP_DIR);

// Clips.json existiert? Wenn nicht, erstellen
if (!fs.existsSync(CLIP_DATA)) fs.writeFileSync(CLIP_DATA, JSON.stringify([]));

// Statische Dateien (index.html, CSS, JS, Bilder)
app.use(express.static(path.join(__dirname, 'public')));

// Multer Setup für Upload
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, CLIP_DIR);
    },
    filename: function(req, file, cb) {
        const unique = Date.now() + '_' + file.originalname;
        cb(null, unique);
    }
});
const upload = multer({ storage: storage });

// --- ROUTES ---
// Root /index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Clips hochladen
app.post('/upload-clip', upload.single('clip'), (req, res) => {
    if(!req.file || !req.body.desc || !req.body.user){
        return res.status(400).send('Fehlende Daten');
    }

    const clips = JSON.parse(fs.readFileSync(CLIP_DATA));
    clips.push({
        file: `/clips/${req.file.filename}`,
        desc: req.body.desc,
        user: req.body.user
    });
    fs.writeFileSync(CLIP_DATA, JSON.stringify(clips, null, 2));
    res.status(200).send('OK');
});

// Clips löschen
app.post('/delete-clip', (req, res) => {
    const { file } = req.body;
    if (!file) return res.status(400).send('Keine Datei angegeben');

    // Datei löschen
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    // Aus JSON entfernen
    let clips = JSON.parse(fs.readFileSync(CLIP_DATA));
    clips = clips.filter(c => c.file !== file);
    fs.writeFileSync(CLIP_DATA, JSON.stringify(clips, null, 2));

    res.status(200).send('Gelöscht');
});

// Alle Clips laden
app.get('/clips', (req, res) => {
    const clips = JSON.parse(fs.readFileSync(CLIP_DATA));
    res.json(clips);
});

// --- SOCKET.IO User Zähler ---
let userCount = 0;
io.on('connection', (socket) => {
    // Client emit Login/Logout
    socket.on('userLogin', () => {
        userCount++;
        io.emit('updateUserCount', userCount);
    });
    socket.on('userLogout', () => {
        userCount = Math.max(0, userCount-1);
        io.emit('updateUserCount', userCount);
    });

    socket.on('disconnect', () => {
        userCount = Math.max(0, userCount-1);
        io.emit('updateUserCount', userCount);
    });
});

// Clips Ordner statisch bereitstellen
app.use('/clips', express.static(CLIP_DIR));

// Server starten
http.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
