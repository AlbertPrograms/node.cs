import React, { useEffect, useState } from 'react';
import { SessionTokenString } from '../../util/useSessionToken';

interface Task {
  id: number;
  description: string;
  testData?: string[];
  expectedOutput: string[];
  pointValue: number;
}

interface TaskParams {
  token: SessionTokenString;
}

const Tasks: React.FC<TaskParams> = ({ token }) => {
  const [tasks, setTasks] = useState<Task[]>();

  useEffect(() => {
    console.log('na');
    fetch('/get-tasks', {
      method: 'POST',
      body: JSON.stringify({ sessionTokenString: token }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then(setTasks);
  }, []);

  return (
    <div>
      {tasks?.map((task) => {
        return <div key={task.id}></div>;
      })}
    </div>
  );
};

export default Tasks;
