import express from 'express';
import {
  destroySession,
  needsAdmin,
} from './authRouter';
import { User, UserParams } from '../entities/User';
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

/* --== Methods ==-- */

const getUserByUsername = async (username: string): Promise<User> => {
  return await userTable.find({ username });
};

/* --== Routes ==-- */

// UserTable init await
router.use(async (_, __, next) => {
  await initPromise;

  next();
});

// Userlist retrieval
router.post('/get-users', needsAdmin, async (_, res) => {
  res.send(await userTable.getParams());
});

// Userlist updating
router.post('/save-users', needsAdmin, async (req, res) => {
  const users: UserParams[] = req.body.users;
  const user = res.locals.user as User;

  users.forEach(async (user) => {
    if (!await getUserByUsername(user.username)) {
      // Set the non-existing users's passwords to empty string, i.e reset position
      user.password = '';
    }
  })

  // Prevent non-root admins from giving or taking admin rights
  if (user.Username !== 'admin') {
    users.forEach(async (user) => {
      const existingUser = await getUserByUsername(user.username);
      if (existingUser) {
        // Unchanged for existing users
        user.admin = existingUser.isAdmin();
      } else {
        // No admin for new users
        user.admin = false;
      }
    });
  }
  // Enforce admin privilege to the root admin user
  if (users.some((user) => user.username === 'admin')) {
    users.forEach((user) => {
      if (user.username === 'admin') {
        user.admin = true;
      }
    });
  }
  // Prevent user from stripping their own admin right
  if (users.some((u) => u.username === user.Username)) {
    users.forEach((user) => {
      if (user.username === user.Username) {
        user.admin = true;
      }
    });
  }

  userTable
    .saveParams(users)
    .then(() => res.send())
    .catch((e) => res.status(500).send(e));
});

// User deletion
router.post('/delete-user', needsAdmin, async (req, res) => {
  const { username } = req.body;
  const user = res.locals.user as User;

  // Prevent deletion of root admin user or self
  if (username === 'admin' || username === user.Username) {
    res.status(403).send();
    return;
  }

  const userToDelete = await getUserByUsername(username);
  if (!userToDelete) {
    res.status(404).send();
    return;
  }
  // Prevent deletion of other admins except by root
  if (user.Username !== 'admin' && userToDelete.isAdmin()) {
    res.status(401).send();
    return;
  }

  userTable
    .delete({ username })
    .then(() => res.send())
    .catch((e) => res.status(500).send(e));
});

// Password reset initiation
router.post('/init-reset-password', needsAdmin, async (req, res) => {
  const { username } = req.body;
  const user = res.locals.user as User;

  // Prevent password reset of root admin user or self
  if (username === 'admin' || username === user.Username) {
    res.status(403).send();
    return;
  }

  const userToReset = await getUserByUsername(username);
  if (!userToReset) {
    res.status(404).send();
    return;
  }
  // Prevent reset of other admins' pw except by root
  if (user.Username !== 'admin' && userToReset.isAdmin()) {
    res.status(401).send();
    return;
  }

  userTable
    .resetPassword(username)
    .then(() => {
      destroySession(username);
      res.send();
    })
    .catch((e) => {
      res.status(500).send(e);
    });
});

/* --== Exports ==-- */

export default router;
