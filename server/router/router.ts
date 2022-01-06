import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import bcrypt from 'bcrypt';
import fetch from 'node-fetch';
import { Task, TaskParams } from '../entities/Task';
import { TaskTable } from '../schemas/TaskTable';
import { User } from '../entities/User';

import authRouter, {
  needsAdmin,
  needsTeacher,
  needsTeacherOrAdmin,
} from './authRouter';

const router = express.Router();
router.use(authRouter);

const compilerAddress = process.env.compilerAddress;

if (!compilerAddress) {
  throw new Error('Compiler address must be set in ".env"!');
}

interface TaskToken {
  id: Task['Id'];
  token: string;
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

const taskTable = TaskTable.getInstance();

// TODO random task assignment based on category and practice mode
router.post('/get-task', async (req, res) => {
  const { taskId } = req.body;
  const user = res.locals.user as User;
  if (!user) {
    res.status(403).send();
    return;
  }

  if (taskId !== undefined && !user.isAdmin() && !user.isTeacher) {
    res.status(401).send();
    return;
  }

  let task;

  if (taskId !== undefined) {
    task = taskTable.find({ id: taskId });
    if (!task) {
      res.status(404).send();
      return;
    }
  } else {
    const practicableTasks = (await taskTable.get()).filter(
      (task) => task.Practicable
    );
    const randomTaskId = Math.round(
      Math.random() * (practicableTasks.length - 1)
    );
    task = practicableTasks[randomTaskId];
  }

  const token = getTaskToken();
  taskTokens.push({
    id: task.Id,
    token,
  });

  res.send({
    task: task.Description,
    token,
  });
});

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

router.post('/submit-task', async (req, res) => {
  const { code, token }: SubmitTaskRequest = req.body;
  const taskToken = taskTokens.find((tt) => tt.token === token);

  if (!taskToken) {
    res.status(400).send('Invalid token');
    return;
  }

  const task = taskTable.find({ id: taskToken.id });
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

router.post('/get-tasks', needsTeacherOrAdmin, async (_, res) => {
  // TODO solve this
  res.send((await taskTable.get()).map((task) => task.getParams()));
});

router.post('/save-tasks', needsTeacherOrAdmin, async (req, res) => {
  const { tasks } = req.body;

  taskTable
    .save(tasks.map((task: TaskParams) => new Task(task)))
    .then(() => res.send())
    .catch((e) => res.status(500).send(e));
});

router.post('/delete-task', needsTeacherOrAdmin, async (req, res) => {
  const { taskId } = req.body;

  const task = taskTable.find({ id: taskId });
  if (!task) {
    res.status(404).send();
    return;
  }

  taskTable
    .delete({ id: taskId })
    .then(() => res.send())
    .catch((e) => res.status(500).send(e));
});

export default router;
