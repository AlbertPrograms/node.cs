import express from 'express';
import bcrypt from 'bcrypt';
import fetch from 'node-fetch';
import { needsTeacherOrAdmin, needsUser } from './authRouter';
import { User } from '../entities/User';
import { Task } from '../entities/Task';
import { TaskTable } from '../schemas/TaskTable';

const router = express.Router();

/* --== Initialization ==-- */

let taskTable: TaskTable;

let initPromise: Promise<void>;
let initialized = false;
const init = async () => {
  if (initialized) {
    await initPromise;
    return;
  }

  let resolve: () => void;
  initPromise = new Promise((r) => (resolve = r));

  taskTable = TaskTable.getInstance();
  await taskTable.get();

  initialized = true;
  resolve();
};
init();

/* --== Interfaces, methods and variables ==-- */

const compilerAddress = process.env.compilerAddress;

if (!compilerAddress) {
  throw new Error('Compiler address must be set in ".env"!');
}

const enum EditorModes {
  EXAM,
  PRACTICE,
  TESTING,
}

interface TaskToken {
  id: Task['Id'];
  token: string;
  user: User;
  mode: EditorModes;
  code?: string;
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

const getTaskTokenString = () =>
  bcrypt.hashSync(new Date().getTime().toString(), 5);

const assignToken = ({ id, user, token, mode }: TaskToken) => {
  if ([EditorModes.TESTING, EditorModes.PRACTICE].includes(mode)) {
    // Remove old testing/practice mode token for this user if exists
    const oldTokenId = taskTokens.findIndex(
      (taskToken) =>
        taskToken.user.Username === user.Username && taskToken.mode === mode
    );
    if (oldTokenId !== -1) {
      taskTokens.splice(oldTokenId, 1);
    }
  }

  taskTokens.push({ id, user, token, mode });
};

const getTaskTokenFromTokenString = (token: string): TaskToken => {
  return taskTokens.find((taskToken) => taskToken.token === token);
};

const handleResults = (
  results: ExecutionResult[],
  task: Task
): SubmitTaskResponse => {
  console.log(results);
  const success = results.every(
    (result, index) => result.stdout === task.expectedOutput[index]
  );
  // TODO handle task completion to user
  return { results, success };
};

const provideTestTask = async (req: express.Request, res: express.Response) => {
  const user = res.locals.user as User;
  if (!user.isAdmin() && !user.isTeacher) {
    // task testing requested without privileges
    res.status(401).send();
    return;
  }

  const { taskId } = req.body;
  if (taskId == undefined) {
    // Invalid request without task id
    res.status(400).send();
    return;
  }

  const task = await taskTable.find({ id: taskId });
  if (!task) {
    // Task not found
    res.status(404).send();
    return;
  }

  const token = getTaskTokenString();
  assignToken({ id: taskId, token, user, mode: EditorModes.TESTING });

  res.send({ task: task.Description, token });
};

const providePracticeTask = async (
  req: express.Request,
  res: express.Response
) => {
  const { taskToken } = req.body;
  const user = res.locals.user as User;

  if (taskToken) {
    const token = getTaskTokenFromTokenString(taskToken);

    if (token) {
      if (token.user.Username !== user.Username) {
        res.status(401).send();
        return;
      }

      const task = await taskTable.find({ id: token.id });

      if (task) {
        res.send({ task: task.Description, token: token.token, code: token.code });
        return;
      }

      console.log('NO TASK!?!')
    }
  }

  const practicableTasks = (await taskTable.get()).filter(
    (task) => task.Practicable
  );
  const randomTaskId = Math.round(
    Math.random() * (practicableTasks.length - 1)
  );

  const task = practicableTasks[randomTaskId];
  const token = getTaskTokenString();
  assignToken({ id: randomTaskId, token, user, mode: EditorModes.PRACTICE });

  res.send({ task: task.Description, token });
};

const provideExamTask = async (req: express.Request, res: express.Response) => {
  const { taskToken } = req.body;
  const user = res.locals.user as User;

  if (taskToken) {
    const token = getTaskTokenFromTokenString(taskToken);

    if (token) {
      if (token.user.Username !== user.Username) {
        res.status(401).send();
        return;
      }

      const task = await taskTable.find({ id: token.id });

      if (task) {
        res.send({ task: task.Description, token: token.token, code: token.code });
        return;
      }
    }
  }

  // TODO require and fetch exam stuff
  const practicableTasks = (await taskTable.get()).filter(
    (task) => task.Practicable
  );
  const randomTaskId = Math.round(
    Math.random() * (practicableTasks.length - 1)
  );

  const task = practicableTasks[randomTaskId];
  const token = getTaskTokenString();
  assignToken({ id: randomTaskId, token, user, mode: EditorModes.PRACTICE });

  res.send({ task: task.Description, token });
};

/* --== Routes ==-- */

// TaskTable init await
router.use(async (_, __, next) => {
  await initPromise;

  next();
});

// Task retrieval
router.post('/get-task', needsUser, async (req, res) => {
  const { mode } = req.body;

  switch (mode) {
    case EditorModes.TESTING:
      return provideTestTask(req, res);
    case EditorModes.PRACTICE:
      return providePracticeTask(req, res);
    case EditorModes.EXAM:
      return provideExamTask(req, res);
  }
  
  // Invalid request without editor mode
  res.status(400).send();
});

// Task code saving
router.post('/store-task-progress', needsUser, async (req, res) => {
  const { taskToken, code } = req.body;
  const user = res.locals.user as User;

  if (taskToken) {
    const token = getTaskTokenFromTokenString(taskToken);

    if (token) {
      if (token.user.Username !== user.Username) {
        res.status(401).send();
        return;
      }

      token.code = code;
      res.send();
      return;
    }
  }
  
  res.status(404).send();
  return;
});

// Task submission
router.post('/submit-task', needsUser, async (req, res) => {
  const { code, token }: SubmitTaskRequest = req.body;
  const taskToken = taskTokens.find((tt) => tt.token === token);

  if (!taskToken) {
    res.status(400).send('Invalid token');
    return;
  }

  const task = await taskTable.find({ id: taskToken.id });
  if (!task) {
    res.status(404).send();
  }

  const codeCompileAndRunRequest: CodeCompileAndRunRequest = {
    code,
    expectedOutput: task.expectedOutput,
    ...(task.TestData?.length ? { testData: task.TestData } : {}),
  };
  const response = await fetch(`http://${compilerAddress}/compile-and-run`, {
    method: 'POST',
    body: JSON.stringify(codeCompileAndRunRequest),
    headers: { 'Content-Type': 'application/json' },
  });

  const results = (await response.json()) as ExecutionResult[];

  const submitResponse: SubmitTaskResponse = handleResults(results, task);
  res.send(submitResponse);
});

// Tasklist retrieval
router.post('/get-tasks', needsTeacherOrAdmin, async (_, res) => {
  res.send(await taskTable.getParams());
});

// Tasklist updating
router.post('/save-tasks', needsTeacherOrAdmin, async (req, res) => {
  const { tasks } = req.body;

  taskTable
    .saveParams(tasks)
    .then(() => res.send())
    .catch((e) => res.status(500).send(e));
});

// Task deletion
router.post('/delete-task', needsTeacherOrAdmin, async (req, res) => {
  const { taskId } = req.body;

  const task = await taskTable.find({ id: taskId });
  if (!task) {
    res.status(404).send();
    return;
  }

  taskTable
    .delete({ id: taskId })
    .then(() => res.send())
    .catch((e) => res.status(500).send(e));
});

/* --== Exports ==-- */

export default router;
