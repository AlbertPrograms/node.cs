import React, { ChangeEvent, FormEvent } from 'react';
import { UserToken } from '../../util/useToken';

interface LoginProps {
  setToken: (token: UserToken) => void;
}

const Login: React.FC<LoginProps> = ({ setToken }) => {
  let username: string;
  let password: string;

  const handleChangeUsername = (event: ChangeEvent): void => {
    username = (event.target as HTMLInputElement).value;
  };

  const handleChangePassword = (event: ChangeEvent): void => {
    password = (event.target as HTMLInputElement).value;
  };

  const handleSubmit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();

    fetch('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      headers: { 'Content-Type': 'application/json', },
    });
  };

  return (
    <div className="container d-flex vh-100">
      <div className="row justify-content-center align-self-center w-100">
        <div className="col-6 col-md-4 col-lg-3 col-xl-2">
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
            <button className="btn btn-dark m-2" type="submit">
              Bejelentkezés
            </button>
            <button className="btn btn-dark m-2 d-none" disabled>
              <span className="spinner-border spinner-border-sm"></span>
              &nbsp;Folyamatban...
            </button>
            <small className="d-none text-success text-center">
              Sikeres belépés! Hamarosan továbbítunk...
            </small>
            <small className="d-none text-danger text-center">
              Sikertelen belépés
            </small>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
