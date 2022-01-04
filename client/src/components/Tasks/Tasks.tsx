import React, { ChangeEvent, Fragment, useEffect, useState } from 'react';
import { SessionTokenString } from '../../util/useSessionToken';
import autosize from 'autosize';

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editedTasks, setEditedTasks] = useState<Task[]>([]);
  const [mismatchingArrays, setMismatchingArrays] = useState<Boolean[]>([]);

  useEffect(() => {
    fetch('/get-tasks', {
      method: 'POST',
      body: JSON.stringify({ sessionTokenString: token }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then(setTasks);
  }, [token]);

  useEffect(() => {
    setEditedTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    setMismatchingArrays(
      editedTasks.map(
        (task) => task.expectedOutput.length !== (task.testData?.length ?? 1)
      )
    );
  }, [editedTasks]);

  useEffect(() => {
    if (
      !editedTasks.some(
        (task) =>
          (task.testData && !task.testData.every(Boolean)) ||
          !task.expectedOutput.every(Boolean)
      )
    ) {
      // Do nothing if there's no empty element in any array of any of the tasks
      return;
    }

    const newEditedTasks = editedTasks.map((task) => {
      let testData = task.testData;
      if (Array.isArray(testData)) {
        testData = testData.filter(Boolean);
      }

      return {
        ...task,
        ...(testData ? { testData } : {}),
        expectedOutput: task.expectedOutput.filter(Boolean),
      };
    });

    setEditedTasks(newEditedTasks);
  }, [editedTasks]);

  // TODO validate

  const setAutosize = () => ({
    ref: (textarea: HTMLTextAreaElement) => autosize(textarea),
    resize: 'none',
  });

  const handleChange =
    (taskId: number, field: keyof Task, fieldId?: number) =>
    (e: ChangeEvent) => {
      const elem = e.target as HTMLInputElement | HTMLTextAreaElement;
      const newValue = elem.value;

      if (!Array.isArray(editedTasks)) {
        return;
      }

      const newEditedTasks = JSON.parse(JSON.stringify(editedTasks));

      if (fieldId !== undefined) {
        newEditedTasks[taskId][field][fieldId] = newValue;
      } else {
        newEditedTasks[taskId][field] = newValue;
      }

      setEditedTasks(newEditedTasks);
    };

  const addEntry = (taskId: number, field: keyof Task) => (e: ChangeEvent) => {
    const elem = e.target as HTMLInputElement | HTMLTextAreaElement;
    const newValue = elem.value;

    if (!Array.isArray(editedTasks)) {
      return;
    }

    const newEditedTasks = JSON.parse(JSON.stringify(editedTasks));

    if (!Array.isArray(newEditedTasks[taskId][field])) {
      newEditedTasks[taskId][field] = [];
    }

    newEditedTasks[taskId][field].push(newValue);

    setEditedTasks(newEditedTasks);
  };

  return (
    <div className="row w-100">
      {editedTasks.map((task, index) => {
        return (
          <div className="col-6 col-md-4 col-lg-3" key={task.id}>
            <div className="card bg-dark border-secondary">
              <div className="card-header border-secondary">
                Feladat #{task.id}
              </div>
              <div className="card-body">
                <label className="text-light text-center">Feladatleírás</label>
                <textarea
                  className="form-control bg-dark text-light"
                  value={task.description}
                  {...setAutosize()}
                  onChange={handleChange(index, 'description')}
                />

                <label className="text-light text-center">Tesztadatok</label>
                {task.testData?.map((testData, tdIndex) => (
                  <input
                    key={`${testData} ${tdIndex}`}
                    className="form-control bg-dark text-light"
                    value={testData}
                    onChange={handleChange(index, 'testData', tdIndex)}
                  />
                ))}
                <input
                  className="form-control bg-dark text-light"
                  value=""
                  placeholder="Új érték hozzáadása"
                  onChange={addEntry(index, 'testData')}
                />

                <label className="text-light text-center">
                  Elvárt kimenetek
                </label>
                {task.expectedOutput.map((expectedOutput, eoIndex) => (
                  <textarea
                    key={`${expectedOutput} ${eoIndex}`}
                    className="form-control bg-dark text-light"
                    value={expectedOutput}
                    {...setAutosize()}
                    onChange={handleChange(index, 'expectedOutput', eoIndex)}
                  />
                )) || <br />}
                <input
                  className="form-control bg-dark text-light"
                  value=""
                  placeholder="Új érték hozzáadása"
                  onChange={addEntry(index, 'expectedOutput')}
                />

                {mismatchingArrays[index] && (
                  <p className="text-danger">
                    Az elvárt kimenetek hossza meg kell egyezzen a tesztadatok
                    számával, vagy ilyen híján 1-gyel.
                  </p>
                )}

                <label className="text-light text-center">Pontérték</label>
                <input
                  className="form-control bg-dark text-light"
                  value={task.pointValue}
                  onChange={handleChange(index, 'pointValue')}
                  type="number"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Tasks;
