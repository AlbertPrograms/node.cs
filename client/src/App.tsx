import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Editor, { EditorModes } from './components/Editor/Editor';
import Header from './components/Header/Header';
import Login from './components/Login/Login';
import Tasks from './components/Tasks/Tasks';
import useSessionToken, { SessionTokenString } from './util/useSessionToken';
import './css/bootstrap.min.css';
import './App.css';

export interface UserData {
  name: string;
  isAdmin: boolean;
  isTeacher: boolean;
}

const getUserData = (token: SessionTokenString): Promise<Response> =>
  fetch('/get-user-data', {
    method: 'POST',
    body: JSON.stringify({ sessionTokenString: token }),
    headers: { 'Content-Type': 'application/json' },
  });

// Validates token from backend and empties it if it's invalid
const validateToken = (
  token: SessionTokenString,
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
  const [token, setToken] = useSessionToken();
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
  // TODO task admin

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
      <div className="vw-100 vh-100">
        <Header {...{ ...userData, logout }} />
        <Routes>
          <Route path="/" element={<Editor mode={EditorModes.PRACTICE} />}>
            <Route
              path="/practice"
              element={<Editor mode={EditorModes.PRACTICE} />}
            />
            <Route path="/exam" element={<Editor mode={EditorModes.EXAM} />} />
            {userData.isAdmin ||
              (userData.isTeacher && (
                <Route
                  path="/tasks"
                  element={<Tasks />}
                />
              ))}
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
