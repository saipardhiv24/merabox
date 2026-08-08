# MeraBox 📦

A simple, modern Pastebin-style app. Paste text or code, get a short shareable
link, set an optional expiry — that's it. No accounts, no API keys, no paid
services.

**Stack:** Node.js + Express (backend) · MongoDB (database) · HTML/CSS/vanilla
JavaScript (frontend, no build step).

---

## 1. Project structure

```
merabox/
├── client/                  # Frontend (served as static files by Express)
│   ├── index.html           # The single HTML page (create + view screens)
│   ├── style.css            # All styling, light/dark theme
│   └── script.js            # Routing, API calls, UI behaviour
├── server/
│   ├── models/
│   │   └── Paste.js         # Mongoose schema for a paste (+ auto-expiry index)
│   ├── controllers/
│   │   └── pasteController.js  # Create / read / delete logic
│   ├── routes/
│   │   └── pasteRoutes.js   # Maps URLs to controller functions
│   └── server.js            # Express app setup & entry point
├── .env.example              # Template for your local environment variables
├── .gitignore
├── package.json
└── README.md
```

### What each file does

- **`server/server.js`** — The entry point. Loads environment variables,
  connects to MongoDB, sets up Express middleware, serves the `client/`
  folder as static files, and mounts the API routes under `/api/pastes`.
- **`server/models/Paste.js`** — Defines what a "paste" looks like in the
  database (id, title, content, language, createdAt, expiresAt) and creates
  a **TTL index** so MongoDB automatically deletes expired pastes in the
  background — you don't need a cron job.
- **`server/controllers/pasteController.js`** — The actual logic for
  creating, fetching, and deleting a paste, plus input validation and error
  handling.
- **`server/routes/pasteRoutes.js`** — Wires up the three REST endpoints to
  the controller functions.
- **`client/index.html`** — One HTML file with two main screens: the
  "create paste" editor and the "view paste" screen. Which one shows is
  decided by `script.js` based on the URL.
- **`client/script.js`** — A tiny hand-written router: if the URL is `/p/<id>`
  it fetches and displays that paste; otherwise it shows the create form. It
  also handles the Copy button, Delete button, dark mode toggle, and toast
  notifications. No frameworks, no build tools.
- **`client/style.css`** — All the visual design: color themes (dark/light),
  typography, layout, and responsive rules for mobile.

---

## 2. REST API

| Method | Endpoint            | Description                          |
|--------|----------------------|---------------------------------------|
| POST   | `/api/pastes`        | Create a new paste                    |
| GET    | `/api/pastes/:id`    | Fetch a paste by its id               |
| DELETE | `/api/pastes/:id`    | Delete a paste by its id              |

**POST `/api/pastes`** body (JSON):
```json
{
  "title": "My snippet",
  "content": "console.log('hello')",
  "language": "javascript",
  "expiry": "1d"
}
```
`title` and `language` are optional. `expiry` is one of `never`, `10m`, `1h`,
`1d`, `1w` (defaults to `never`).

---

## 3. Running it locally, step by step

### Step 1 — Install Node.js

You need Node.js 18 or newer. Check with:
```bash
node -v
```
If you don't have it, download it from [nodejs.org](https://nodejs.org).

### Step 2 — Get MongoDB running

You have two easy, free options — pick one.

**Option A: Install MongoDB locally**
1. Download MongoDB Community Server for your OS:
   https://www.mongodb.com/try/download/community
2. Follow the installer instructions for your platform (on Mac you can also
   `brew install mongodb-community`; on Windows/Linux use the official
   installer/package).
3. Start the MongoDB service. On most systems this is either automatic after
   install, or you run:
   ```bash
   mongod
   ```
4. By default it runs at `mongodb://127.0.0.1:27017` — that's already what's
   in `.env.example`, so no changes needed.

**Option B: Use a free MongoDB Atlas cloud database (no local install)**
1. Create a free account at https://www.mongodb.com/cloud/atlas/register
2. Create a free "M0" cluster.
3. Under **Database Access**, create a database user with a username and
   password.
4. Under **Network Access**, add your current IP address (or `0.0.0.0/0` for
   "allow from anywhere" while testing).
5. Click **Connect → Drivers**, copy the connection string — it looks like
   `mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/`
6. You'll paste this into your `.env` file in Step 4 (add `merabox` as the
   database name at the end, e.g. `.../merabox?retryWrites=true&w=majority`).

### Step 3 — Install project dependencies

From the `merabox/` folder:
```bash
npm install
```

### Step 4 — Create your `.env` file

Copy the example file:
```bash
cp .env.example .env
```
Then open `.env` and, if you used MongoDB Atlas, replace `MONGODB_URI` with
the connection string from Step 2. If you installed MongoDB locally, you can
leave it as-is.

```
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/merabox
```

**Never commit your real `.env` file** — it's already excluded via
`.gitignore`.

### Step 5 — Start the server

```bash
npm start
```
You should see:
```
✅ Connected to MongoDB
🚀 MeraBox is running at http://localhost:5000
```

If you see a MongoDB connection error instead, double check that `mongod` is
running (Option A) or that your Atlas connection string/IP allowlist are
correct (Option B).

### Step 6 — Open the app

Visit **http://localhost:5000** in your browser. Paste some text, hit
**Create Paste**, and you'll be redirected to a shareable URL like
`http://localhost:5000/p/aB3xQ9k`.

For development with auto-restart on file changes, use:
```bash
npm run dev
```
(this uses `nodemon`, already listed in `devDependencies`).

---

## 4. How expiry works

- When you pick an expiry option, the server stores an `expiresAt` timestamp.
- MongoDB has a **TTL index** on that field, so it automatically deletes the
  document once it's in the past (this background sweep runs roughly once a
  minute).
- As a safety net, the API also checks `expiresAt` at read time — so even in
  the rare case a paste is fetched a few seconds after expiring but before
  MongoDB's cleanup runs, it's treated as gone (and deleted immediately) and
  the user gets a 404.
- Pastes with "Never" expiry simply have `expiresAt: null` and are excluded
  from TTL deletion entirely.

## 5. Notes on scope

This is intentionally a minimal, beginner-friendly base:
- No authentication/accounts — anyone with a link can view or delete a paste.
- No rate limiting or spam protection.
- No pagination/listing of all pastes (pastes are only accessible by direct
  link, like the original Pastebin).

These would all be reasonable next steps, but weren't part of the initial
brief, so the app is kept simple and focused on the core create → share →
view flow.
