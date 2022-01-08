import React, { ChangeEvent, useEffect, useState } from 'react';
import { TokenString } from '../../util/useToken';

interface User {
  username: string;
  name: string;
  email: string;
  admin: boolean;
  teacher: boolean;
}

interface EditorUser extends User {
  id: number;
  existing: boolean;
  dirty: boolean;
}

interface UsersParams {
  token: TokenString;
  selfUsername: string;
}

// TODO documentation https://stackoverflow.com/questions/46155/whats-the-best-way-to-validate-an-email-address-in-javascript
const validEmail = (email: string): Boolean =>
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
    email
  );

const Users: React.FC<UsersParams> = ({ token, selfUsername }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [editedUsers, setEditedUsers] = useState<EditorUser[]>([]);
  const [emailErrors, setEmailErrors] = useState<Boolean[]>([]);
  const [missingNames, setMissingNames] = useState<Boolean[]>([]);
  const [missingEmails, setMissingEmails] = useState<Boolean[]>([]);
  const [errors, setErrors] = useState(false);
  const [refreshNeeded, setRefreshNeeded] = useState(true);
  const [canSave, setCanSave] = useState(false);

  // User getter
  useEffect(() => {
    if (!refreshNeeded) {
      return;
    }

    fetch('/get-users', {
      method: 'POST',
      body: JSON.stringify({ sessionTokenString: token }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then(setUsers)
      .then(() => {
        setRefreshNeeded(false);
      });
  }, [token, refreshNeeded]);
  
  // Edited user mapping from base users
  useEffect(() => {
    setEditedUsers(
      users.map((user, index) => ({
        ...user,
        id: index,
        existing: true,
        dirty: false,
      }))
    );
  }, [users]);

  // Error mapping
  useEffect(() => {
    setMissingNames(editedUsers.map((user) => !user.name.length));

    setMissingEmails(editedUsers.map((user) => !user.email.length));

    setEmailErrors(editedUsers.map((user) => !validEmail(user.email)));
  }, [editedUsers]);

  // Dirty calc
  useEffect(() => {
    setCanSave(editedUsers.some((user) => user.dirty));
  }, [editedUsers]);

  // Error calc
  useEffect(() => {
    setErrors(
      missingNames.some(Boolean) ||
        missingEmails.some(Boolean) ||
        emailErrors.some(Boolean)
    );
  }, [missingNames, missingEmails, emailErrors]);

  const handleChange =
    (userId: number, field: keyof User, fieldId?: number) =>
    (e: ChangeEvent) => {
      const elem = e.target as HTMLInputElement;
      const newValue = elem.value;

      if (!Array.isArray(editedUsers)) {
        return;
      }

      const newEditedUsers = JSON.parse(JSON.stringify(editedUsers));
      if (elem.type === 'checkbox') {
        newEditedUsers[userId][field] = elem.checked;
      } else {
        newEditedUsers[userId][field] = newValue;
      }
      newEditedUsers[userId].dirty = true;

      setEditedUsers(newEditedUsers);
    };

  const getNewEditorUser = (): EditorUser => ({
    id: Math.max(...editedUsers.map((user) => user.id)) + 1,
    username: '',
    name: '',
    email: '',
    admin: false,
    teacher: false,
    existing: false,
    dirty: true,
  });

  const addUser = () => {
    const newEditedUser = getNewEditorUser();
    const newEditedUsers = JSON.parse(JSON.stringify(editedUsers));
    newEditedUsers.push(newEditedUser);

    setEditedUsers(newEditedUsers);
  };

  const deleteUser = (username: string) => {
    if (!window.confirm(`Biztosan törölni kívánja ${username} felhasználót?`)) {
      return;
    }

    fetch('/delete-user', {
      method: 'POST',
      body: JSON.stringify({
        sessionTokenString: token,
        username,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }

        setRefreshNeeded(true);
      })
      .catch((e) => {
        window.alert('Hiba történt a törlés közben');
        console.error(e);
      });
  };

  const save = () => {
    if (errors) {
      return;
    }

    fetch('/save-users', {
      method: 'POST',
      body: JSON.stringify({ sessionTokenString: token, users: editedUsers }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }

        setRefreshNeeded(true);
      })
      .catch((e) => {
        window.alert('Hiba történt a mentés közben');
        console.error(e);
      });
  };

  const cancel = () => {
    setRefreshNeeded(true);
  };

  return (
    <div className="row w-100">
      {editedUsers.map((user, index) => {
        return (
          <div className="col-6 col-md-4 col-lg-3" key={user.id}>
            <div className="card bg-dark border-secondary">
              <div className="card-header border-secondary d-flex justify-content-between align-items-center">
                <div className={user.dirty ? 'text-warning' : ''}>
                  {user.existing ? (
                    user.username
                  ) : (
                    <input
                      className="form-control bg-dark text-light"
                      value={user.username}
                      placeholder="Felhasználónév"
                      onChange={handleChange(index, 'username')}
                    />
                  )}
                  {user.dirty && ' (*)'}
                </div>
                <div>
                  <button
                    className="btn btn-dark border-secondary text-danger"
                    onClick={() => deleteUser(user.username)}
                  >
                    Felhasználó törlése
                  </button>
                </div>
              </div>
              <div className="card-body">
                <label className="text-light text-center mb-2">Név</label>
                <input
                  className="form-control bg-dark text-light"
                  value={user.name}
                  onChange={handleChange(index, 'name')}
                />
                {missingNames[index] && (
                  <p className="text-danger py-2 m-0">A név nem lehet üres.</p>
                )}

                <label className="text-light text-center mb-2">
                  E-mail cím
                </label>
                <input
                  className="form-control bg-dark text-light"
                  value={user.email}
                  onChange={handleChange(index, 'email')}
                />
                {missingEmails[index] && (
                  <p className="text-danger py-2 m-0">Az e-mail lehet üres.</p>
                )}
                {emailErrors[index] && (
                  <p className="text-danger py-2 m-0">
                    Az e-mail formátuma nem megfelelő.
                  </p>
                )}

                <div className="form-check">
                  <label
                    className="form-check-label text-light text-center mb-2"
                    htmlFor={`${user.username}_admin`}
                  >
                    Adminisztrátor
                  </label>
                  <input
                    type="checkbox"
                    name={`${user.username}_admin`}
                    className="form-check-input bg-dark text-light"
                    checked={user.admin}
                    onChange={handleChange(index, 'admin')}
                    // Only the root admin can give and take privileges, and theirs are fixed
                    disabled={
                      selfUsername !== 'admin' || user.username === 'admin'
                    }
                  />
                </div>

                <div className="form-check">
                  <label
                    className="form-check-label text-light text-center mb-2"
                    htmlFor={`${user.username}_teacher`}
                  >
                    Tanár
                  </label>
                  <input
                    type="checkbox"
                    name={`${user.username}_teacher`}
                    className="form-check-input bg-dark text-light"
                    checked={user.teacher}
                    onChange={handleChange(index, 'teacher')}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {canSave && (
        <div className="row fixed-bottom p-2">
          <div className="col-2 col-md-3 col-lg-4"></div>
          <div className="col-4 col-md-3 col-lg-2">
            <button
              className="btn btn-dark border-success w-100 me-2"
              onClick={() => save()}
              disabled={errors}
            >
              Mentés
            </button>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <button
              className="btn btn-dark border-danger w-100"
              onClick={() => cancel()}
            >
              Mégse
            </button>
          </div>
          <div className="col-2 col-md-3 col-lg-4"></div>
        </div>
      )}
      <div className="col-6 col-md-4 col-lg-3 p-2">
        <button
          className="btn btn-dark border-secondary me-2"
          onClick={() => addUser()}
        >
          Új felhasználó
        </button>
      </div>
    </div>
  );
};

export default Users;
