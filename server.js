const express = require("express");
const admin = require("firebase-admin");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// 1. INIT FIREBASE
let serviceAccount;
try {
  // For Render: reads from Secret File
  serviceAccount = JSON.parse(fs.readFileSync('/etc/secrets/serviceAccountKey.json', 'utf8'));
} catch (e) {
  // For Local: reads from file
  serviceAccount = require("./serviceAccountKey.json");
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://zimconnect-2024-default-rtdb.firebaseio.com"
});
const db = admin.database();

// 2. INIT IMAGEKIT
const ImageKit = require("imagekit");
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// 3. HEALTH CHECK
app.get("/", (req, res) => {
  res.json({ status: "ZimConnect v3.5 ACTIVE", storage: "ImageKit.io" });
});


// 4. FLIGHTS API - LIVE DATA
app.get("/flights", async (req, res) => {
  const { from, to, date } = req.query;
  if (!from || !to || !date) {
    return res.status(400).json({ error: "Missing from, to, or date" });
  }

  try {
    // THIS IS MOCK DATA. Replace with real Amadeus/Skyscanner API later
    const mockFlights = [
      {
        airline: "Air Zimbabwe",
        flightNumber: "UM101",
        from: from,
        to: to,
        departure: `${date}T08:30:00`,
        arrival: `${date}T09:45:00`,
        duration: "1h 15m",
        price: 180,
        currency: "USD"
      },
      {
        airline: "Fastjet",
        flightNumber: "FN707",
        from: from,
        to: to,
        departure: `${date}T14:20:00`,
        arrival: `${date}T15:35:00`,
        duration: "1h 15m",
        price: 150,
        currency: "USD"
      },
      {
        airline: "Ethiopian",
        flightNumber: "ET824",
        from: from,
        to: to,
        departure: `${date}T22:10:00`,
        arrival: `${date}T23:25:00`,
        duration: "1h 15m",
        price: 210,
        currency: "USD"
      }
    ];
    res.json({ flights: mockFlights });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch flights" });
  }
});


// 5. PRODUCTS API - FOR MARKETPLACE
app.get("/products", async (req, res) => {
  try {
    const snapshot = await db.ref("products").once("value");
    const products = snapshot.val();
    res.json(products || {});
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.post("/products", async (req, res) => {
  try {
    const newProductRef = db.ref("products").push();
    await newProductRef.set(req.body);
    res.status(201).json({ id: newProductRef.key, ...req.body });
  } catch (error) {
    res.status(500).json({ error: "Failed to add product" });
  }
});


// 6. UPLOAD API - TO IMAGEKIT
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const result = await imagekit.upload({
      file: req.file.buffer,
      fileName: req.file.originalname,
      folder: "/zimconnect"
    });
    res.json({ url: result.url, fileId: result.fileId });
  } catch (error) {
    res.status(500).json({ error: "Upload failed" });
  }
});


// 7. START SERVER
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`ZimConnect Backend running on port ${PORT}`);
});
