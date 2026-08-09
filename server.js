require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' })); // 100mb for video/music uploads

// FIREBASE INIT - Reads from Render Environment Variable
try {
  const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "zimconnect-xxx.appspot.com" // <-- CHANGE THIS TO YOUR BUCKET
  });
  console.log("Firebase Connected ✅");
} catch(e) {
  console.log("Firebase Error: Add GOOGLE_APPLICATION_CREDENTIALS_JSON to Environment");
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// HEALTH CHECK
app.get('/', (req, res) => {
  res.json({ 
    status: "ZimConnect Backend Running", 
    version: "2.0",
    features: ["TV", "Podcast", "Radio", "Music", "Payments"]
  });
});


// =================== 1. TV - VIDEO ===================
app.post('/tv/upload', async (req, res) => {
  try {
    const { title, description, videoBase64 } = req.body;
    const fileName = `tv/${Date.now()}_${title}.mp4`;
    const file = bucket.file(fileName);
    await file.save(Buffer.from(videoBase64, 'base64'), { contentType: 'video/mp4' });
    const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
    
    const doc = await db.collection('tv').add({ title, description, videoUrl: url, views: 0, createdAt: new Date() });
    res.json({ success: true, id: doc.id, videoUrl: url });
  } catch(e) { res.status(500).json({ error: e.message }) }
});

app.get('/tv', async (req, res) => {
  const snapshot = await db.collection('tv').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});


// =================== 2. PODCAST - AUDIO ===================
app.post('/podcast/upload', async (req, res) => {
  try {
    const { title, host, description, audioBase64 } = req.body;
    const fileName = `podcast/${Date.now()}_${title}.mp3`;
    const file = bucket.file(fileName);
    await file.save(Buffer.from(audioBase64, 'base64'), { contentType: 'audio/mp3' });
    const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
    
    const doc = await db.collection('podcast').add({ title, host, description, audioUrl: url, plays: 0, createdAt: new Date() });
    res.json({ success: true, id: doc.id, audioUrl: url });
  } catch(e) { res.status(500).json({ error: e.message }) }
});

app.get('/podcast', async (req, res) => {
  const snapshot = await db.collection('podcast').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});


// =================== 3. RADIO - LIVE STREAM ===================
app.get('/radio', async (req, res) => {
  res.json({ 
    station: "ZimConnect Radio 263", 
    streamUrl: "https://stream.zeno.fm/0r0a792kwz8uv", // <-- PUT YOUR RADIO LINK
    isLive: true,
    country: "Zimbabwe"
  });
});


// =================== 4. MUSIC - UPLOAD/DOWNLOAD ===================
app.post('/music/upload', async (req, res) => {
  try {
    const { title, artist, album, musicBase64 } = req.body;
    const fileName = `music/${Date.now()}_${title}.mp3`;
    const file = bucket.file(fileName);
    await file.save(Buffer.from(musicBase64, 'base64'), { contentType: 'audio/mp3' });
    const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
    
    const doc = await db.collection('music').add({ title, artist, album, musicUrl: url, downloads: 0, createdAt: new Date() });
    res.json({ success: true, id: doc.id, musicUrl: url });
  } catch(e) { res.status(500).json({ error: e.message }) }
});

app.get('/music', async (req, res) => {
  const snapshot = await db.collection('music').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});

app.get('/music/download/:id', async (req, res) => {
  const docRef = db.collection('music').doc(req.params.id);
  const doc = await docRef.get();
  await docRef.update({ downloads: admin.firestore.FieldValue.increment(1) });
  res.json({ downloadUrl: doc.data().musicUrl, title: doc.data().title });
});


// =================== 5. PAYMENTS ===================
app.post('/payment/initiate', async (req, res) => {
  const { amount, phone, method, purpose } = req.body; // method: 'ecocash' or 'mukuru'
  const doc = await db.collection('payments').add({ amount, phone, method, purpose, status: 'pending', createdAt: new Date() });
  res.json({ success: true, id: doc.id, message: `${method} payment of $${amount} initiated for ${purpose}` });
});


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`ZimConnect v2.0 running on ${PORT}`));
