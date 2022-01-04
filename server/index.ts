import express from 'express';
import bcrypt from 'bcrypt';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { UserTable } from './schemas/UserTable';
import { User } from './entities/User';
import { TaskTable } from './schemas/TaskTable';

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

const userTable = UserTable.getInstance();
const taskTable = TaskTable.getInstance();

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

interface SessionToken {
  user: User;
  session: string;
  expiryTime: number;
}

interface TaskToken {
  id: Task['id'];
  token: string;
}

type TaskCategory = '' | '';

interface Task {
  id: number;
  description: string;
  testData?: string[];
  expectedOutput: string[];
  pointValue: number;
}

interface ExecutionResult {
  code: number;
  stdout: string;
  stderr: string;
  outputMatchesExpectation?: boolean;
  args?: string;
}

interface SubmitTaskRequest {
  code: string;
  token: string;
}

interface SubmitTaskResponse {
  results: ExecutionResult[];
  success: boolean;
}

interface CodeCompileAndRunRequest {
  code: string;
  expectedOutput: string[];
  testData?: string[];
}

const taskTokens: TaskToken[] = [];

const getTaskToken = () => bcrypt.hashSync(new Date().getTime().toString(), 5);

// TODO type, separate file (maybe from input json?)
const tasks: Task[] = [
  {
    description: 'Írassa ki a standard kimenetre, hogy `Hello world!`',
    expectedOutput: ['Hello world!'],
    pointValue: 1,
  },
  {
    description:
      'Írjon programot, mely az argumentumban megadott sorszámú fibonacci sorozatot írja ki vesszővel és szóközzel elválasztva! Pl. bemenet: `7`, kimenet: `1, 1, 2, 3, 5, 8, 13`',
    testData: ['1', '10', '30'],
    expectedOutput: [
      '1',
      '1, 1, 2, 3, 5, 8, 13, 21, 34, 55',
      '1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229, 832040',
    ],
    pointValue: 3,
  },
].map((task, index) => ({ ...task, id: index }));

app.use(async (_, __, next) => {
  await initPromise;
  next();
});

// TODO random task assignment based on category and practice mode
app.get('/get-task', (_, res) => {
  // TEMP
  const taskId = 1;

  const token = getTaskToken();
  taskTokens.push({
    id: tasks[taskId].id,
    token,
  });

  res.send({
    task: tasks[taskId].description,
    token,
  });
});

const handleResults = (
  results: ExecutionResult[],
  task: Task
): SubmitTaskResponse => {
  const success = results.every(
    (result, index) => result.stdout === task.expectedOutput[index]
  );
  // TODO handle task completion to user
  return { results, success };
};

app.post('/submit-task', async (req, res) => {
  const { code, token }: SubmitTaskRequest = req.body;
  console.log(code);
  const taskToken = taskTokens.find((tt) => tt.token === token);

  if (!taskToken) {
    res.status(400).send('Invalid token');
    return;
  }

  const task = tasks[taskToken.id];
  const codeCompileAndRunRequest: CodeCompileAndRunRequest = {
    code,
    expectedOutput: task.expectedOutput,
    ...(task.testData ? { testData: task.testData } : {}),
  };
  const response = await fetch(`http://${compilerAddress}/compile-and-run`, {
    method: 'POST',
    body: JSON.stringify(codeCompileAndRunRequest),
    headers: { 'Content-Type': 'application/json' },
  });

  const results = (await response.json()) as ExecutionResult[];

  console.log(task);
  const submitResponse: SubmitTaskResponse = handleResults(results, task);
  res.send(submitResponse);

  /* if (!response.status.toString().startsWith('2')) {
    // Provide next task
    res.status(response.status).send(results);
  } else {
    res.status(200).send(results);
  } */
});

const sessions: SessionToken[] = [];

const assignSession = (user: User): string => {
  const sessionTokenString = bcrypt.hashSync('' + Math.random(), 10);
  const expiryTime = new Date().getTime() + 24 * 3600 * 1000; // One day tokens
  sessions.push({ user, session: sessionTokenString, expiryTime });

  return sessionTokenString;
};

const getUserFromSessionTokenString = (tokenString: string): User => {
  const sessionIndex = sessions.findIndex(
    (sessionToken) => sessionToken.session === tokenString
  );

  if (sessionIndex === -1) {
    return null;
  }

  const session = sessions[sessionIndex];

  if (session.expiryTime < new Date().getTime()) {
    sessions.splice(sessionIndex, 1);
    return null;
  }

  return session.user;
};

const removeSession = (tokenString: string): void => {
  const sessionIndex = sessions.findIndex(
    (sessionToken) => sessionToken.session === tokenString
  );

  sessions.splice(sessionIndex, 1);
};

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = userTable.find({ username });

  if (!user) {
    res.status(401).send();
    return;
  }

  const authSuccess = user.authenticate(password);

  if (!authSuccess) {
    res.status(401).send();
    return;
  }

  const sessionTokenString = assignSession(user);
  res.status(200).send({ sessionTokenString });
});

app.post('/validate-token', (req, res) => {
  const { sessionTokenString } = req.body;

  const valid = !!getUserFromSessionTokenString(sessionTokenString);
  res.status(valid ? 200 : 401).send();
});

app.post('/logout', (req, res) => {
  const { sessionTokenString } = req.body;

  const valid = !!getUserFromSessionTokenString(sessionTokenString);

  if (valid) {
    removeSession(sessionTokenString);
  }

  res.status(valid ? 200 : 401).send();
});

app.post('/get-user-data', (req, res) => {
  const { sessionTokenString } = req.body;

  const user = getUserFromSessionTokenString(sessionTokenString);
  if (!user) {
    res.status(401).send();
    return;
  }

  res.send({
    name: user.Name,
    isAdmin: user.isAdmin(),
    isTeacher: user.isTeacher(),
  });
});

app.post('/get-tasks', async (req, res) => {
  const { sessionTokenString } = req.body;

  const user = getUserFromSessionTokenString(sessionTokenString);
  if (!user || !user.isTeacher() && !user.isAdmin()) {
    res.status(401).send();
    return;
  }

  // TODO solve this
  res.send((await taskTable.get()).map((task) => task.getParams()));
});

app.post('/save-tasks', async (req, res) => {
  const { sessionTokenString } = req.body;

  const user = getUserFromSessionTokenString(sessionTokenString);
  if (!user || !user.isTeacher() && !user.isAdmin()) {
    res.status(401).send();
    return;
  }

  res.status(200).send();
});

// Check for expired session tokens every minute and delete them if they exist
setInterval(() => {
  const currentTime = new Date().getTime();

  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].expiryTime < currentTime) {
      sessions.splice(i, 1);
    }
  }
}, 60000);
