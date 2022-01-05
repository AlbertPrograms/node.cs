import React, { ChangeEvent, useEffect, useState } from 'react';
import { SessionTokenString } from '../../util/useSessionToken';
import { Navigate } from 'react-router-dom';
import autosize from 'autosize';

interface Task {
  id: number;
  description: string;
  testData?: string[];
  expectedOutput: string[];
  pointValue: number;
  practicable: boolean;
}

interface EditorTask {
  id: string;
  description: string;
  testData?: string[];
  expectedOutput: string[];
  pointValue: string;
  practicable: boolean;
  dirty: boolean;
}

interface TaskParams {
  token: SessionTokenString;
}

type FormInput = HTMLInputElement | HTMLTextAreaElement;

const setAutosize = () => ({
  ref: (textarea: HTMLTextAreaElement) => autosize(textarea),
  resize: 'none',
});

const Tasks: React.FC<TaskParams> = ({ token }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editedTasks, setEditedTasks] = useState<EditorTask[]>([]);
  const [mismatchingArrays, setMismatchingArrays] = useState<Boolean[]>([]);
  const [numericErrors, setNumericErrors] = useState<Boolean[]>([]);
  const [emptyDescriptions, setEmptyDescriptions] = useState<Boolean[]>([]);
  const [errors, setErrors] = useState(false);
  const [lastEditedElement, setLastEditedElement] = useState<FormInput>();
  const [refreshNeeded, setRefreshNeeded] = useState(true);
  const [canSave, setCanSave] = useState(false);
  const [taskTest, setTaskTest] = useState(-1);

  // Task getter
  useEffect(() => {
    if (!refreshNeeded) {
      return;
    }

    fetch('/get-tasks', {
      method: 'POST',
      body: JSON.stringify({ sessionTokenString: token }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then(setTasks)
      .then(() => {
        setRefreshNeeded(false);
      });
  }, [token, refreshNeeded]);

  // Edited task mapping from base tasks
  useEffect(() => {
    setEditedTasks(
      tasks.map((task) => ({
        ...task,
        id: `${task.id}`,
        pointValue: `${task.pointValue}`,
        dirty: false,
      }))
    );
  }, [tasks]);

  // Error mapping
  useEffect(() => {
    setMismatchingArrays(
      editedTasks.map(
        (task) => task.expectedOutput.length !== (task.testData?.length || 1)
      )
    );

    setNumericErrors(
      editedTasks.map((task) => !/[0-9]+/.test(task.pointValue))
    );

    setEmptyDescriptions(editedTasks.map((task) => !task.description.length));
  }, [editedTasks]);

  // Dirty calc
  useEffect(() => {
    setCanSave(editedTasks.some((task) => task.dirty));
  }, [editedTasks]);

  // Error calc
  useEffect(() => {
    setErrors(mismatchingArrays.some(Boolean) || numericErrors.some(Boolean));
  }, [mismatchingArrays, numericErrors, emptyDescriptions]);

  // Empty line removal
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

    if (lastEditedElement) {
      const elemToSelect = (lastEditedElement?.previousElementSibling ??
        lastEditedElement?.nextElementSibling) as FormInput;
      elemToSelect.focus();
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
  }, [editedTasks, lastEditedElement]);

  const handleChange =
    (taskId: number, field: keyof Task, fieldId?: number) =>
    (e: ChangeEvent) => {
      const elem = e.target as FormInput;
      const newValue = elem.value;

      setLastEditedElement(elem);

      if (!Array.isArray(editedTasks)) {
        return;
      }

      const newEditedTasks = JSON.parse(JSON.stringify(editedTasks));

      if (fieldId !== undefined) {
        newEditedTasks[taskId][field][fieldId] = newValue;
      } else {
        newEditedTasks[taskId][field] = newValue;
      }
      newEditedTasks[taskId].dirty = true;

      setEditedTasks(newEditedTasks);
    };

  const addEntry = (taskId: number, field: keyof Task) => (e: ChangeEvent) => {
    const elem = e.target as FormInput;
    const newValue = elem.value;

    if (!Array.isArray(editedTasks)) {
      return;
    }

    const newEditedTasks = JSON.parse(JSON.stringify(editedTasks));

    if (!Array.isArray(newEditedTasks[taskId][field])) {
      newEditedTasks[taskId][field] = [];
    }

    newEditedTasks[taskId][field].push(newValue);
    newEditedTasks[taskId].dirty = true;

    setEditedTasks(newEditedTasks);

    window.setTimeout(() => {
      const previousInputOrTextarea = e.target.previousElementSibling as
        | HTMLInputElement
        | HTMLTextAreaElement;
      previousInputOrTextarea.focus();
      previousInputOrTextarea.setSelectionRange(1, 1);
    }, 0);
  };

  const getNewEditorTask = (): EditorTask => ({
    id: `${Math.max(...editedTasks.map((task) => parseInt(task.id))) + 1}`,
    description: '',
    expectedOutput: [],
    pointValue: '',
    practicable: false,
    dirty: true,
  });

  const addTask = (index?: number) => {
    const newEditedTask = getNewEditorTask();

    const newEditedTasks = JSON.parse(JSON.stringify(editedTasks));

    if (index === undefined) {
      newEditedTasks.push(newEditedTask);
    } else {
      newEditedTasks.splice(index, 0, newEditedTask);
    }

    setEditedTasks(newEditedTasks);
  };

  const deleteTask = (taskId: string) => {
    if (!window.confirm(`Biztosan törölni kívánja a ${taskId}. feladatot?`)) {
      return;
    }

    fetch('/delete-task', {
      method: 'POST',
      body: JSON.stringify({
        sessionTokenString: token,
        taskId: parseInt(taskId),
      }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }

        setRefreshNeeded(true);
      })
      .catch((e) => {
        window.alert('Hiba történt a törlés közben');
        console.error(e);
      });
  };

  const save = () => {
    if (errors) {
      return;
    }

    const tasksToSave: Task[] = editedTasks.map((editedTask) => ({
      ...editedTask,
      id: parseInt(editedTask.id),
      pointValue: parseInt(editedTask.pointValue),
    }));

    fetch('/save-tasks', {
      method: 'POST',
      body: JSON.stringify({ sessionTokenString: token, tasks: tasksToSave }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }

        setRefreshNeeded(true);
      })
      .catch((e) => {
        window.alert('Hiba történt a mentés közben');
        console.error(e);
      });
  };

  const cancel = () => {
    setRefreshNeeded(true);
  };

  return (
    <div className="row w-100">
      <div className="col-6 col-md-4 col-lg-3 p-2">
        <button
          className="btn btn-dark border-secondary me-2"
          onClick={() => addTask()}
        >
          Új feladat
        </button>
      </div>
      {editedTasks.map((task, index) => {
        return (
          <div className="col-6 col-md-4 col-lg-3" key={task.id}>
            <div className="card bg-dark border-secondary">
              <div className="card-header border-secondary d-flex justify-content-between align-items-center">
                <div className={task.dirty ? 'text-warning' : ''}>
                  Feladat #{task.id}
                  {task.dirty && ' (*)'}
                </div>
                <div>
                  <button
                    className="btn btn-dark border-secondary me-2"
                    onClick={() => setTaskTest(index)}
                  >
                    Feladatpróba
                  </button>
                  {taskTest === index && (
                    <Navigate
                      to={{ pathname: '/task-test', search: `taskId=${index}` }}
                    ></Navigate>
                  )}
                  <button
                    className="btn btn-dark border-secondary text-danger"
                    onClick={() => deleteTask(task.id)}
                  >
                    Feladat törlése
                  </button>
                </div>
              </div>
              <div className="card-body">
                <label className="text-light text-center mb-2">
                  Feladatleírás
                </label>
                <textarea
                  className="form-control bg-dark text-light"
                  value={task.description}
                  {...setAutosize()}
                  onChange={handleChange(index, 'description')}
                />
                {emptyDescriptions[index] && (
                  <p className="text-danger py-2 m-0">
                    A leírás nem lehet üres.
                  </p>
                )}

                <label className="text-light text-center my-2">
                  Tesztadatok{' '}
                  <small className="text-secondary">(opcionális)</small>
                </label>
                {task.testData?.map((testData, tdIndex) => (
                  <input
                    key={`${tdIndex}`}
                    className="form-control bg-dark text-light mb-2"
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

                <label className="text-light text-center my-2">
                  Elvárt kimenetek
                </label>
                {task.expectedOutput.map((expectedOutput, eoIndex) => (
                  <textarea
                    key={`${eoIndex}`}
                    className="form-control bg-dark text-light mb-2"
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
                  <p className="text-danger py-2 m-0">
                    Az elvárt kimenetek hossza meg kell egyezzen a tesztadatok
                    számával, vagy ilyen híján 1-gyel.
                  </p>
                )}

                <label className="text-light text-center my-2">Pontérték</label>
                <input
                  className="form-control bg-dark text-light"
                  value={task.pointValue}
                  onChange={handleChange(index, 'pointValue')}
                  type="number"
                />
                {numericErrors[index] && (
                  <p className="text-danger py-2 m-0">
                    A pontérték csak számot tartalmazhat.
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {canSave && (
        <div className="row fixed-bottom p-2">
          <div className="col-2 col-md-3 col-lg-4"></div>
          <div className="col-4 col-md-3 col-lg-2">
            <button
              className="btn btn-dark border-success w-100 me-2"
              onClick={() => save()}
              disabled={errors}
            >
              Mentés
            </button>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <button
              className="btn btn-dark border-danger w-100"
              onClick={() => cancel()}
            >
              Mégse
            </button>
          </div>
          <div className="col-2 col-md-3 col-lg-4"></div>
        </div>
      )}
    </div>
  );
};

export default Tasks;
