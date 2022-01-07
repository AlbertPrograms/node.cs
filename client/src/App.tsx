import React, { Fragment, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Editor, { EditorModes } from './components/Editor/Editor';
import Header from './components/Header/Header';
import Login from './components/Login/Login';
import Tasks from './components/Tasks/Tasks';
import useToken, { TokenString } from './util/useToken';
import './css/bootstrap.min.css';
import './App.css';

export interface UserData {
  name: string;
  isAdmin: boolean;
  isTeacher: boolean;
}

const getUserData = (token: TokenString): Promise<Response> =>
  fetch('/get-user-data', {
    method: 'POST',
    body: JSON.stringify({ sessionTokenString: token }),
    headers: { 'Content-Type': 'application/json' },
  });

// Validates token from backend and empties it if it's invalid
const validateToken = (
  token: TokenString,
  setTokenValid: (tokenValid: boolean) => void
): Promise<void> => {
  if (!token) {
    setTokenValid(false);
  }

  return fetch('/validate-token', {
    method: 'POST',
    body: JSON.stringify({ sessionTokenString: token }),
    headers: { 'Content-Type': 'application/json' },
  })
    .then((res) => {
      setTokenValid(res.status === 200);
    })
    .catch((e) => {
      console.error(e);
    });
};

const defaultUserData: UserData = {
  name: '',
  isAdmin: false,
  isTeacher: false,
};

const App: React.FC = () => {
  const [token, setToken] = useToken('session');
  const [tokenValid, setTokenValid] = useState(false);
  const [userData, setUserData] = useState({ ...defaultUserData });

  // Check regularly for token validity
  useEffect(() => {
    let interval: number;

    const validate = () => {
      validateToken(token, setTokenValid).then(() => {
        if (!tokenValid) {
          // Stop checking once returned invalid until the token doesn't change
          window.clearInterval(interval);
        }
      });
    };

    validate();

    // Validate every 10s
    interval = window.setInterval(validate, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, [token, tokenValid]);

  // Get the user's data on a token change
  useEffect(() => {
    if (token) {
      getUserData(token)
        .then((res) => res.json())
        .then(setUserData);
    } else {
      setUserData({ ...defaultUserData });
    }
  }, [token]);

  if (!tokenValid) {
    return <Login setToken={setToken} />;
  }

  // TODO user admin
  // TODO user profile

  const logout = () => {
    fetch('/logout', {
      method: 'POST',
      body: JSON.stringify({ sessionTokenString: token }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then(() => {
        setToken('');
      })
      .catch((e) => {
        console.error(e);
      });
  };

  return (
    <BrowserRouter>
      <div className="w-100 vh-100">
        <Header {...{ ...userData, logout }} />
        <div className="content-wrapper">
          <div className="content p-4 w-100 h-100">
            <Routes>
              <Route
                path="/practice"
                element={<Editor mode={EditorModes.PRACTICE} token={token} />}
              />
              <Route path="/exam" element={<Editor mode={EditorModes.EXAM} token={token} />} />
              {(userData.isAdmin || userData.isTeacher) && (
                <Fragment>
                  <Route
                    path="/task-test"
                    element={<Editor mode={EditorModes.TESTING} token={token} />}
                  />
                  <Route path="/tasks" element={<Tasks token={token} />} />
                </Fragment>
              )}
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
