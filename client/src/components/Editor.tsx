import './Editor.css';

interface EditorProps {
  height: number;
}

const getRowsByHeight = (height: number) => {
  return Math.floor(height / 25) - 8;
};

const Editor: React.FC<EditorProps> = ({ height }) => (
  <div className="container d-flex vh-100">
    <div className="row w-100 justify-content-center align-self-center">
      <form method="post" action="/compile">
        <textarea rows={getRowsByHeight(height)} name="code" className="form-control" />
        <div className="row justify-content-center">
          <div className="col col-4 col-md-2">
            <button className="form-control btn">Beküldés</button>
          </div>
        </div>
      </form>
    </div>
  </div>
);

export default Editor;
