require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const ImageKit = require("imagekit");
const QRCode = require("qrcode");
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({limit: '200mb'}));

// FIREBASE
try{
  const serviceAccount = JSON.parse(fs.readFileSync('/etc/secrets/serviceAccountKey.json','utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log("Firebase DB Connected ✅");
} catch(e) { console.log("Firebase Error:", e.message); }

const db = admin.firestore();

// IMAGEKIT
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});
console.log("ImageKit Connected ✅");

// HEALTH CHECK
app.get('/', (req,res)=>{ res.json({ status: "ZimConnect v3.5 ACTIVE", storage: "ImageKit.io" }) });

// UPLOAD HELPER
async function uploadToImageKit(base64, fileName, folder){
  if(!base64) return "";
  const result = await imagekit.upload({ file: base64, fileName, folder, useUniqueFileName: true });
  return result.url;
}

// ========== EXISTING ROUTES ==========
app.post('/tv/upload', async(req,res)=>{ const {title, description, videoBase64, isPremium} = req.body; const videoUrl = await uploadToImageKit(videoBase64, `${Date.now()}_${title}.mp4`, "/tv"); const doc = await db.collection('tv').add({title, description, videoUrl, isPremium: isPremium || false, views: 0, createdAt: new Date()}); res.json({success: true, id: doc.id}) });
app.get('/tv', async(req,res)=>{ const snapshot = await db.collection('tv').orderBy('createdAt','desc').get(); res.json(snapshot.docs.map(d=>({id:d.id, ...d.data()}))) });

app.post('/podcast/upload', async(req,res)=>{ const {title, host, description, audioBase64} = req.body; const audioUrl = await uploadToImageKit(audioBase64, `${Date.now()}_${title}.mp3`, "/podcast"); const doc = await db.collection('podcast').add({title, host: host || "DJ Tewe", description, audioUrl, plays: 0, createdAt: new Date()}); res.json({success: true, id: doc.id}) });
app.get('/podcast', async(req,res)=>{ const snapshot = await db.collection('podcast').orderBy('createdAt','desc').get(); res.json(snapshot.docs.map(d=>({id:d.id, ...d.data()}))) });

app.get('/radio', async(req,res)=>{ res.json([{name: "ZimConnect Radio 263", dj: "DJ Tewe", streamUrl: "https://stream.zeno.fm/0r0a792kwz8uv", isLive: true}]) });

app.post('/music/upload', async(req,res)=>{ const {title, artist, musicBase64} = req.body; const musicUrl = await uploadToImageKit(musicBase64, `${Date.now()}_${title}.mp3`, "/music"); const doc = await db.collection('music').add({title, artist, musicUrl, downloads: 0, createdAt: new Date()}); res.json({success: true, id: doc.id}) });
app.get('/music', async(req,res)=>{ const snapshot = await db.collection('music').orderBy('createdAt','desc').get(); res.json(snapshot.docs.map(d=>({id:d.id, ...d.data()}))) });

app.post('/books/upload', async(req,res)=>{ const {title, author, price, bookBase64, authorId} = req.body; const bookUrl = await uploadToImageKit(bookBase64, `${Date.now()}_${title}.pdf`, "/books"); const doc = await db.collection('books').add({title, author, price, bookUrl, authorId, earnings: 0, status: "active", createdAt: new Date()}); res.json({success: true, id: doc.id}) });
app.get('/books', async(req,res)=>{ const snapshot = await db.collection('books').orderBy('createdAt','desc').get(); res.json(snapshot.docs.map(d=>({id:d.id, ...d.data()}))) });

// ========== RE-ACTIVATED ROUTES ==========
// FLIGHTS
app.get('/flights', async(req,res)=>{
  const {from, to, date} = req.query;
  const flights = [
    {id: "1", airline:"Air Zimbabwe", from:"HRE", to:"VFA", date, time:"08:00", price:120},
    {id: "2", airline:"Fastjet", from:"HRE", to:"JNB", date, time:"10:30", price:250},
    {id: "3", airline:"SAA", from:"HRE", to:"CPT", date, time:"14:00", price:300}
  ].filter(f => f.from.toLowerCase().includes(from.toLowerCase()) && f.toLowerCase().includes(to.toLowerCase()));
  res.json(flights);
});
app.post('/flights/book', async(req,res)=>{
  const {flightId, name, phone} = req.body;
  const doc = await db.collection('bookings').add({type: "flight", flightId, name, phone, status: "pending_payment", createdAt: new Date()});
  res.json({success: true, bookingId: doc.id})
});

// PRODUCTS
app.get('/products', async(req,res)=>{ const snapshot = await db.collection('products').orderBy('createdAt','desc').get(); res.json(snapshot.docs.map(d=>({id:d.id, ...d.data()}))) });
app.post('/products', async(req,res)=>{ const {name, price, imageBase64, category, sellerId} = req.body; const imageUrl = await uploadToImageKit(imageBase64, `${Date.now()}_${name}.jpg`, "/products"); const doc = await db.collection('products').add({name, price, imageUrl, category, sellerId, status: "active", createdAt: new Date()}); res.json({success: true, id: doc.id}) });

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`ZimConnect API Running on ${PORT} ✅`));
