import React, {
  ChangeEventHandler,
  MouseEventHandler,
  FormEventHandler,
  useState,
  useEffect,
  ReactElement,
  KeyboardEventHandler,
  Fragment,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import useToken, { TokenString } from '../../util/useToken';
import { mapDateFromMs } from '../Exams/Exams';
import './Editor.css';

export const enum EditorModes {
  EXAM,
  PRACTICE,
  TESTING,
}

interface EditorParams {
  mode: EditorModes;
  token: TokenString;
  setExamInProgress?: (token: boolean) => void;
}

interface TaskResponse {
  task: string;
  token: string;
  code?: string;
}

interface ExecutionResult {
  code: number;
  stdout: string;
  stderr: string;
  outputMatchesExpectation?: boolean;
  args?: string;
}

interface SubmitResponse {
  results: ExecutionResult[];
  success: boolean;
}

interface ExamDetails {
  taskCount: number;
  activeTask: number;
  successes: boolean[];
  finishTime: number;
}

const formatTaskDescription = (text: string): string | ReactElement => {
  const splitByBackticks = text.split('`');

  if (splitByBackticks.length % 2 === 0) {
    return text;
  }

  const formattedArray = splitByBackticks.map((str, index) =>
    index % 2 === 1 ? (
      <code key={str}>{str}</code>
    ) : (
      <span key={str}>{str}</span>
    )
  );
  return <span>{formattedArray}</span>;
};

const Editor: React.FC<EditorParams> = ({ mode, token, setExamInProgress }) => {
  const [task, setTask] = useState<string>();
  const [code, setCode] = useState('');
  const [taskId, setTaskId] = useState<number>(0);
  const [storedCode, setStoredCode] = useState('');
  const [examDetails, setExamDetails] = useState<ExamDetails>();
  const [examTask, setExamTask] = useState(0);
  const [examDetailsRefreshNeeded, setExamDetailsRefreshNeeded] =
    useState(false);
  const [submitResponse, setSubmitResponse] = useState<SubmitResponse>();
  const [height, setHeight] = useState(window.innerHeight);
  const [practiceTaskToken, setPracticeTaskToken] = useToken('practiceTask');

  const [searchParams] = useSearchParams();

  const rowStyle = { height: `${height - 202}px` };

  // Editor resize listener
  useEffect(() => {
    function handleResize() {
      setHeight(window.innerHeight);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Task id watcher
  useEffect(() => {
    const id = parseInt(searchParams.get('taskId') as string);
    if (!isNaN(id)) {
      setTaskId(id);
    }
  }, [searchParams]);

  // Task fetch on load and mode change
  useEffect(() => {
    let body: any = { sessionTokenString: token, mode };
    switch (mode) {
      case EditorModes.PRACTICE:
        body.taskToken = practiceTaskToken;
        break;
      case EditorModes.TESTING:
        body.taskId = parseInt(searchParams.get('taskId') as string);
        break;
      case EditorModes.EXAM:
        body.taskId = examTask;
    }

    const url = mode === EditorModes.EXAM ? '/get-exam-task' : '/get-task';

    fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }

        return res.json();
      })
      .then((res: TaskResponse) => {
        setTask(res.task);
        if (mode === EditorModes.PRACTICE) {
          setPracticeTaskToken(res.token);
        }

        setCode(res.code || '');
      })
      .then(() => setExamDetailsRefreshNeeded(true))
      .then(() => setSubmitResponse(undefined))
      .catch((e) => {
        window.alert('Hiba történt a betöltés közben');
        console.error(e);
      });
    // Eslint doesn't mix well with custom hook setters. :/
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, token, practiceTaskToken, searchParams, examTask]);

  // Exam details fetch
  useEffect(() => {
    if (mode !== EditorModes.EXAM || !examDetailsRefreshNeeded) {
      return;
    }

    fetch('/get-exam-details', {
      method: 'POST',
      body: JSON.stringify({
        sessionTokenString: token,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }

        return res.json();
      })
      .then(setExamDetails)
      .then(() => setExamDetailsRefreshNeeded(false))
      .catch((e) => {
        window.alert('Hiba történt a vizsgaadatok betöltése közben');
        console.error(e);
      });
  }, [token, mode, examDetailsRefreshNeeded]);

  // Sync code every 2s if changed since last time
  useEffect(() => {
    if (mode === EditorModes.TESTING) {
      return;
    }

    let body: any = { sessionTokenString: token, code };
    if (mode === EditorModes.PRACTICE) {
      body.taskToken = practiceTaskToken;
    }

    const interval = window.setInterval(() => {
      if (code === storedCode) {
        return;
      }

      const url =
        mode === EditorModes.EXAM
          ? '/store-exam-task-progress'
          : '/store-task-progress';

      setStoredCode(code);
      fetch(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
    }, 2000);

    return () => clearInterval(interval);
  });

  const handleTextareaChange: ChangeEventHandler = (event) => {
    const textarea: HTMLTextAreaElement = event.target as HTMLTextAreaElement;
    setCode(textarea.value);
  };

  // Catch enters and tabs for indentation help
  const handleTextareaKeydown: KeyboardEventHandler = (event) => {
    if (!['Enter', 'Tab'].includes(event.key)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const textarea: HTMLTextAreaElement = event.target as HTMLTextAreaElement;
    if (event.key === 'Tab') {
      setCode(`${code}  `);
    } else {
      const [codeBefore, codeAfter] = [
        code.substring(0, textarea.selectionStart),
        code.substring(textarea.selectionEnd),
        code.length - 1,
      ];
      const lines = codeBefore
        .substring(0, textarea.selectionStart)
        .split('\n');
      const lastLine = lines[lines.length - 1].split('');
      const braceEndingCorrection =
        lastLine[lastLine.length - 1] === '{' ? 2 : 0;
      const lastLineSpacingCount = lastLine.reduceRight(
        (acc, char) => (char === ' ' ? acc + 1 : 0),
        0
      );
      const newSpacing = lastLineSpacingCount + braceEndingCorrection;
      console.log(lastLine, lastLineSpacingCount);
      setCode(
        `${codeBefore}\n${new Array(newSpacing).fill(' ').join('')}${codeAfter}`
      );

      window.setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd =
          // Put the cursor after our last inserted char
          codeBefore.length + newSpacing + 1;
      }, 0);
    }
  };

  const handleSubmit: FormEventHandler = (event) => {
    event.preventDefault();

    fetch('/submit-task', {
      method: 'POST',
      body: JSON.stringify({
        sessionTokenString: token,
        token: practiceTaskToken,
        taskId,
        code,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        const response = (await res.json()) as SubmitResponse;
        setSubmitResponse(response);
      })
      .catch((e) => {
        console.error(e);
        window.alert('Hiba történt a beküldés közben.');
      });
  };

  const handleSubmitExam: FormEventHandler = (event) => {
    event.preventDefault();

    fetch('/submit-exam-task', {
      method: 'POST',
      body: JSON.stringify({
        sessionTokenString: token,
        code,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        const response = (await res.json()) as SubmitResponse;
        setSubmitResponse(response);
        setExamDetailsRefreshNeeded(true);
      })
      .catch((e) => {
        console.error(e);
        window.alert('Hiba történt a beküldés közben.');
      });
  };

  const handleFinish: MouseEventHandler = async (event) => {
    event.preventDefault();

    if (!window.confirm('Biztosan be kívánja fejezni a vizsgázást?')) {
      return;
    }

    fetch('/finish-exam', {
      method: 'POST',
      body: JSON.stringify({
        sessionTokenString: token,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }

        setExamInProgress?.(false);
      })
      .catch((e) => {
        window.alert('Hiba történt a feladat véglegesítése közben');
        console.error(e);
      });
  };

  // Practice mode next task
  const handleNext: MouseEventHandler = async (event) => {
    event.preventDefault();

    fetch('/finalize-task', {
      method: 'POST',
      body: JSON.stringify({
        sessionTokenString: token,
        token: practiceTaskToken,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }

        setPracticeTaskToken('');
        setCode('');
      })
      .catch((e) => {
        window.alert('Hiba történt a feladat léptetése közben');
        console.error(e);
      });
  };

  const selectExamTask = (taskIndex: number) => {
    setExamTask(taskIndex);
    setExamDetailsRefreshNeeded(true);
  };

  const formatOutput = (text: string): string => {
    return text.split('\n').join('<br />');
  };

  return (
    <div className="container d-flex">
      <div className="row w-100 justify-content-center align-self-center">
        <h4>{task ? formatTaskDescription(task) : ''}</h4>
        <form method="post">
          <div className="row" style={rowStyle}>
            <div className={`col ${submitResponse ? 'col-6' : 'col-12'} h-100`}>
              <textarea
                name="code"
                className="form-control h-100 bg-dark text-light font-monospace"
                value={code}
                onChange={handleTextareaChange}
                onKeyDown={handleTextareaKeydown}
                spellCheck={false}
              />
            </div>
            {submitResponse && (
              <div className="col col-6 h-100">
                <div className="card h-100 bg-dark border-light px-3 py-1 font-monospace overflow-auto">
                  {submitResponse.results.map((result) => (
                    <div key={result.stdout}>
                      {result.args && (
                        <div className="row">
                          <div className="lead mb-2">
                            Futtatási argumentumok
                          </div>
                          <div>{result.args}</div>
                        </div>
                      )}
                      <div
                        className={`row ${
                          result.outputMatchesExpectation ? '' : 'text-danger'
                        }`}
                      >
                        <div className="lead mb-2">Kimenet</div>
                        <div>{formatOutput(result.stdout)}</div>
                      </div>
                      {result.stderr && (
                        <div className="row">
                          <hr />
                          <div className="text-danger lead my-2">
                            Hibakimenet
                          </div>
                          <div>{formatOutput(result.stderr)}</div>
                        </div>
                      )}
                      <div
                        className={`row${
                          result.code !== 0 ? ' text-danger' : ''
                        }`}
                      >
                        <hr />
                        <div className="mt-2">Kilépőkód: {result.code}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="row justify-content-center">
            <div className="col col-4 col-md-2">
              <button
                className="form-control btn btn-dark border-secondary mt-2"
                onClick={
                  mode === EditorModes.EXAM ? handleSubmitExam : handleSubmit
                }
              >
                Beküldés
              </button>
            </div>
            {mode === EditorModes.EXAM && (
              <Fragment>
                <div className="col col-4 col-md-2">
                  <button
                    onClick={handleFinish}
                    className="form-control btn btn-dark border-danger mt-2"
                  >
                    Vizsga befejezése
                  </button>
                </div>
              </Fragment>
            )}
            {mode === EditorModes.PRACTICE && (
              <div className="col col-4 col-md-2">
                <button
                  onClick={handleNext}
                  className="form-control btn btn-dark border-secondary mt-2"
                >
                  Következő feladat
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
      {examDetails && (
        <Fragment>
          <div className="row p-2 exam-tasks">
            {new Array(examDetails.taskCount).fill('').map((_, index) => (
              <div className="col" key={index}>
                <button
                  className={`btn btn-dark ${
                    examDetails.successes[index]
                      ? 'border-success'
                      : 'border-secondary'
                  } w-100 mb-2`}
                  onClick={() => selectExamTask(index)}
                  disabled={index === examDetails.activeTask}
                >
                  {index + 1}
                </button>
              </div>
            ))}
          </div>
          <div className="row exam-end-time">
            Vizsga vége: {mapDateFromMs(examDetails.finishTime)}
          </div>
        </Fragment>
      )}
    </div>
  );
};

export default Editor;
export { formatTaskDescription };
