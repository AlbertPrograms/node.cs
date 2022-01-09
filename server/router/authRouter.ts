import express from 'express';
import bcrypt from 'bcrypt';
import { User } from '../entities/User';
import { UserTable } from '../schemas/UserTable';

const router = express.Router();

/* --== Initialization ==-- */

let userTable: UserTable;

let initPromise: Promise<void>;
let initialized = false;
const init = async () => {
  if (initialized) {
    await initPromise;
    return;
  }

  let resolve: () => void;
  initPromise = new Promise((r) => (resolve = r));

  userTable = UserTable.getInstance();
  await userTable.get();

  initialized = true;
  resolve();
};
init();

/* --== Interfaces, methods and variables ==-- */

interface SessionToken {
  user: User;
  session: string;
  expiryTime: number;
}

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

const destroySession = (username: string): void => {
  const sessionIndex = sessions.findIndex(
    (sessionToken) => sessionToken.user.Username === username
  );

  sessions.splice(sessionIndex, 1);
};

/* --== Routing middleware ==-- */

/**
 * Route needs a valid user login
 */
const needsUser: express.Handler = (_, res, next) => {
  const user = res.locals.user as User;
  if (!user) {
    res.status(401).send();
    return;
  }

  next();
};

/**
 * Route needs a valid admin login
 */
const needsAdmin: express.Handler = (_, res, next) => {
  const user = res.locals.user as User;
  if (!user || !user.isAdmin()) {
    res.status(401).send();
    return;
  }

  next();
};

/**
 * Route needs a valid teacher or admin login
 */
const needsTeacherOrAdmin: express.Handler = (_, res, next) => {
  const user = res.locals.user as User;
  if (!user || (!user.isTeacher() && !user.isAdmin())) {
    res.status(401).send();
    return;
  }

  next();
};

/* --== Routes ==-- */

// UserTable init await, user and session saving to res.locals
router.use(async (req, res, next) => {
  await initPromise;
  const { sessionTokenString } = req.body;

  if (sessionTokenString) {
    // Check validity of token if provided, then store user and session in res.locals if user found
    const user = getUserFromSessionTokenString(sessionTokenString);
    if (user) {
      res.locals.user = user;
      res.locals.session = sessionTokenString;
    }
  }

  next();
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await userTable.find({ username });

  if (!user) {
    res.status(401).send();
    return;
  }

  const authSuccess = user.authenticate(password);

  if (!authSuccess) {
    // Delay to protect from brute force
    setTimeout(() => res.status(401).send(), 1500);
    return;
  }

  const sessionTokenString = assignSession(user);
  res.send({ sessionTokenString });
});

// Token validation
router.post('/validate-token', needsUser, (_, res) => {
  const valid = !!res.locals.user;
  res.status(valid ? 200 : 401).send();
});

// Logout
router.post('/logout', needsUser, (_, res) => {
  const user = res.locals.user as User;
  if (!user) {
    res.status(400).send();
  }

  destroySession(user.Username);
  res.send();
});

// User data retrieval
router.post('/get-user-data', needsUser, (_, res) => {
  const user = res.locals.user as User;

  res.send({
    username: user.Username,
    name: user.Name,
    email: user.Email,
    birthday: user.Birthday,
    isAdmin: user.isAdmin(),
    isTeacher: user.isTeacher(),
  });
});

// Change password
router.post('/change-password', needsUser, async (req, res) => {
  const { oldPw, newPw } = req.body;
  const user = res.locals.user as User;

  // Too short pw
  if (newPw.length < 6) {
    res.status(400).send();
    return;
  }
  // Wrong pw
  if (!user.authenticate(oldPw)) {
    res.status(401).send();
    return;
  }

  await userTable.changePassword(user.Username, newPw);
  res.send();
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
export {
  destroySession,
  needsUser,
  needsAdmin,
  needsTeacherOrAdmin,
};
