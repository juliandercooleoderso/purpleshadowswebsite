const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// -------------------- Middleware --------------------
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// -------------------- In-Memory Clips --------------------
let clips = []; // Clips werden nur im RAM gespeichert

// -------------------- Multer Setup --------------------
// Dateien werden im Memory gespeichert (Base64) für Deploy-Sicherheit
const storage = multer.memoryStorage();
const upload = multer({ storage });

// -------------------- Routen --------------------

// Index-Seite
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Clips-Liste zurückgeben
app.get('/clips', (req, res) => {
    res.json(clips);
});

// Clip hochladen
app.post('/upload-clip', upload.single('clip'), (req, res) => {
    if (!req.file || !req.body.desc) return res.status(400).send('Fehler beim Upload');

    // Datei als Base64 speichern
    const clipData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    clips.push({
        file: clipData,
        desc: req.body.desc
    });

    res.status(200).send('Upload erfolgreich');
});

// -------------------- Socket.IO --------------------
let onlineUsers = 0;

io.on('connection', (socket) => {
    console.log('Ein Benutzer verbunden');

    socket.on('userLogin', () => {
        onlineUsers++;
        io.emit('updateUserCount', onlineUsers);
    });

    socket.on('userLogout', () => {
        onlineUsers = Math.max(onlineUsers - 1, 0);
        io.emit('updateUserCount', onlineUsers);
    });

    socket.on('disconnect', () => {
        onlineUsers = Math.max(onlineUsers - 1, 0);
        io.emit('updateUserCount', onlineUsers);
        console.log('Ein Benutzer getrennt');
    });
});

// -------------------- Server starten --------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));

