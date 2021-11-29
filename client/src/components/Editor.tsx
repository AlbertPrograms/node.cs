import {
  ChangeEventHandler,
  MouseEventHandler,
  FormEventHandler,
  useState,
} from 'react';
import './Editor.css';

interface EditorProps {
  height: number;
}

interface TaskResponse {
  task: string;
  token: string;
}

interface ExecutionResult {
  code: number;
  args?: string;
  stdout: string;
  stderr: string;
}

interface SubmitResponse {
  results: ExecutionResult[];
  success: boolean;
}

const getRowsByHeight = (height: number) => {
  return Math.floor(height / 25) - 8;
};

const Editor: React.FC<EditorProps> = ({ height }) => {
  const [task, setTask] = useState<string>();
  const [code, setCode] = useState<string>();
  const [submitResponse, setSubmitResponse] = useState<SubmitResponse>(); // TODO
  let token: string;

  fetch('/get-task')
    .then((res) => res.json())
    .then((r: TaskResponse) => {
      setTask(r.task);
      token = r.token;
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
  // TODO store progress on BE every couple of seconds with useEffect
  const handleSubmit: FormEventHandler = (event) => {
    event.preventDefault();
    console.log(token);

    fetch('/submit-task', {
      method: 'POST',
      body: JSON.stringify({
        token,
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

  // TODO monospace ``
  return (
    <div className="container d-flex vh-100">
      <div className="row w-100 justify-content-center align-self-center">
        <h4>{task ? task : ''}</h4>
        <form method="post" onSubmit={handleSubmit}>
          <div className="row">
            <div className={`col ${submitResponse ? 'col-6' : 'col-12'}`}>
              <textarea
                rows={getRowsByHeight(height)}
                name="code"
                className="form-control h-100 bg-dark text-light font-monospace"
                onChange={handleTextareaChange}
                spellCheck={false}
              />
            </div>
            {submitResponse && (
              <div className="col col-6">
                <div className="card h-100 bg-dark border-light px-3 py-1 font-monospace">
                  {submitResponse.results.map((result) => (
                    <div>
                      {result.args && <div className="row">
                        <div className="lead mb-2">Futtatási argumentumok</div>
                        <div>{result.args}</div>
                      </div>}
                      <div className="row">
                        <div className="lead mb-2">Kimenet</div>
                        <div>{result.stdout}</div>
                      </div>
                      {result.stderr && (
                        <div className="row">
                          <hr />
                          <div className="text-danger lead my-2">
                            Hibakimenet
                          </div>
                          <div>{result.stderr}</div>
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
