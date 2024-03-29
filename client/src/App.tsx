import React, { Fragment, useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Editor, { EditorModes } from './components/Editor/Editor';
import Header from './components/Header/Header';
import Login from './components/Login/Login';
import Users from './components/Users/Users';
import Tasks from './components/Tasks/Tasks';
import Exams from './components/Exams/Exams';
import Exam from './components/Exam/Exam';
import ExamResults from './components/ExamResults/ExamResults';
import Profile from './components/Profile/Profile';
import useToken, { TokenString } from './util/useToken';
import './css/bootstrap.min.css';
import './App.css';

export interface UserData {
  username: string;
  name: string;
  email: string;
  birthday: string;
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

const checkExamInProgress = (
  token: TokenString,
  setExamInProgress: (examInProgress: boolean) => void
) => {
  if (!token) {
    return;
  }

  return fetch('/get-exam-in-progress', {
    method: 'POST',
    body: JSON.stringify({ sessionTokenString: token }),
    headers: { 'Content-Type': 'application/json' },
  })
    .then((res) => {
      setExamInProgress(res.status === 200);
    })
    .catch((e) => {
      console.error(e);
    });
};

const defaultUserData: UserData = {
  username: '',
  name: '',
  email: '',
  birthday: '',
  isAdmin: false,
  isTeacher: false,
};

const App: React.FC = () => {
  const [token, setToken] = useToken('session');
  const [tokenValid, setTokenValid] = useState(false);
  const [examInProgress, setExamInProgress] = useState(false);
  const [userData, setUserData] = useState({ ...defaultUserData });

  // Check regularly for token validity
  useEffect(() => {
    const validate = () => {
      validateToken(token, setTokenValid).then(() => {
        if (!tokenValid) {
          // Stop checking once returned invalid until the token doesn't change
          window.clearInterval(interval);
          window.clearInterval(examInterval);
        }
      });
    };

    const checkExam = () => checkExamInProgress(token, setExamInProgress);

    validate();
    checkExam();

    // Validate every 10s
    const interval = window.setInterval(validate, 10000);
    const examInterval = window.setInterval(checkExam, 10000);

    return () => {
      window.clearInterval(interval);
      window.clearInterval(examInterval);
    };
  }, [token, tokenValid]);

  // Get the user's data and exam token on a token change
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
              {!userData.isAdmin &&
                !userData.isTeacher &&
                (examInProgress ? (
                  <Route
                    path="/exam"
                    element={
                      <Editor
                        mode={EditorModes.EXAM}
                        token={token}
                        setExamInProgress={setExamInProgress}
                      />
                    }
                  />
                ) : (
                  <Route
                    path="/exam"
                    element={
                      <Exam
                        token={token}
                        examInProgress={examInProgress}
                        setExamInProgress={setExamInProgress}
                      />
                    }
                  />
                ))}
              {(userData.isAdmin || userData.isTeacher) && (
                <Fragment>
                  <Route
                    path="/task-test"
                    element={
                      <Editor mode={EditorModes.TESTING} token={token} />
                    }
                  />
                  <Route path="/tasks" element={<Tasks token={token} />} />
                  <Route path="/exams" element={<Exams token={token} />} />
                </Fragment>
              )}
              <Route
                path="/exam-results"
                element={<ExamResults token={token} />}
              />
              {userData.isAdmin && (
                <Route
                  path="/users"
                  element={
                    <Users token={token} selfUsername={userData.username} />
                  }
                />
              )}
              <Route
                path="/profile"
                element={<Profile token={token} userData={userData} />}
              />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
};

export default App;
