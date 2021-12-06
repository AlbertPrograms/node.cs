import React, { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Editor, { EditorModes } from './components/Editor/Editor';
import Login from './components/Login/Login';
import useToken from './util/useToken';
import './css/bootstrap.min.css';
import './App.css';

// TODO documentation
// React router https://reactrouter.com/docs/en/v6/getting-started/overview
// React auth https://www.digitalocean.com/community/tutorials/how-to-add-login-authentication-to-react-applications

const App: React.FC = () => {
  const [token, setToken] = useToken();

  if (!token) {
    return <Login setToken={setToken} />
  }
  
  // TODO header with logout and welcome msg
  // TODO user admin
  // TODO user profile
  // TODO task admin

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Editor mode={EditorModes.PRACTICE} />}>
          <Route path="/practice" element={<Editor mode={EditorModes.PRACTICE} />} />
          <Route path="/exam" element={<Editor mode={EditorModes.EXAM} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
};

export default App;
