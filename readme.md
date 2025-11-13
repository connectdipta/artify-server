# Artify (Server-Side)

[cite_start]This repository contains the server-side code for **Artify**[cite: 4], a creative artwork showcase platform. This Node.js & Express server provides a secure RESTful API to manage artworks, user authentication, likes, and favorites.

- **Live Site URL:** `[Your Live Server URL (e.g., from Vercel)]`
- **Client-Side Repository:** `[Link to your Client-Side GitHub Repo]`

## Project Features

This server provides the complete backend for the Artify platform, including:

* [cite_start]**Secure Authentication:** Uses Firebase Admin to verify user-provided JWTs for all private routes[cite: 28, 57, 74, 79], ensuring users can only modify their own data.
* [cite_start]**Artwork CRUD:** Full create, read, update, and delete (CRUD) operations for artwork posts[cite: 57, 76, 78].
* [cite_start]**Engagement System:** Manages artwork "likes" using MongoDB's `$inc` operator [cite: 72] [cite_start]and maintains a persistent "favorites" collection for each user[cite: 73, 79, 80].
* [cite_start]**Advanced Filtering & Search:** A dynamic API endpoint that allows searching for artworks by title, artist name [cite: 68][cite_start], or category[cite: 114].
* [cite_start]**Data Aggregation:** Provides aggregated data for special sections like "Featured Artworks" (sorted by date) [cite: 36, 37] [cite_start]and "Top Artists" [cite: 39] using MongoDB aggregation pipelines.

## Technology Stack

* **Node.js**
* **Express.js**
* **MongoDB Atlas** (with MongoDB Node.js Driver)
* **Firebase Admin SDK** (for JWT verification)
* **CORS**
* **Dotenv**

## Local Setup & Installation

To run this server locally, follow these steps:

1.  **Clone the repository:**
    ```sh
    git clone [your-server-repo-url]
    cd artify-server
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root directory and add the following variables:
    ```.env
    # Your MongoDB connection string
    MONGODB_URI="mongodb+srv://..."

    # Your live client-side URL
    CLIENT_URL="http://localhost:5173"

    # Firebase Admin SDK Configuration
    # You can get these from your Firebase project settings
    FIREBASE_PROJECT_ID="your-project-id"
    FIREBASE_CLIENT_EMAIL="firebase-adminsdk-..."
    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
    ```
4.  **Add Firebase Service Account JSON:**
    Add your `firebase-adminsdk.json` file to the root of the project (e.g., `artify-d5f89-firebase-adminsdk-fbsvc-b2d8b97ab2.json`).

5.  **Run the server:**
    ```sh
    node index.js
    ```
    The server will be running on `http://localhost:3000` (or your specified port).

## API Endpoints

### Artwork Routes

| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/artworks` | Public | Get all artworks. |
| `GET` | `/artworks/featured` | Public | [cite_start]Get 6 most recent public artworks. [cite: 36] |
| `GET` | `/artworks/search` | Public | [cite_start]Search artworks by title, artist, or category. [cite: 68, 114] |
| `GET` | `/artworks/explore` | Public | [cite_start]Get all public artworks. [cite: 65] |
| `GET` | `/artworks/user/:email` | Public | [cite_start]Get all artworks for a specific user. [cite: 75] |
| `GET` | `/artworks/:id` | Public | [cite_start]Get single artwork details. [cite: 69] |
| `POST` | `/artworks` | Private | [cite_start]Add a new artwork. [cite: 57] |
| `PUT` | `/artworks/:id` | Private | [cite_start]Update an artwork (owner only). [cite: 78] |
| `DELETE` | `/artworks/:id` | Private | [cite_start]Delete an artwork (owner only). [cite: 76] |
| `PATCH` | `/artworks/:id/like` | Public | [cite_start]Increment like count for an artwork. [cite: 72] |

### Favorite Routes

| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/favorites` | Private | [cite_start]Get the logged-in user's favorites. [cite: 80] |
| `POST` | `/favorites` | Private | [cite_start]Add an artwork to favorites. [cite: 73] |
| `DELETE` | `/favorites/:id` | Private | [cite_start]Remove an artwork from favorites. [cite: 81] |

### Aggregation Routes

| Method | Endpoint | Protection | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/top-artists` | Public | [cite_start]Get top 5 artists by artwork count. [cite: 39] |
| `GET` | `/community-highlights` | Public | [cite_start]Get 6 most-liked artworks. [cite: 39] |