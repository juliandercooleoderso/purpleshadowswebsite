const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// -------------------- Multer Setup (speichert Clips temporär im Speicher) --------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// -------------------- Middleware --------------------
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// -------------------- In-Memory Clips --------------------
let clips = []; // Clips werden nur im RAM gespeichert

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

    // Datei-Objekt ins Array speichern (im Memory)
    clips.push({
        file: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
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


