import React, { ChangeEvent, FormEvent, useState } from 'react';
import { TokenString } from '../../util/useToken';

interface LoginProps {
  setToken: (token: TokenString) => void;
}

interface LoginResponseBody {
  sessionTokenString: TokenString;
}

const Login: React.FC<LoginProps> = ({ setToken }) => {
  const [username, setUsername] = useState<string>();
  const [password, setPassword] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [fail, setFail] = useState(false);

  const handleChangeUsername = (event: ChangeEvent): void => {
    setUsername((event.target as HTMLInputElement).value);
  };

  const handleChangePassword = (event: ChangeEvent): void => {
    setPassword((event.target as HTMLInputElement).value);
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);

    fetch('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        setSubmitting(false);
        if (res.status !== 200) {
          throw new Error();
        }

        setFail(false);

        const response: LoginResponseBody = await res.json();
        setToken(response.sessionTokenString);
      })
      .catch((e) => {
        setSubmitting(false);
        setFail(true);
        console.error(e);
      });
  };

  return (
    <div className="container d-flex vh-100">
      <div className="row justify-content-center align-self-center w-100">
        <div className="col-12 col-md-6 col-xl-3 col-xl-2">
          <h3 className="mb-5 text-center">Bejelentkezés</h3>
          <form
            className="form-group row justify-content-center"
            action="/auth"
            method="POST"
            onSubmit={handleSubmit}
          >
            <label className="text-light text-center" htmlFor="username">
              Felhasználónév
            </label>
            <input
              className="form-control bg-dark text-light m-2"
              name="username"
              onChange={handleChangeUsername}
            />

            <label className="text-light text-center" htmlFor="password">
              Jelszó
            </label>
            <input
              className="form-control bg-dark text-light m-2"
              type="password"
              name="password"
              onChange={handleChangePassword}
            />

            <button className="btn btn-dark border-secondary m-2" type="submit">
              {!submitting ? (
                <span>Bejelentkezés</span>
              ) : (
                <span>
                  <span className="spinner-border spinner-border-sm"></span>
                  &nbsp;Folyamatban...
                </span>
              )}
            </button>

            {fail && (
              <small className="text-danger text-center">
                Sikertelen belépés
              </small>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
