import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Editor, { EditorModes } from './components/Editor/Editor';
import Header from './components/Header/Header';
import Login from './components/Login/Login';
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
  setToken: (token: SessionTokenString) => void
): void => {
  if (!token) {
    return; // Do nothing if token is unset or empty
  }

  fetch('/validate-token', {
    method: 'POST',
    body: JSON.stringify({ sessionTokenString: token }),
    headers: { 'Content-Type': 'application/json' },
  })
    .then((res) => {
      if (res.status !== 200) {
        setToken(''); // Empty token
      }
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

  useEffect(() => {
    console.log('useEffect');

    const validate = () => validateToken(token, setToken);

    validate();

    const interval = setInterval(validate, 10000); // Validate every 10s

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (token) {
      getUserData(token)
        .then((res) => res.json())
        .then(setUserData);
    } else {
      setUserData({ ...defaultUserData });
    }
  }, [token]);

  if (!token) {
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
          </Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;
