import { ChangeEventHandler, FormEventHandler, useState } from 'react';
import './Editor.css';

interface EditorProps {
  height: number;
}

interface TaskResponse {
  task: string;
  token: string;
}

const getRowsByHeight = (height: number) => {
  return Math.floor(height / 25) - 8;
};

const Editor: React.FC<EditorProps> = ({ height }) => {
  const [task, setTask] = useState<string>();
  const [code, setCode] = useState<string>();
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

  const handleSubmit: FormEventHandler = (event) => {
    event.preventDefault();

    fetch('/submit-task', {
      method: 'POST',
      body: JSON.stringify({
        token,
        code,
      }),
    })
      .then((res) => res.json())
      .then((r: TaskResponse) => {
        setTask(r.task);
        token = r.token;
      });
  };

  return (
    <div className="container d-flex vh-100">
      <div className="row w-100 justify-content-center align-self-center">
        {task ? task : ''}
        <form method="post" onSubmit={handleSubmit}>
          <textarea
            rows={getRowsByHeight(height)}
            name="code"
            className="form-control"
            onChange={handleTextareaChange}
          />
          <div className="row justify-content-center">
            <div className="col col-4 col-md-2">
              <button className="form-control btn">Beküldés</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Editor;
