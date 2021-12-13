import path from 'path';
import fs from 'fs';
import knex, { Knex } from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const dbArraySeparatorString = '__,__';

let db: Knex<any, unknown>;

if (process.env.DATABASE_URL) {
  // Postgres
  db = knex({
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
  });
} else if (process.env.db === 'sqlite3') {
  // SQLite
  const dbFolder = path.resolve(__dirname, 'db');
  const dbPath = path.resolve(__dirname, 'db/database.sqlite');

  // Create DB folder if it doesn't already exist
  if (!fs.existsSync(dbFolder)) {
    fs.mkdirSync(dbFolder);
  }

  // Create DB file if it doesn't already exist
  fs.open(dbPath, 'r', err => {
    if (!err) return;

    fs.writeFile(dbPath, '', err => {
      console.error(err);
    });
  });
  
  // Create connection to SQLite database
  db = knex({
    client: 'sqlite3',
    connection: {
      filename: dbPath,
    },
    useNullAsDefault: true,
  });
} else {
  throw new Error('no valid database config found');
}

export { db, dbArraySeparatorString };
