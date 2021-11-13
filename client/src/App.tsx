import React, { useEffect, useState } from 'react';
import './css/bootstrap.min.css';
import './App.css';

import Editor from './components/Editor';

const App: React.FC = () => {
  const [height, setHeight] = useState(window.innerHeight);

  useEffect(() => {
    function handleResize() {
      setHeight(window.innerHeight);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Editor height={height} />
  )
};

export default App;
