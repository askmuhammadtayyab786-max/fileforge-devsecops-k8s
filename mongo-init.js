// MongoDB initialization script — runs once on first container start.
//
// Fix: "MongoDB has no authentication configured" (Tampering).
// Creates an app-scoped user with readWrite ONLY on the fileforge DB,
// instead of the backend connecting as the unrestricted root account.
// MONGO_APP_USERNAME / MONGO_APP_PASSWORD are injected via a Kubernetes
// Secret (or the .env used by docker-compose) — never hardcode them here.

const appUser = process.env.MONGO_APP_USERNAME || 'fileforge_app';
const appPassword = process.env.MONGO_APP_PASSWORD;

if (!appPassword) {
  throw new Error('MONGO_APP_PASSWORD must be set before initializing MongoDB.');
}

db = db.getSiblingDB('fileforge');

db.createCollection('files');
db.files.createIndex({ fileId: 1 }, { unique: true });
db.files.createIndex({ owner: 1 });
db.files.createIndex({ category: 1, status: 1 });
db.files.createIndex({ createdAt: -1 });
db.files.createIndex({ originalName: 'text' });
db.files.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

db.createUser({
  user: appUser,
  pwd: appPassword,
  roles: [{ role: 'readWrite', db: 'fileforge' }],
});

print('✅ FileForge MongoDB initialized with app-scoped user:', appUser);
