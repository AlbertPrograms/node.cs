import express from 'express';
import bcrypt from 'bcrypt';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const compilerAddress = process.env.compilerAddress;

if (!compilerAddress) {
  throw new Error('Compiler address must be set in ".env"!');
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.listen(port, () => console.log(`Listening on port ${port}`));

const init = async (): Promise<void> => {
  if (initialized) {
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

type TaskToken = {
  id: Task['id'];
  token: string;
};

type TaskCategory = '' | '';

type Task = {
  id: number;
  description: string;
  testData?: [string | number];
  expectedResult: string | string[];
  pointValue: number;
};

const taskTokens: TaskToken[] = [];

const getTaskToken = () => bcrypt.hashSync(new Date().getTime().toString(), 5);

// TODO type, separate file (maybe from input json?)
const tasks: Task[] = [
  {
    id: 1,
    description: 'Say "Hello world!"',
    expectedResult: 'Hello world',
    pointValue: 1,
  },
];

app.use(async (_, __, next) => {
  await initPromise;
  next();
});

app.get('/get-task', (_, res) => {
  const token = getTaskToken();
  taskTokens.push({
    id: tasks[0].id,
    token,
  });

  res.send({
    task: tasks[0].description,
    token,
  });
});

app.post('/submit-task');

app.post('/compile', async (req, res) => {
  const code = req.body.code;
  const response = await fetch(`http://${compilerAddress}/compile-and-run`, {
    method: 'POST',
    body: JSON.stringify({
      code,
    }),
  });
  console.log(response);

  if (!response.status.toString().startsWith('2')) {
    res.status(response.status).send(response);
  } else {
    res.status(200);
  }
});
