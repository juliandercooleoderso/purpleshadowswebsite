const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');
const multer = require('multer');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// -------------------- Ordner & JSON Dateien sichern --------------------
const uploadFolder = path.join(__dirname, 'clips');
try {
    if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder, { recursive: true });
} catch (err) {
    console.error('Fehler beim Anlegen des Upload-Ordners:', err);
}

// Clips JSON Datei sicherstellen
const clipsFile = path.join(__dirname, 'clips.json');
if (!fs.existsSync(clipsFile)) fs.writeFileSync(clipsFile, JSON.stringify([]));

// -------------------- Multer Setup --------------------
const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, path.resolve(uploadFolder));
    },
    filename: function(req, file, cb){
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage });

// -------------------- Middleware --------------------
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// -------------------- Routen --------------------

// Startseite
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Clips-Liste zurückgeben
app.get('/clips', (req, res) => {
    try {
        const clips = JSON.parse(fs.readFileSync(clipsFile));
        res.json(clips);
    } catch (err) {
        console.error('Fehler beim Lesen der Clips JSON:', err);
        res.json([]);
    }
});

// Clip hochladen
app.post('/upload-clip', upload.single('clip'), (req, res) => {
    if (!req.file || !req.body.desc) return res.status(400).send('Fehler beim Upload');

    try {
        const clips = JSON.parse(fs.readFileSync(clipsFile));

        clips.push({
            file: '/clips/' + req.file.filename,
            desc: req.body.desc
        });

        fs.writeFileSync(clipsFile, JSON.stringify(clips, null, 2));
        res.status(200).send('Upload erfolgreich');
    } catch (err) {
        console.error('Fehler beim Speichern des Clips:', err);
        res.status(500).send('Serverfehler');
    }
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
