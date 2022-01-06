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

const removeSession = (tokenString: string): void => {
  const sessionIndex = sessions.findIndex(
    (sessionToken) => sessionToken.session === tokenString
  );

  sessions.splice(sessionIndex, 1);
};

/* --== Routing middleware ==-- */

const needsUser = (_: any, res: express.Response, next: express.NextFunction) => {
  const user = res.locals.user as User;
  if (!user) {
    res.status(401).send();
    return;
  }

  next();
};

const needsAdmin = (_: any, res: express.Response, next: express.NextFunction) => {
  const user = res.locals.user as User;
  if (!user || !user.isAdmin()) {
    res.status(401).send();
    return;
  }

  next();
};

const needsTeacher = (_: any, res: express.Response, next: express.NextFunction) => {
  const user = res.locals.user as User;
  if (!user || !user.isTeacher()) {
    res.status(401).send();
    return;
  }

  next();
};

const needsTeacherOrAdmin = (_: any, res: express.Response, next: express.NextFunction) => {
  const user = res.locals.user as User;
  if (!user || (!user.isTeacher() && !user.isAdmin())) {
    console.log('fail');
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
  const user = userTable.find({ username });

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
router.post('/validate-token', (_, res) => {
  const valid = !!res.locals.user;
  res.status(valid ? 200 : 401).send();
});

// Logout
router.post('/logout', (req, res) => {
  const { sessionTokenString } = req.body;

  const valid = !!res.locals.user;

  if (valid) {
    removeSession(sessionTokenString);
  }

  res.status(valid ? 200 : 401).send();
});

// User data retrieval
router.post('/get-user-data', needsUser, (_, res) => {
  const user = res.locals.user as User;

  res.send({
    name: user.Name,
    isAdmin: user.isAdmin(),
    isTeacher: user.isTeacher(),
  });
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
export { needsUser, needsAdmin, needsTeacher, needsTeacherOrAdmin };
