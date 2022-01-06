import express from 'express';
import dotenv from 'dotenv';
import router from './router/router';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(router);
app.listen(port, () => console.log(`Listening on port ${port}`));

const init = async (): Promise<void> => {
  if (initialized) {
    return;
  }

  if (initPromise) {
    await initPromise;
    return;
  }

  let resolve: () => void;
  initPromise = new Promise((r) => (resolve = r));

  // TODO

  initialized = true;
  resolve();
};

let initPromise: Promise<void>;
let initialized = false;

init();

app.use(async (_, __, next) => {
  await initPromise;
  next();
});
