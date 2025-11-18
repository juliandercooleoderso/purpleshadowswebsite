const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));
app.use(express.json());

// -------------------- Clips persistent --------------------
const clipsFile = path.join(__dirname, 'clips.json');
let clips = [];

try {
    if (fs.existsSync(clipsFile)) {
        clips = JSON.parse(fs.readFileSync(clipsFile));
    }
} catch (err) {
    console.error('Fehler beim Laden der Clips:', err);
}

// -------------------- Multer --------------------
const storage = multer.memoryStorage();
const upload = multer({ storage });

// -------------------- Routen --------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Clips zurückgeben
app.get('/clips', (req, res) => {
    res.json(clips);
});

// Clip hochladen
app.post('/upload-clip', upload.single('clip'), (req, res) => {
    const username = req.body.username || 'Unbekannt';
    const desc = req.body.desc;

    if (!req.file || !desc) return res.status(400).send('Fehler beim Upload');

    const clipData = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const newClip = {
        id: Date.now(),
        file: clipData,
        desc,
        user: username
    };

    clips.push(newClip);
    fs.writeFileSync(clipsFile, JSON.stringify(clips, null, 2));

    io.emit('newClip', newClip); // Echtzeit Update
    res.status(200).send('Upload erfolgreich');
});

// Clip löschen
app.post('/delete-clip', (req, res) => {
    const { id, username } = req.body;

    // Nur Julian oder Max dürfen löschen
    if (!['Julian','Max'].includes(username)) return res.status(403).send('Keine Rechte');

    clips = clips.filter(c => c.id != id);
    fs.writeFileSync(clipsFile, JSON.stringify(clips, null, 2));

    io.emit('removeClip', id); // Echtzeit Update
    res.status(200).send('Clip gelöscht');
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


