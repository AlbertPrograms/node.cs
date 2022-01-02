import React, {
  ChangeEventHandler,
  MouseEventHandler,
  FormEventHandler,
  useState,
  useEffect,
  ReactElement,
} from 'react';
import './Editor.css';

export const enum EditorModes {
  EXAM,
  PRACTICE,
}

interface EditorParams {
  mode: EditorModes;
}

interface TaskResponse {
  task: string;
  token: string;
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

const Editor: React.FC<EditorParams> = ({ mode }) => {
  const [task, setTask] = useState<string>();
  const [code, setCode] = useState<string>();
  const [submitResponse, setSubmitResponse] = useState<SubmitResponse>(); // TODO
  const [height, setHeight] = useState(window.innerHeight);
  const rowStyle = { height: `${height - 202}px` };
  let taskToken: string;

  useEffect(() => {
    function handleResize() {
      setHeight(window.innerHeight);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  fetch('/get-task')
    .then((res) => res.json())
    .then((r: TaskResponse) => {
      setTask(r.task);
      taskToken = r.token;
    });

  const handleTextareaChange: ChangeEventHandler = (event) => {
    const textarea: HTMLTextAreaElement = event.target as HTMLTextAreaElement;
    setCode(textarea.value);
  };

  const handleSubmitError = (res: SubmitResponse) => {
    console.log(res);
    setSubmitResponse(res);
  };

  const handleSubmitSuccess = (res: SubmitResponse) => {
    console.log(res);
    setSubmitResponse(res);
  };

  // TODO cookie token as session
  // TODO store progress on BE every couple of seconds with useEffect (save text from textarea and send that)
  // also typed in code! losing this stuff sucks
  const handleSubmit: FormEventHandler = (event) => {
    event.preventDefault();
    console.log(taskToken);

    fetch('/submit-task', {
      method: 'POST',
      body: JSON.stringify({ token: taskToken, code }),
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
                onChange={handleTextareaChange}
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
