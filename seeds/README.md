Seed script for KCP Organics backend

What this does:
- Connects to MongoDB using `MONGODB_URI` or `MONGO_URI` from `backend/.env` (or falls back to local `mongodb://127.0.0.1:27017/kcp_organics`).
- Inserts a couple of sample `Product` documents and an `Admin` user.

How to use:
1. Create a MongoDB instance:
   - Option A (recommended): Create a free cluster on MongoDB Atlas and whitelist your IP. Create a database user and copy the connection string.
   - Option B: Run a local MongoDB server (community edition) on your machine.

2. Update connection string:
   - Open `backend/.env` and set `MONGODB_URI` to your Atlas connection string (replace password and DB name), or set `MONGO_URI`.

3. Run the server (optional) and then run the seed script:

```bash
cd backend
node seeds/seed.js
```

Notes:
- If you have a backup (mongodump / mongorestore or Atlas snapshot), restore from that backup instead — contact me and I can help with the exact `mongorestore` command.
- The seed script includes a small set of example products only. Expand `products` array in `seed.js` to add more entries.
