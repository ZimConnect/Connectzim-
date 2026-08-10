require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json({ limit: '200mb' })); // 200mb for videos

// FIREBASE INIT
try {
  const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "zimconnect-xxx.appspot.com" // <-- CHANGE THIS TO YOUR BUCKET
  });
  console.log("Firebase Connected ✅");
} catch(e) {
  console.log("Firebase Error:", e.message);
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// HEALTH CHECK
app.get('/', (req, res) => {
  res.json({
    status: "ZimConnect Backend Running",
    version: "3.1",
    avatar: "Zimbabwe Bird - 'My Yut'",
    poweredBy: "DJ Tewe Da Street Fada + Talking Assistant",
    features: ["TV", "Radio", "Podcast", "Music", "Video Club", "Book Store", "Marketplace", "Jobs", "Accommodation", "Resorts", "Car Sales", "Misc", "Assistant"]
  });
});

// =================== 1. TV + VIDEO CLUB ===================
app.post('/tv/upload', async (req, res) => {
  try {
    const { title, description, videoBase64, isPremium } = req.body;
    const fileName = `tv/${Date.now()}_${title}.mp4`;
    const file = bucket.file(fileName);
    await file.save(Buffer.from(videoBase64, 'base64'), { contentType: 'video/mp4' });
    const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
    const doc = await db.collection('tv').add({ title, description, videoUrl: url, isPremium: isPremium || false, views: 0, downloads: 0, createdAt: new Date() });
    res.json({ success: true, id: doc.id, videoUrl: url });
  } catch(e) { res.status(500).json({ error: e.message }) }
});

app.get('/tv', async (req, res) => {
  const snapshot = await db.collection('tv').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});

// Video Club Download - unsharable, to internal storage
app.post('/video/download/:id', async (req, res) => {
  const { paymentId } = req.body;
  const videoRef = db.collection('tv').doc(req.params.id);
  const videoDoc = await videoRef.get();
  if(videoDoc.data().isPremium &&!paymentId) return res.status(403).json({ error: "Purchase required" });
  await videoRef.update({ downloads: admin.firestore.FieldValue.increment(1) });
  res.json({ downloadUrl: videoDoc.data().videoUrl, message: "Download to internal storage only. No sharing." });
});

// =================== 2. PODCAST - STREET GEAR ===================
app.post('/podcast/upload', async (req, res) => {
  const { title, host, description, audioBase64 } = req.body;
  const fileName = `podcast/${Date.now()}_${title}.mp3`;
  const file = bucket.file(fileName);
  await file.save(Buffer.from(audioBase64, 'base64'), { contentType: 'audio/mp3' });
  const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
  const doc = await db.collection('podcast').add({ title, host: host || "DJ Tewe", description, audioUrl: url, plays: 0, createdAt: new Date() });
  res.json({ success: true, id: doc.id });
});

app.get('/podcast', async (req, res) => {
  const snapshot = await db.collection('podcast').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});

// =================== 3. RADIO - GROOVE FM + ZIMCONNECT TV ===================
app.get('/radio', async (req, res) => {
  res.json([
    { name: "ZimConnect Radio 263", dj: "DJ Tewe Da Street Fada", streamUrl: "https://stream.zeno.fm/0r0a792kwz8uv", isLive: true },
    { name: "Groove FM", streamUrl: "https://stream.groovefm.co.zw", isLive: true }
  ]);
});

// =================== 4. MUSIC DOWNLOAD ===================
app.post('/music/upload', async (req, res) => {
  const { title, artist, musicBase64 } = req.body;
  const fileName = `music/${Date.now()}_${title}.mp3`;
  const file = bucket.file(fileName);
  await file.save(Buffer.from(musicBase64, 'base64'), { contentType: 'audio/mp3' });
  const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
  const doc = await db.collection('music').add({ title, artist, musicUrl: url, downloads: 0, createdAt: new Date() });
  res.json({ success: true, id: doc.id });
});

app.get('/music', async (req, res) => {
  const snapshot = await db.collection('music').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});

// =================== 5. BOOK STORE ===================
app.post('/books/upload', async (req, res) => {
  const { title, author, price, bookBase64, authorId } = req.body;
  const fileName = `books/${Date.now()}_${title}.pdf`;
  const file = bucket.file(fileName);
  await file.save(Buffer.from(bookBase64, 'base64'), { contentType: 'application/pdf' });
  const [url] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
  const doc = await db.collection('books').add({ title, author, price: Number(price), bookUrl: url, authorId, downloads: 0, earnings: 0, status: 'approved', createdAt: new Date() });
  res.json({ success: true, id: doc.id });
});

app.get('/books', async (req, res) => {
  const snapshot = await db.collection('books').where('status', '==', 'approved').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});

app.post('/books/buy/:id', async (req, res) => {
  const { studentPhone, method } = req.body;
  const bookRef = db.collection('books').doc(req.params.id);
  const bookDoc = await bookRef.get();
  const book = bookDoc.data();
  if(book.price === 0) {
    await bookRef.update({ downloads: admin.firestore.FieldValue.increment(1) });
    return res.json({ success: true, downloadUrl: book.bookUrl, message: "Free book downloaded" });
  }
  const payment = await db.collection('payments').add({ amount: book.price, phone: studentPhone, method, purpose: `Book: ${book.title}`, bookId: req.params.id, authorId: book.authorId, status: 'pending', createdAt: new Date() });
  res.json({ success: true, paymentId: payment.id, message: `Pay $${book.price} to download` });
});

// =================== 6. MARKETPLACE - LOCAL + AMAZON/ALIBABA ===================
app.post('/marketplace/post', async (req, res) => {
  const { title, price, description, category, imageBase64, location, sellerId, externalLink } = req.body;
  let imageUrl = "";
  if(imageBase64) {
    const fileName = `market/${Date.now()}.jpg`;
    const file = bucket.file(fileName);
    await file.save(Buffer.from(imageBase64, 'base64'), { contentType: 'image/jpeg' });
    [imageUrl] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
  }
  const doc = await db.collection('marketplace').add({ title, price, description, category, imageUrl, location, sellerId, externalLink: externalLink || "", createdAt: new Date() });
  res.json({ success: true, id: doc.id });
});

app.get('/marketplace', async (req, res) => {
  const snapshot = await db.collection('marketplace').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});

// =================== 7. JOBS - SERVICE OFFERED / NEEDED ===================
app.post('/jobs/post', async (req, res) => {
  const { type, title, description, contact, location } = req.body;
  const doc = await db.collection('jobs').add({ type, title, description, contact, location, createdAt: new Date() });
  res.json({ success: true, id: doc.id });
});

app.get('/jobs', async (req, res) => {
  const snapshot = await db.collection('jobs').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});

// =================== 8. ACCOMMODATION - RENT/BUY/SALE ===================
app.post('/accommodation/post', async (req, res) => {
  const { type, title, price, location, description, imageBase64 } = req.body;
  let imageUrl = "";
  if(imageBase64) {
    const fileName = `accommodation/${Date.now()}.jpg`;
    const file = bucket.file(fileName);
    await file.save(Buffer.from(imageBase64, 'base64'), { contentType: 'image/jpeg' });
    [imageUrl] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
  }
  const doc = await db.collection('accommodation').add({ type, title, price, location, description, imageUrl, createdAt: new Date() });
  res.json({ success: true, id: doc.id });
});

app.get('/accommodation', async (req, res) => {
  const snapshot = await db.collection('accommodation').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});

// =================== 9. TOURIST RESORTS ===================
app.post('/resorts/post', async (req, res) => {
  const { name, location, pricePerNight, amenities, description, imageBase64 } = req.body;
  let imageUrl = "";
  if(imageBase64) {
    const fileName = `resorts/${Date.now()}.jpg`;
    const file = bucket.file(fileName);
    await file.save(Buffer.from(imageBase64, 'base64'), { contentType: 'image/jpeg' });
    [imageUrl] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
  }
  const doc = await db.collection('resorts').add({ name, location, pricePerNight, amenities, description, imageUrl, createdAt: new Date() });
  res.json({ success: true, id: doc.id });
});

app.get('/resorts', async (req, res) => {
  const snapshot = await db.collection('resorts').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});

// =================== 10. CAR SALES ===================
app.post('/cars/post', async (req, res) => {
  const { make, model, year, price, location, description, imageBase64 } = req.body;
  let imageUrl = "";
  if(imageBase64) {
    const fileName = `cars/${Date.now()}.jpg`;
    const file = bucket.file(fileName);
    await file.save(Buffer.from(imageBase64, 'base64'), { contentType: 'image/jpeg' });
    [imageUrl] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
  }
  const doc = await db.collection('cars').add({ make, model, year, price, location, description, imageUrl, createdAt: new Date() });
  res.json({ success: true, id: doc.id });
});

app.get('/cars', async (req, res) => {
  const snapshot = await db.collection('cars').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});

// =================== 11. MISCELLANEOUS ===================
app.post('/misc/post', async (req, res) => {
  const { title, price, description, category } = req.body;
  const doc = await db.collection('misc').add({ title, price, description, category, createdAt: new Date() });
  res.json({ success: true, id: doc.id });
});

app.get('/misc', async (req, res) => {
  const snapshot = await db.collection('misc').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});

// =================== 12. STREET BULLETIN ===================
app.post('/bulletin/post', async (req, res) => {
  const { title, description, imageBase64, location } = req.body;
  let imageUrl = "";
  if(imageBase64) {
    const fileName = `bulletin/${Date.now()}.jpg`;
    const file = bucket.file(fileName);
    await file.save(Buffer.from(imageBase64, 'base64'), { contentType: 'image/jpeg' });
    [imageUrl] = await file.getSignedUrl({ action: 'read', expires: '03-09-2491' });
  }
  const doc = await db.collection('bulletin').add({ title, description, imageUrl, location, postedBy: "DJ Tewe Da Street Fada", likes: 0, createdAt: new Date() });
  res.json({ success: true, id: doc.id });
});

app.get('/bulletin', async (req, res) => {
  const snapshot = await db.collection('bulletin').orderBy('createdAt', 'desc').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});

// =================== 13. NEWSLETTER ===================
app.post('/newsletter/subscribe', async (req, res) => {
  const { email, name } = req.body;
  const doc = await db.collection('newsletter').add({ email, name: name || "", subscribedAt: new Date() });
  res.json({ success: true, message: "Subscribed successfully", id: doc.id });
});

app.get('/newsletter', async (req, res) => {
  const snapshot = await db.collection('newsletter').orderBy('subscribedAt', 'desc').get();
  res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() })));
});

// =================== 14. AI ASSISTANT - ZIMBABWE BIRD "MY YUT" ===================
app.post('/assistant/ask', async (req, res) => {
  const { question, user } = req.body;
  const replies = [
    `My Yut says: ${question}. DJ Tewe got you!`,
    `Zimbabwe Bird here: Check Marketplace for ${question}`,
    `Street Fada + My Yut: "${question}". Radio 263 is live now!`
  ];
  const reply = replies[Math.floor(Math.random() * replies.length)];
  await db.collection('assistant_chats').add({ question, reply, user: user || "Guest", avatar: "Zimbabwe Bird", createdAt: new Date() });
  res.json({ success: true, reply, avatar: "Zimbabwe Bird - My Yut", dj: "DJ Tewe Da Street Fada" });
});

// =================== 15. OFFLINE NAVIGATION ===================
app.get('/navigation/offline', async (req, res) => {
  res.json({ message: "Download map pack for Harare, Bulawayo. Powered by My Yut", downloadUrl: "https://maps.zimconnect.com/harare.zip" });
});

// =================== 16. PAYMENTS ===================
app.post('/payment/initiate', async (req, res) => {
  const { amount, phone, method, purpose } = req.body;
  const doc = await db.collection('payments').add({ amount, phone, method, purpose, status: 'pending', createdAt: new Date() });
  res.json({ success: true, id: doc.id });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`ZimConnect v3.1 running on ${PORT} - My Yut + DJ Tewe Online`));
