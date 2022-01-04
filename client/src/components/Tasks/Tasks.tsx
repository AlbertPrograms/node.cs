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

interface EditorTask {
  id: string;
  description: string;
  testData?: string[];
  expectedOutput: string[];
  pointValue: string;
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
  const [lastEditedElement, setLastEditedElement] = useState<FormInput>();
  const [refreshNeeded, setRefreshNeeded] = useState(true);
  const [removedTasksExist, setRemovedTasksExist] = useState(false);
  const [canSave, setCanSave] = useState(false);

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
        setRemovedTasksExist(false);
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
        (task) => task.expectedOutput.length !== (task.testData?.length ?? 1)
      )
    );

    setNumericErrors(
      editedTasks.map((task) => !/[0-9]+/.test(task.pointValue))
    );
  }, [editedTasks]);

  // Dirty calc
  useEffect(() => {
    setCanSave(editedTasks.some((task) => task.dirty) || removedTasksExist);
  }, [editedTasks, removedTasksExist]);

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

    const elemToSelect = (lastEditedElement?.previousElementSibling ??
      lastEditedElement?.nextElementSibling) as FormInput;
    elemToSelect.focus();

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

  const removeTask = (index: number) => {
    if (!window.confirm(`Biztosan törölni kívánja a ${index}. feladatot?`)) {
      return;
    }

    const newEditedTasks = JSON.parse(JSON.stringify(editedTasks));

    newEditedTasks.splice(index, 1);
    setRemovedTasksExist(true);

    setEditedTasks(newEditedTasks);
  };

  const save = () => {
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
                    onClick={() => addTask(index)}
                  >
                    Új feladat
                  </button>
                  <button
                    className="btn btn-dark border-secondary text-danger"
                    onClick={() => removeTask(index)}
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

                <label className="text-light text-center my-2">
                  Tesztadatok
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
      <div className="col-6 col-md-4 col-lg-3 p-2">
        <button
          className="btn btn-dark border-secondary me-2"
          onClick={() => addTask()}
        >
          Új feladat
        </button>
      </div>

      {canSave && (
        <div className="row fixed-bottom p-2">
          <div className="col-2 col-md-3 col-lg-4"></div>
          <div className="col-4 col-md-3 col-lg-2">
            <button
              className="btn btn-dark border-success w-100 me-2"
              onClick={() => save()}
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
