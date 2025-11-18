const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');
const multer = require('multer');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// -------------------- MULTER FÜR CLIPS --------------------
const uploadFolder = path.join(__dirname, 'clips');
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, uploadFolder);
    },
    filename: function(req, file, cb){
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage });

// -------------------- MIDDLEWARE --------------------
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// -------------------- ROUTEN --------------------

// index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Clips-Liste zurückgeben
app.get('/clips', (req, res) => {
    const clipsFile = path.join(__dirname, 'clips.json');
    if (!fs.existsSync(clipsFile)) {
        fs.writeFileSync(clipsFile, JSON.stringify([]));
    }
    const clips = JSON.parse(fs.readFileSync(clipsFile));
    res.json(clips);
});

// Clip hochladen
app.post('/upload-clip', upload.single('clip'), (req, res) => {
    if (!req.file || !req.body.desc) return res.status(400).send('Fehler beim Upload');

    const clipsFile = path.join(__dirname, 'clips.json');
    if (!fs.existsSync(clipsFile)) fs.writeFileSync(clipsFile, JSON.stringify([]));

    const clips = JSON.parse(fs.readFileSync(clipsFile));

    clips.push({
        file: '/clips/' + req.file.filename,
        desc: req.body.desc
    });

    fs.writeFileSync(clipsFile, JSON.stringify(clips, null, 2));

    res.status(200).send('Upload erfolgreich');
});

// -------------------- SOCKET.IO --------------------
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

// -------------------- SERVER START --------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));

