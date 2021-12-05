import React from 'react';
import './css/bootstrap.min.css';
import './App.css';

import Editor from './components/Editor/Editor';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

// TODO documentation
// React router https://reactrouter.com/docs/en/v6/getting-started/overview

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Editor />}>
          <Route path="/practice" element={<Editor />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
};

export default App;
