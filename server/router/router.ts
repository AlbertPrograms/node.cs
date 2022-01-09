import express from 'express';

import authRouter from './authRouter';
import taskRouter from './taskRouter';
import userRouter from './userRouter';
import examRouter from './examRouter';

const router = express.Router();
router.use(authRouter);
router.use(taskRouter);
router.use(userRouter);
router.use(examRouter);

export default router;
