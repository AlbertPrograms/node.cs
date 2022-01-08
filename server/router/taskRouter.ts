import express from 'express';
import bcrypt from 'bcrypt';
import fetch, { Response } from 'node-fetch';
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

const compilerAddress = process.env.compilerAddress;

if (!compilerAddress) {
  throw new Error('Compiler address must be set in ".env"!');
}

/* --== Interfaces, methods and variables ==-- */

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

interface ExecutionResponse {
  results: ExecutionResult[];
  hiddenResults: ExecutionResult[];
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
  testData?: string[];
  expectedOutput: string[];
  hiddenTestData?: string[];
  hiddenExpectedOutput: string[];
}

/* Tokens */

const taskTokens: TaskToken[] = [];

const getTaskTokenString = () =>
  bcrypt.hashSync(new Date().getTime().toString(), 5);

const getTaskTokenFromTokenString = (token: string): TaskToken => {
  return taskTokens.find((taskToken) => taskToken.token === token);
};

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

/* Tasks */

const getTaskById = async (id: number): Promise<Task> => {
  return await taskTable.find({ id });
};

const provideTestTask: express.Handler = async (req, res) => {
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

  const task = await getTaskById(taskId);
  if (!task) {
    // Task not found
    res.status(404).send();
    return;
  }

  const token = getTaskTokenString();
  assignToken({ id: taskId, token, user, mode: EditorModes.TESTING });

  res.send({ task: task.Description, token });
};

const providePracticeTask: express.Handler = async (req, res) => {
  const { taskToken } = req.body;
  const user = res.locals.user as User;

  if (taskToken) {
    const token = getTaskTokenFromTokenString(taskToken);

    if (token) {
      if (token.user.Username !== user.Username) {
        res.status(401).send();
        return;
      }

      const task = await getTaskById(token.id);

      if (task) {
        res.send({
          task: task.Description,
          token: token.token,
          code: token.code,
        });
        return;
      }
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

const provideExamTask: express.Handler = async (req, res) => {
  const { taskToken } = req.body;
  const user = res.locals.user as User;

  if (taskToken) {
    const token = getTaskTokenFromTokenString(taskToken);

    if (token) {
      if (token.user.Username !== user.Username) {
        res.status(401).send();
        return;
      }

      const task = await getTaskById(token.id);

      if (task) {
        res.send({
          task: task.Description,
          token: token.token,
          code: token.code,
        });
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

/* Compilation */

const handleCompileAndRunResults = (
  results: ExecutionResult[],
  hiddenResults: ExecutionResult[]
): SubmitTaskResponse => {
  const success = [...results, ...hiddenResults].every(
    (result) => result.outputMatchesExpectation && result.code === 0
  );
  // TODO handle task completion to user
  return { results, success };
};

const sendCompileAndRunRequest = async (
  code: string,
  task: Task
): Promise<Response> => {
  const codeCompileAndRunRequest: CodeCompileAndRunRequest = {
    code,
    ...(task.TestData?.length ? { testData: task.TestData } : {}),
    expectedOutput: task.ExpectedOutput,
    ...(task.HiddenTestData?.length ? { testData: task.HiddenTestData } : {}),
    hiddenExpectedOutput: task.HiddenExpectedOutput,
  };

  return await fetch(`http://${compilerAddress}/compile-and-run`, {
    method: 'POST',
    body: JSON.stringify(codeCompileAndRunRequest),
    headers: { 'Content-Type': 'application/json' },
  });
};

const compileAndRunCode = async (
  code: string,
  task: Task
): Promise<SubmitTaskResponse> => {
  const response = await sendCompileAndRunRequest(code, task);
  const responseBody = (await response.json()) as ExecutionResponse;
  if (!responseBody?.results || !responseBody.hiddenResults) {
    return;
  }

  const { results, hiddenResults } = responseBody;
  const submitResponse = handleCompileAndRunResults(results, hiddenResults);
  return submitResponse;
};

/* --== Routes ==-- */

// TaskTable init await
router.use(async (_, __, next) => {
  await initPromise;

  next();
});

// Task retrieval
router.post('/get-task', needsUser, async (req, res, _) => {
  const { mode } = req.body;

  switch (mode) {
    case EditorModes.TESTING:
      return provideTestTask(req, res, _);
    case EditorModes.PRACTICE:
      return providePracticeTask(req, res, _);
    case EditorModes.EXAM:
      return provideExamTask(req, res, _);
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

  const taskToken = getTaskTokenFromTokenString(token);
  if (!taskToken) {
    res.status(400).send('Invalid token');
    return;
  }

  const task = await getTaskById(taskToken.id);
  if (!task) {
    res.status(404).send();
  }

  const response = await compileAndRunCode(code, task);

  if (!response) {
    res.status(500).send();
    return;
  }

  res.send(response);
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

  const task = await getTaskById(taskId);
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
