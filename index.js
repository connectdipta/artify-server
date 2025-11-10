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
  res.send("Artify Server API OK!");
});

// ------------------- ARTWORK ROUTES -------------------

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
    return res.status(400).json({ message: "Title, image URL, and category are required." });
  }

  artwork.createdAt = new Date();
  artwork.likes = 0;
  artwork.visibility = artwork.visibility || "Public"; // default

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

// Like an artwork
app.patch("/artworks/:id/like", async (req, res) => {
  const db = await connectDB();
  const { id } = req.params;

  const result = await db.collection("artworks").updateOne(
    { _id: new ObjectId(id) },
    { $inc: { likes: 1 } }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({ message: "Artwork not found" });
  }

  res.json({ message: "Liked!" });
});

// Search/filter artworks
app.get("/artworks/search", async (req, res) => {
  const db = await connectDB();
  const { category, userEmail, title, userName } = req.query;

  const query = {};
  if (category) query.category = category;
  if (userEmail) query.userEmail = userEmail;
  if (title) query.title = { $regex: title, $options: "i" };
  if (userName) query.userName = { $regex: userName, $options: "i" };

  const artworks = await db.collection("artworks").find(query).toArray();
  res.json(artworks);
});

// Featured artworks (latest 6 public)
app.get("/artworks/featured", async (req, res) => {
  const db = await connectDB();
  const artworks = await db.collection("artworks")
    .find({ visibility: "Public" })
    .sort({ createdAt: -1 })
    .limit(6)
    .toArray();
  res.json(artworks);
});

// Explore public artworks
app.get("/artworks/explore", async (req, res) => {
  const db = await connectDB();
  const artworks = await db.collection("artworks")
    .find({ visibility: "Public" })
    .toArray();
  res.json(artworks);
});

// ------------------- FAVORITES ROUTES -------------------

// Add to favorites
app.post("/favorites", async (req, res) => {
  const db = await connectDB();
  const { artworkId, userEmail } = req.body;

  if (!artworkId || !userEmail) {
    return res.status(400).json({ message: "Artwork ID and user email are required." });
  }

  const result = await db.collection("favorites").insertOne({
    artworkId: new ObjectId(artworkId),
    userEmail,
    addedAt: new Date()
  });

  res.status(201).json({ id: result.insertedId });
});

// Get favorites for a user
app.get("/favorites", async (req, res) => {
  const db = await connectDB();
  const { userEmail } = req.query;

  const favorites = await db.collection("favorites").aggregate([
    { $match: { userEmail } },
    {
      $lookup: {
        from: "artworks",
        localField: "artworkId",
        foreignField: "_id",
        as: "artwork"
      }
    },
    { $unwind: "$artwork" }
  ]).toArray();

  res.json(favorites);
});

// Remove from favorites
app.delete("/favorites/:id", async (req, res) => {
  const db = await connectDB();
  const { id } = req.params;

  const result = await db.collection("favorites").deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Favorite not found" });
  }

  res.json({ ok: true });
});

// ------------------- SERVER START -------------------
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
