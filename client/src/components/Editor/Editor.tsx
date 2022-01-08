import React, {
  ChangeEventHandler,
  MouseEventHandler,
  FormEventHandler,
  useState,
  useEffect,
  ReactElement,
  KeyboardEventHandler,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import useToken, { TokenString } from '../../util/useToken';
import './Editor.css';

export const enum EditorModes {
  EXAM,
  PRACTICE,
  TESTING,
}

interface EditorParams {
  mode: EditorModes;
  token: TokenString;
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

const Editor: React.FC<EditorParams> = ({ mode, token }) => {
  const [task, setTask] = useState<string>();
  const [code, setCode] = useState('');
  const [submitResponse, setSubmitResponse] = useState<SubmitResponse>(); // TODO
  const [height, setHeight] = useState(window.innerHeight);
  const [practiceTaskToken, setPracticeTaskToken] = useToken('practiceTask');
  const [examTaskToken, setExamTaskToken] = useToken('examTask');

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

  // Task fetch on load and mode change
  useEffect(() => {
    const taskId = searchParams.get('taskId') as string;

    let body: any = { sessionTokenString: token, mode };
    switch (mode) {
      case EditorModes.PRACTICE:
        body.taskToken = practiceTaskToken;
        break;
      case EditorModes.EXAM:
        body.taskToken = examTaskToken;
        break;
      case EditorModes.TESTING:
        body.taskId = parseInt(taskId);
    }

    fetch('/get-task', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }

        return res;
      })
      .then((res) => res.json())
      .then((res: TaskResponse) => {
        setTask(res.task);
        if (mode === EditorModes.PRACTICE) {
          setPracticeTaskToken(res.token);
        } else if (mode === EditorModes.EXAM) {
          setExamTaskToken(res.token);
        }

        if (res.code) {
          setCode(res.code);
        }
      })
      .catch((e) => {
        window.alert('Hiba történt a feladat betöltése közben');
        console.error(e);
      });
    // Eslint doesn't mix well with custom hook setters. :/
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, token, practiceTaskToken, examTaskToken, searchParams]);

  // Sync code every 5s
  useEffect(() => {
    if (mode === EditorModes.TESTING) {
      return;
    }

    const taskToken =
      mode === EditorModes.PRACTICE ? practiceTaskToken : examTaskToken;

    const interval = window.setInterval(() => {
      fetch('/store-task-progress', {
        method: 'POST',
        body: JSON.stringify({ sessionTokenString: token, taskToken, code }),
        headers: { 'Content-Type': 'application/json' },
      });
    }, 5000);

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
        lastLine[lastLine.length - 1] === '{'
          ? 2
          : 0;
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

  const handleSubmitError = (res: SubmitResponse) => {
    setSubmitResponse(res);
  };

  const handleSubmitSuccess = (res: SubmitResponse) => {
    setSubmitResponse(res);
  };

  // TODO cookie token as session
  // TODO store progress on BE every couple of seconds with useEffect (save text from textarea and send that)
  // also typed in code! losing this stuff sucks
  const handleSubmit: FormEventHandler = (event) => {
    event.preventDefault();

    fetch('/submit-task', {
      method: 'POST',
      body: JSON.stringify({
        sessionTokenString: token,
        token: practiceTaskToken,
        code,
      }),
      headers: { 'Content-Type': 'application/json' },
    }).then(async (res) => {
      const response = (await res.json()) as SubmitResponse;
      if (!res.status.toString().startsWith('2') || !response.success) {
        handleSubmitError(response);
      } else {
        handleSubmitSuccess(response);
      }
    });
  };

  const handleNext: MouseEventHandler = (event) => {
    event.preventDefault();
  };

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

  const formatOutput = (text: string): string => {
    return text.split('\n').join('<br />');
  };

  // TODO tab -> 2/4 spaces
  // TODO select task by id if teach/admin
  return (
    <div className="container d-flex">
      <div className="row w-100 justify-content-center align-self-center">
        <h4>{task ? formatTaskDescription(task) : ''}</h4>
        <form method="post" onSubmit={handleSubmit}>
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
              <button className="form-control btn btn-dark mt-2">
                Beküldés
              </button>
            </div>
            {submitResponse?.success && (
              <div className="col col-4 col-md-2">
                <button
                  onClick={handleNext}
                  className="form-control btn btn-dark mt-2"
                >
                  Továbblépés
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Editor;
