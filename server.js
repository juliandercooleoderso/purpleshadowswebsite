const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Damit index.html und login.json direkt erreichbar sind
app.use(express.static(__dirname));

// Clips handling
let clips = [];
const clipsFile = 'clips.json';
if (fs.existsSync(clipsFile)) {
    clips = JSON.parse(fs.readFileSync(clipsFile));
}

// GET /clips
app.get('/clips', (req, res) => {
    res.json(clips);
});

// POST /upload-clip
const multer = require('multer');
const upload = multer({ dest: 'clips_upload/' });

app.post('/upload-clip', upload.single('clip'), (req, res) => {
    const { desc, user } = req.body;
    const file = `/clips_upload/${req.file.filename}`;
    clips.push({ file, desc, user });
    fs.writeFileSync(clipsFile, JSON.stringify(clips, null, 2));
    res.sendStatus(200);
});

// POST /delete-clip
app.post('/delete-clip', (req, res) => {
    const { file } = req.body;
    clips = clips.filter(c => c.file !== file);
    fs.writeFileSync(clipsFile, JSON.stringify(clips, null, 2));
    // Datei löschen
    fs.unlink(file.substring(1), err => {}); // remove leading '/'
    res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`Server läuft auf http://localhost:${port}`);
});
