require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

// MongoDB setup
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;
async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db(); // uses db name from URI
    console.log("✅ Connected to MongoDB Atlas");
  }
  return db;
}

// Test route
app.get("/", async (req, res) => {
  await connectDB();
  res.send("Artify API OK");
});

// Fetch all artworks
app.get("/artworks", async (req, res) => {
  const db = await connectDB();
  const artworks = await db.collection("artworks").find().toArray();
  res.json(artworks);
});

// Insert new artwork
app.post("/artworks", async (req, res) => {
  const db = await connectDB();
  const artwork = req.body;

  if (!artwork.title || !artwork.imageUrl || !artwork.category) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  artwork.createdAt = new Date();
  artwork.likes = 0;

  const result = await db.collection("artworks").insertOne(artwork);
  res.status(201).json({ id: result.insertedId });
});

// Update artwork
app.put("/artworks/:id", async (req, res) => {
  const db = await connectDB();
  const { id } = req.params;
  const update = req.body;

  const result = await db.collection("artworks").updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ message: "Artwork not found" });
  }

  res.json({ ok: true });
});

// Delete artwork
app.delete("/artworks/:id", async (req, res) => {
  const db = await connectDB();
  const { id } = req.params;

  const result = await db.collection("artworks").deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Artwork not found" });
  }

  res.json({ ok: true });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
