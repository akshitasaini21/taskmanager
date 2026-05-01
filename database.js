const Datastore = require('@seald-io/nedb');
const path = require('path');
const fs = require('fs');

const DB_DIR = process.env.DB_PATH || path.join(__dirname, 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = {
  users: new Datastore({ filename: path.join(DB_DIR, 'users.db'), autoload: true }),
  projects: new Datastore({ filename: path.join(DB_DIR, 'projects.db'), autoload: true }),
  members: new Datastore({ filename: path.join(DB_DIR, 'members.db'), autoload: true }),
  tasks: new Datastore({ filename: path.join(DB_DIR, 'tasks.db'), autoload: true }),
};

db.users.ensureIndexAsync({ fieldName: 'email', unique: true });
db.members.ensureIndexAsync({ fieldName: 'projectId' });
db.tasks.ensureIndexAsync({ fieldName: 'projectId' });

module.exports = db;
