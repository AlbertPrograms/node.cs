import path from 'path';
import fs from 'fs';
import knex from 'knex';

const dbArraySeparatorString = '__,__';

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
    console.log(dbPath);
    console.error(err);
  });
});

// Create connection to SQLite database
const db = knex({
  client: 'sqlite3',
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
});

export { db, dbArraySeparatorString };
