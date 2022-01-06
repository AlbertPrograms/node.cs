import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import authRouter from './authRouter';
import taskRouter from './taskRouter';

const router = express.Router();
router.use(authRouter);
router.use(taskRouter);

export default router;
