const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Persistente Clips-Datei
const clipsFile = path.join(__dirname, 'clips.json');
if(!fs.existsSync(clipsFile)){
    fs.writeFileSync(clipsFile, JSON.stringify([]));
}

// ------------------------------
// Hinweis: Upload / Delete Routen wurden entfernt.
// Die Seite liest Clips ausschließlich aus clips.json.
// ------------------------------

// Online Users Tracking
let onlineUsers = 0;
io.on('connection', (socket) => {
    console.log('Ein Benutzer verbunden');
    socket.on('userLogin', () => { onlineUsers++; io.emit('updateUserCount', onlineUsers); });
    socket.on('userLogout', () => { onlineUsers = Math.max(onlineUsers-1,0); io.emit('updateUserCount', onlineUsers); });
    socket.on('disconnect', () => { onlineUsers = Math.max(onlineUsers-1,0); io.emit('updateUserCount', onlineUsers); console.log('Ein Benutzer getrennt'); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));


