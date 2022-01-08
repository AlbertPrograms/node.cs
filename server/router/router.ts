import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import authRouter from './authRouter';
import taskRouter from './taskRouter';
import userRouter from './userRouter';

const router = express.Router();
router.use(authRouter);
router.use(taskRouter);
router.use(userRouter);

export default router;
