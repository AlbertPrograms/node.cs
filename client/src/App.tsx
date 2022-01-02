import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Editor, { EditorModes } from './components/Editor/Editor';
import Login from './components/Login/Login';
import useSessionToken, { SessionTokenString } from './util/useSessionToken';
import './css/bootstrap.min.css';
import './App.css';

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
      console.log(e);
    });
};

const App: React.FC = () => {
  const [token, setToken] = useSessionToken();

  useEffect(() => {
    const validate = () => validateToken(token, setToken);

    validate();
    const interval = setInterval(validate, 10000); // Validate every 10s

    return () => {
      clearInterval(interval);
    };
  }, [token, setToken]);

  if (!token) {
    return <Login setToken={setToken} />;
  }

  // TODO header with logout and welcome msg
  // TODO user admin
  // TODO user profile
  // TODO task admin

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Editor mode={EditorModes.PRACTICE} />}>
          <Route
            path="/practice"
            element={<Editor mode={EditorModes.PRACTICE} />}
          />
          <Route path="/exam" element={<Editor mode={EditorModes.EXAM} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
