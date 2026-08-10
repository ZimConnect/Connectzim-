require('dotenv').config();
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const ImageKit = require("imagekit");
const QRCode = require("qrcode");

const app = express();
app.use(cors());
app.use(express.json({ limit: '200mb' }));

// FIREBASE INIT - FOR DATABASE ONLY
try {
  const serviceAccount = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  console.log("Firebase DB Connected ✅");
} catch(e) {
  console.log("Firebase Error:", e.message);
}

const db = admin.firestore();

// IMAGEKIT INIT - FOR ALL FILES
const imagekit = new ImageKit({
    publicKey : process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey : process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint : process.env.IMAGEKIT_URL_ENDPOINT
});
console.log("ImageKit Connected ✅");

app.get('/', (req, res) => {
  res.json({ status: "ZimConnect v3.3 Running", storage: "ImageKit.io", avatar: "Zimbabwe Bird - My Yut", features: ["TV","Radio","Podcast","Music","Video Club","Book Store","Marketplace","Jobs","Accommodation","Resorts","Car Sales","Misc","Bulletin","Assistant"] });
});

// UPLOAD HELPER
async function uploadToImageKit(base64, fileName, folder) {
  if(!base64) return "";
  const result = await imagekit.upload({
    file: base64,
    fileName: fileName,
    folder: folder,
    useUniqueFileName: true
  });
  return result.url;
}

// QR TICKET HELPER - NEW
async function generateTicketQR(eventId) {
  const ticketData = `ZIMCONNECT_TICKET:${eventId}:${Date.now()}`;
  return await QRCode.toDataURL(ticketData);
}

// 1. TV + VIDEO CLUB
app.post('/tv/upload', async (req, res) => { try { const { title, description, videoBase64, isPremium } = req.body; const videoUrl = await uploadToImageKit(videoBase64, `${Date.now()}_${title}.mp4`, "/tv"); const doc = await db.collection('tv').add({ title, description, videoUrl, isPremium: isPremium || false, views: 0, downloads: 0, createdAt: new Date() }); res.json({ success: true, id: doc.id, videoUrl }); } catch(e) { res.status(500).json({ error: e.message }) } });
app.get('/tv', async (req, res) => { const snapshot = await db.collection('tv').orderBy('createdAt', 'desc').get(); res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() }))); });

// 2. PODCAST
app.post('/podcast/upload', async (req, res) => { const { title, host, description, audioBase64 } = req.body; const audioUrl = await uploadToImageKit(audioBase64, `${Date.now()}_${title}.mp3`, "/podcast"); const doc = await db.collection('podcast').add({ title, host: host || "DJ Tewe", description, audioUrl, plays: 0, createdAt: new Date() }); res.json({ success: true, id: doc.id });
app.get('/podcast', async (req, res) => { const snapshot = await db.collection('podcast').orderBy('createdAt', 'desc').get(); res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() }))); });

// 3. RADIO
app.get('/radio', async (req, res) => { res.json([{ name: "ZimConnect Radio 263", dj: "DJ Tewe Da Street Fada", streamUrl: "https://stream.zeno.fm/0r0a792kwz8uv", isLive: true }, { name: "Groove FM", streamUrl: "https://stream.groovefm.co.zw", isLive: true }]); });

// 4. MUSIC
app.post('/music/upload', async (req, res) => { const { title, artist, musicBase64 } = req.body; const musicUrl = await uploadToImageKit(musicBase64, `${Date.now()}_${title}.mp3`, "/music"); const doc = await db.collection('music').add({ title, artist, musicUrl, downloads: 0, createdAt: new Date() }); res.json({ success: true, id: doc.id });
app.get('/music', async (req, res) => { const snapshot = await db.collection('music').orderBy('createdAt', 'desc').get(); res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() }))); });

// 5. BOOK STORE
app.post('/books/upload', async (req, res) => { const { title, author, price, bookBase64, authorId } = req.body; const bookUrl = await uploadToImageKit(bookBase64, `${Date.now()}_${title}.pdf`, "/books"); const doc = await db.collection('books').add({ title, author, price: Number(price), bookUrl, authorId, downloads: 0, earnings: 0, status: 'approved', createdAt: new Date() }); res.json({ success: true, id: doc.id }); });
app.get('/books', async (req, res) => { const snapshot = await db.collection('books').where('status', '==', 'approved').get(); res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() }))); });
app.post('/books/buy/:id', async (req, res) => { const { studentPhone, method } = req.body; const bookRef = db.collection('books').doc(req.params.id); const bookDoc = await bookRef.get(); const book = bookDoc.data(); if(book.price === 0) { await bookRef.update({ downloads: admin.firestore.FieldValue.increment(1) }); return res.json({ success: true, downloadUrl: book.bookUrl }); } const payment = await db.collection('payments').add({ amount: book.price, phone: studentPhone, method, purpose: `Book: ${book.title}`, bookId: req.params.id, authorId: book.authorId, status: 'pending', createdAt: new Date() }); res.json({ success: true, paymentId: payment.id }); });

// 6. MARKETPLACE
app.post('/marketplace/post', async (req, res) => { const { title, price, description, category, imageBase64, location, sellerId, externalLink } = req.body; const imageUrl = await uploadToImageKit(imageBase64, `${Date.now()}.jpg`, "/market"); const doc = await db.collection('marketplace').add({ title, price, description, category, imageUrl, location, sellerId, externalLink: externalLink || "", createdAt: new Date() }); res.json({ success: true, id: doc.id }); });
app.get('/marketplace', async (req, res) => { const snapshot = await db.collection('marketplace').orderBy('createdAt', 'desc').get(); res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() }))); });

// 7. JOBS
app.post('/jobs/post', async (req, res) => { const { type, title, description, contact, location } = req.body; const doc = await db.collection('jobs').add({ type, title, description, contact, location, createdAt: new Date() }); res.json({ success: true, id: doc.id }); });
app.get('/jobs', async (req, res) => { const snapshot = await db.collection('jobs').orderBy('createdAt', 'desc').get(); res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() }))); });

// 8. ACCOMMODATION
app.post('/accommodation/post', async (req, res) => { const { type, title, price, location, description, imageBase64 } = req.body; const imageUrl = await uploadToImageKit(imageBase64, `${Date.now()}.jpg`, "/accommodation"); const doc = await db.collection('accommodation').add({ type, title, price, location, description, imageUrl, createdAt: new Date() }); res.json({ success: true, id: doc.id }); });
app.get('/accommodation', async (req, res) => { const snapshot = await db.collection('accommodation').orderBy('createdAt', 'desc').get(); res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() }))); });

// 9. TOURIST RESORTS
app.post('/resorts/post', async (req, res) => { const { name, location, pricePerNight, amenities, description, imageBase64 } = req.body; const imageUrl = await uploadToImageKit(imageBase64, `${Date.now()}.jpg`, "/resorts"); const doc = await db.collection('resorts').add({ name, location, pricePerNight, amenities, description, imageUrl, createdAt: new Date() }); res.json({ success: true, id: doc.id });
app.get('/resorts', async (req, res) => { const snapshot = await db.collection('resorts').orderBy('createdAt', 'desc').get(); res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() }))); });

// 10. CAR SALES
app.post('/cars/post', async (req, res) => { const { make, model, year, price, location, description, imageBase64 } = req.body; const imageUrl = await uploadToImageKit(imageBase64, `${Date.now()}.jpg`, "/cars"); const doc = await db.collection('cars').add({ make, model, year, price, location, description, imageUrl, createdAt: new Date() }); res.json({ success: true, id: doc.id }); });
app.get('/cars', async (req, res) => { const snapshot = await db.collection('cars').orderBy('createdAt', 'desc').get(); res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() }))); });

// 11. MISCELLANEOUS
app.post('/misc/post', async (req, res) => { const { title, price, description, category } = req.body; const doc = await db.collection('misc').add({ title, price, description, category, createdAt: new Date() }); res.json({ success: true, id: doc.id });
app.get('/misc', async (req, res) => { const snapshot = await db.collection('misc').orderBy('createdAt', 'desc').get(); res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() }))); });

// 12. STREET BULLETIN
app.post('/bulletin/post', async (req, res) => { const { title, description, imageBase64, location } = req.body; const imageUrl = await uploadToImageKit(imageBase64, `${Date.now()}.jpg`, "/bulletin"); const doc = await db.collection('bulletin').add({ title, description, imageUrl, location, postedBy: "DJ Tewe Da Street Fada", likes: 0, createdAt: new Date() }); res.json({ success: true, id: doc.id });
app.get('/bulletin', async (req, res) => { const snapshot = await db.collection('bulletin').orderBy('createdAt', 'desc').get(); res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() }))); });

// 13. NEWSLETTER
app.post('/newsletter/subscribe', async (req, res) => { const { email, name } = req.body; const doc = await db.collection('newsletter').add({ email, name: name || "", subscribedAt: new Date() }); res.json({ success: true, message: "Subscribed successfully", id: doc.id }); });
app.get('/newsletter', async (req, res) => { const snapshot = await db.collection('newsletter').orderBy('subscribedAt', 'desc').get(); res.json(snapshot.docs.map(d => ({ id: d.id,...d.data() }))); });

// 14. AI ASSISTANT - MY YUT
app.post('/assistant/ask', async (req, res) => { const { question, user } = req.body; const replies = [`My Yut says: ${question}. DJ Tewe got you!`, `Zimbabwe Bird here: Check Marketplace for ${question}`, `Street Fada + My Yut: "${question}". Radio 263 is live now!`]; const reply = replies[Math.floor(Math.random() * replies.length)]; await db.collection('assistant_chats').add({ question, reply, user: user || "Guest", avatar: "Zimbabwe Bird", createdAt: new Date() }); res.json({ success: true, reply, avatar: "Zimbabwe Bird - My Yut", dj: "DJ Tewe Da Street Fada" }); });

// 15. OFFLINE NAVIGATION
app.get('/navigation/offline', async (req, res) => { res.json({ message: "Download map pack for Harare, Bulawayo. Powered by My Yut", downloadUrl: "https://maps.zimconnect.com/harare.zip" }); });

// 16. PAYMENTS
app.post('/payment/initiate', async (req, res) => { const { amount, phone, method, purpose } = req.body; const doc = await db.collection('payments').add({ amount, phone, method, purpose, status: 'pending', createdAt: new Date() }); res.json({ success: true, id: doc.id });

// 17. QR TICKETS - NEW FOR EVENTS
app.post('/events/ticket/generate', async (req, res) => { const { eventId, userId } = req.body; const qrImage = await generateTicketQR(eventId); const doc = await db.collection('tickets').add({ eventId, userId, qrImage, status: 'valid', createdAt: new Date() }); res.json({ success: true, ticketId: doc.id, qrImage }); });

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`ZimConnect v3.3 FINAL running on ${PORT} - ImageKit + QR + My Yut Online`));
