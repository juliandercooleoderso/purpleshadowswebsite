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

const clipsFile = path.join(__dirname, 'clips.json');
if(!fs.existsSync(clipsFile)) fs.writeFileSync(clipsFile, JSON.stringify([]));

// Serve index.html
app.get('/', (req,res)=>{
    res.sendFile(path.join(__dirname,'index.html'));
});

// Save Clip
app.post('/saveClip', (req,res)=>{
    const clip = req.body;
    fs.readFile(clipsFile,(err,data)=>{
        if(err) return res.status(500).send('Fehler');
        let clips = [];
        try{ clips = JSON.parse(data); } catch(e){}
        clips.push(clip);
        fs.writeFile(clipsFile, JSON.stringify(clips,null,2), err=>{
            if(err) return res.status(500).send('Fehler');
            io.emit('newClip', clip);
            res.sendStatus(200);
        });
    });
});

// Delete Clip
app.post('/deleteClip', (req,res)=>{
    const {id} = req.body;
    fs.readFile(clipsFile,(err,data)=>{
        if(err) return res.status(500).send('Fehler');
        let clips = [];
        try{ clips = JSON.parse(data); } catch(e){}
        clips = clips.filter(c=>c.id!==id);
        fs.writeFile(clipsFile, JSON.stringify(clips,null,2), err=>{
            if(err) return res.status(500).send('Fehler');
            io.emit('deleteClip', id);
            res.sendStatus(200);
        });
    });
});

// Online Users
let onlineUsers = 0;
io.on('connection', (socket)=>{
    console.log('Ein Benutzer verbunden');
    socket.on('userLogin', ()=>{
        onlineUsers++;
        io.emit('updateUserCount', onlineUsers);
    });
    socket.on('userLogout', ()=>{
        onlineUsers = Math.max(onlineUsers-1,0);
        io.emit('updateUserCount', onlineUsers);
    });
    socket.on('disconnect', ()=>{
        onlineUsers = Math.max(onlineUsers-1,0);
        io.emit('updateUserCount', onlineUsers);
        console.log('Ein Benutzer getrennt');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log(`Server läuft auf Port ${PORT}`));
