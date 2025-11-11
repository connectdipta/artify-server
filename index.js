require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 3000;

// ------------------- MIDDLEWARE -------------------
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

// ------------------- FIREBASE ADMIN -------------------
let firebaseAppInitialized = false;

try {
  // Local JSON file for development
  const serviceAccount = require("./artify-d5f89-firebase-adminsdk-fbsvc-b2d8b97ab2.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  firebaseAppInitialized = true;
  console.log("✅ Firebase Admin initialized (local JSON)");
} catch (e) {
  // Environment variables for production (e.g., Vercel)
  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
  } = process.env;

  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
    admin.initializeApp({
      credential: admin.credential.cert({
        project_id: FIREBASE_PROJECT_ID,
        client_email: FIREBASE_CLIENT_EMAIL,
        private_key: privateKey,
      }),
    });
    firebaseAppInitialized = true;
    console.log("✅ Firebase Admin initialized (env credentials)");
  } else {
    console.warn("⚠️ Firebase Admin not initialized. Private routes will fail.");
  }
}

// Verify Firebase ID token middleware
const verifyFirebaseToken = async (req, res, next) => {
  if (!firebaseAppInitialized) {
    return res.status(500).json({ message: "Auth not configured on server" });
  }
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Unauthorized" });

  const token = authHeader.split(" ")[1]; // "Bearer <token>"
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded; // uid, email, name (if available)
    next();
  } catch (err) {
    console.error("Token verification failed:", err?.message || err);
    return res.status(403).json({ message: "Forbidden" });
  }
};

// ------------------- MONGODB SETUP -------------------
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
    db = client.db(); // uses db name from URI (artify)
    console.log("✅ Connected to MongoDB Atlas");
  }
  return db;
}

// ------------------- ROUTES -------------------

// Health check
app.get("/", async (req, res, next) => {
  try {
    await connectDB();
    res.send("Artify Server API OK!");
  } catch (err) {
    next(err);
  }
});

// -------- ARTWORKS --------

// Get all artworks (public)
app.get("/artworks", async (req, res, next) => {
  try {
    const db = await connectDB();
    const artworks = await db.collection("artworks").find().toArray();
    res.json(artworks);
  } catch (err) {
    next(err);
  }
});

// Create artwork (private)
app.post("/artworks", verifyFirebaseToken, async (req, res, next) => {
  try {
    const db = await connectDB();
    const artwork = req.body;

    if (!artwork.title || !artwork.imageUrl || !artwork.category) {
      return res.status(400).json({ message: "Title, image URL, and category are required." });
    }

    artwork.userEmail = req.user.email;
    artwork.userName = req.user.name || "Anonymous";
    artwork.createdAt = new Date();
    artwork.likes = 0;
    artwork.visibility = artwork.visibility || "Public";

    const result = await db.collection("artworks").insertOne(artwork);
    res.status(201).json({ id: result.insertedId });
  } catch (err) {
    next(err);
  }
});

// Update artwork (private, owner-only)
app.put("/artworks/:id", verifyFirebaseToken, async (req, res, next) => {
  try {
    const db = await connectDB();
    const { id } = req.params;
    const update = req.body;

    const result = await db.collection("artworks").updateOne(
      { _id: new ObjectId(id), userEmail: req.user.email },
      { $set: update }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Artwork not found or not owned by user" });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Delete artwork (private, owner-only)
app.delete("/artworks/:id", verifyFirebaseToken, async (req, res, next) => {
  try {
    const db = await connectDB();
    const { id } = req.params;

    const result = await db.collection("artworks").deleteOne({
      _id: new ObjectId(id),
      userEmail: req.user.email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Artwork not found or not owned by user" });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
 
// get artwork by user email
 app.get("/artworks/user/:email", async (req, res, next) => {
  try {
    const db = await connectDB();
    const { email } = req.params;
    const artworks = await db.collection("artworks")
      .find({ userEmail: email })
      .toArray();
    res.json(artworks);
  } catch (err) {
    next(err);
  }
});

// Like an artwork (public)
app.patch("/artworks/:id/like", async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

// Search/filter artworks (public)
app.get("/artworks/search", async (req, res, next) => {
  try {
    const db = await connectDB();
    const { category, userEmail, title, userName } = req.query;

    const query = {};
    if (category) query.category = category;
    if (userEmail) query.userEmail = userEmail;
    if (title) query.title = { $regex: title, $options: "i" };
    if (userName) query.userName = { $regex: userName, $options: "i" };

    const artworks = await db.collection("artworks").find(query).toArray();
    res.json(artworks);
  } catch (err) {
    next(err);
  }
});

// Featured artworks: latest 6 public
app.get("/artworks/featured", async (req, res, next) => {
  try {
    const db = await connectDB();
    const artworks = await db.collection("artworks")
      .find({ visibility: "Public" })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();
    res.json(artworks);
  } catch (err) {
    next(err);
  }
});

// Explore public artworks
app.get("/artworks/explore", async (req, res, next) => {
  try {
    const db = await connectDB();
    const artworks = await db.collection("artworks")
      .find({ visibility: "Public" })
      .toArray();
    res.json(artworks);
  } catch (err) {
    next(err);
  }
});

// My Gallery (private): artworks by logged-in user
app.get("/my-gallery", verifyFirebaseToken, async (req, res, next) => {
  try {
    const db = await connectDB();
    const artworks = await db.collection("artworks")
      .find({ userEmail: req.user.email })
      .toArray();
    res.json(artworks);
  } catch (err) {
    next(err);
  }
});

// -------- FAVORITES --------

// Add to favorites (private)
app.post("/favorites", verifyFirebaseToken, async (req, res, next) => {
  try {
    const db = await connectDB();
    const { artworkId } = req.body;

    if (!artworkId) {
      return res.status(400).json({ message: "Artwork ID is required." });
    }

    const result = await db.collection("favorites").insertOne({
      artworkId: new ObjectId(artworkId),
      userEmail: req.user.email,
      addedAt: new Date(),
    });

    res.status(201).json({ id: result.insertedId });
  } catch (err) {
    next(err);
  }
});

// Get favorites for logged-in user (private)
app.get("/favorites", verifyFirebaseToken, async (req, res, next) => {
  try {
    const db = await connectDB();
    const favorites = await db.collection("favorites").aggregate([
      { $match: { userEmail: req.user.email } },
      {
        $lookup: {
          from: "artworks",
          localField: "artworkId",
          foreignField: "_id",
          as: "artwork",
        },
      },
      { $unwind: "$artwork" },
    ]).toArray();

    res.json(favorites);
  } catch (err) {
    next(err);
  }
});

// Remove favorite (private, owner-only)
app.delete("/favorites/:id", verifyFirebaseToken, async (req, res, next) => {
  try {
    const db = await connectDB();
    const { id } = req.params;

    const result = await db.collection("favorites").deleteOne({
      _id: new ObjectId(id),
      userEmail: req.user.email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Favorite not found or not owned by user" });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// -------- OPTIONAL EXTRAS --------

// Top artists of the week (public): by total public artworks
app.get("/top-artists", async (req, res, next) => {
  try {
    const db = await connectDB();
    const artists = await db.collection("artworks").aggregate([
      { $match: { visibility: "Public" } },
      { $group: { _id: "$userName", totalArtworks: { $sum: 1 } } },
      { $sort: { totalArtworks: -1 } },
      { $limit: 5 },
    ]).toArray();
    res.json(artists);
  } catch (err) {
    next(err);
  }
});

// Community highlights (public): most liked public artworks
app.get("/community-highlights", async (req, res, next) => {
  try {
    const db = await connectDB();
    const highlights = await db.collection("artworks")
      .find({ visibility: "Public" })
      .sort({ likes: -1 })
      .limit(6)
      .toArray();
    res.json(highlights);
  } catch (err) {
    next(err);
  }
});

// ------------------- ERROR HANDLER -------------------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

// ------------------- SERVER START -------------------
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
