import express from 'express';
import { needsTeacherOrAdmin, needsUser } from './authRouter';
import { ExamTable } from '../schemas/ExamTable';
import { Exam, ExamParams } from '../entities/Exam';
import { User } from '../entities/User';
import { taskTable, taskRouterInitPromise } from './taskRouter';

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

  await taskRouterInitPromise;

  initialized = true;
  resolve();
};
init();

/* --== Interfaces, methods and variables ==-- */

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
    .filter(Boolean);

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

/* --== Exports ==-- */

export default router;
