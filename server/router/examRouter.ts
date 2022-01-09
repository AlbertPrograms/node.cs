import express from 'express';
import bcrypt from 'bcrypt';
import { needsTeacherOrAdmin, needsUser } from './authRouter';
import { ExamTable } from '../schemas/ExamTable';
import { Exam, ExamParams } from '../entities/Exam';
import { User } from '../entities/User';

const router = express.Router();

/* --== Initialization ==-- */

let examTable: ExamTable;

let initPromise: Promise<void>;
let initialized = false;
const init = async () => {
  if (initialized) {
    await initPromise;
    return;
  }

  let resolve: () => void;
  initPromise = new Promise((r) => (resolve = r));

  examTable = ExamTable.getInstance();
  await examTable.get();

  initialized = true;
  resolve();
};
init();

/* --== Interfaces, methods and variables ==-- */

interface SessionToken {
  user: User;
  examId: number;
  session: string;
  startTime: number;
  expiryTime: number;
  taskCount: number;
  activeTask: number;
  solutions: string[]; // codes go here
}

const sessions: SessionToken[] = [];

const getSessionByUsername = (username: string): SessionToken => {
  return sessions.find((session) => session.user.Username === username);
};

const getSesssionByExamTokenString = (token: string): SessionToken => {
  return sessions.find((session) => session.session === token);
}

const assignSession = async (user: User, examId: number): Promise<string> => {
  const sessionTokenString = bcrypt.hashSync('' + Math.random(), 10);
  const exam = await getExamById(examId);
  const startTime = new Date().getTime();
  const expiryTime = startTime + exam.Duration * 60 * 1000;
  sessions.push({
    user,
    examId,
    session: sessionTokenString,
    startTime,
    expiryTime,
    taskCount: exam.Tasks.length,
    activeTask: 0,
    solutions: new Array(exam.Tasks.length).fill(''), // TODO get solution somehow
  });

  return sessionTokenString;
};

const getExamById = async (id: number): Promise<Exam> =>
  await examTable.find({ id });

/* --== Routes ==-- */

// ExamTable init await
router.use(async (_, __, next) => {
  await initPromise;

  next();
});

// Examlist retrieval
router.post('/get-exams', needsTeacherOrAdmin, async (_, res) => {
  res.send(await examTable.getParams());
});

// Examlist updating
router.post('/save-exams', needsTeacherOrAdmin, async (req, res) => {
  const exams: ExamParams[] = req.body.exams;

  // Enforce 15 min minimum and 150 min maximum duration
  if (exams.some((exam) => exam.duration < 15 || exam.duration > 150)) {
    res.status(400).send();
    return;
  }

  examTable
    .saveParams(exams)
    .then(() => res.send())
    .catch((e) => res.status(500).send(e));
});

// User deletion
router.post('/delete-exam', needsTeacherOrAdmin, async (req, res) => {
  const { id } = req.body;

  const examToDelete = await getExamById(id);
  if (!examToDelete) {
    res.status(404).send();
    return;
  }

  examTable
    .delete({ id })
    .then(() => res.send())
    .catch((e) => res.status(500).send(e));
});

router.post('/get-available-exams', needsUser, async (_, res) => {
  const user = res.locals.user as User;

  const exams = (await examTable.getParams())
    .map(({ id, name, startMin, startMax, duration, students }) => ({
      id,
      name,
      startMin,
      startMax,
      duration,
      registered: students.includes(user.Username),
      // 24 hours before it starts
      canRegister: startMin - 24 * 3600 * 1000 > new Date().getTime(),
      // 36 hours before it starts
      canUnregister: startMin - 36 * 3600 * 1000 > new Date().getTime(),
    }))
    .filter(({ startMax }) => startMax > new Date().getTime()); // Don't list expired exams

  res.send(exams);
});

// Student registration
router.post('/exam-registration', needsUser, async (req, res) => {
  const { id } = req.body;
  const user = res.locals.user as User;

  // Invalid exam id
  const examToRegister = await getExamById(id);
  if (!examToRegister) {
    res.status(404).send();
    return;
  }
  // Student already registered
  if (examToRegister.hasStudent(user.Username)) {
    res.status(400).send();
    return;
  }
  // Past the 24h mark before start
  if (examToRegister.StartMin - 24 * 3600 * 1000 <= new Date().getTime()) {
    res.status(403).send();
    return;
  }

  examTable.registerStudent(id, user.Username);
  res.send();
});

// Student unregistration
router.post('/exam-unregistration', needsUser, async (req, res) => {
  const { id } = req.body;
  const user = res.locals.user as User;

  // Invalid exam id
  const examToRegister = await getExamById(id);
  if (!examToRegister) {
    res.status(404).send();
    return;
  }
  // Student not already registered
  if (!examToRegister.hasStudent(user.Username)) {
    res.status(400).send();
    return;
  }
  // Past the 36h mark before start
  if (examToRegister.StartMin - 36 * 3600 * 1000 <= new Date().getTime()) {
    res.status(403).send();
    return;
  }

  examTable.unregisterStudent(id, user.Username);
  res.send();
});

router.post('/start-exam', needsUser, async (req, res) => {
  const { id } = req.body;
  const user = res.locals.user as User;

  const existingSession = getSessionByUsername(user.Username);
  if (existingSession) {
    // Already has an exam in progress
    res.status(400).send();
    return;
  }

  const sessionTokenString = await assignSession(user, id);
  res.send({ sessionTokenString });
});

router.post('/finish-exam', needsUser, async (req, res) => {
  const { id, token } = req.body;
  const user = res.locals.user as User;

  const session = getSessionByUsername(user.Username);
  if (!session) {
    // Doesn't have an exam in progress
    res.status(400).send();
    return;
  }

  // TODO finish

  res.send();
});

router.post('/get-exam-details', needsUser, async (_, res) => {
  const user = res.locals.user as User;

  const session = getSessionByUsername(user.Username);
  if (!session) {
    // Doesn't have an exam in progress
    res.status(404).send();
    return;
  }

  const { taskCount, activeTask, expiryTime: finishTime } = session;

  res.send({
    taskCount,
    activeTask,
    finishTime,
  });
});

router.post('/get-exam-in-progress', needsUser, async (_, res) => {
  const user = res.locals.user as User;
  const inProgress = getSessionByUsername(user.Username);
  res.status(inProgress ? 200 : 404).send();
});

/* --== Intervals ==-- */

// Check for expired session tokens every minute and delete them if they exist
setInterval(() => {
  const currentTime = new Date().getTime();

  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].expiryTime < currentTime) {
      sessions.splice(i, 1);
    }
  }
}, 60000);

/* --== Exports ==-- */

export default router;
