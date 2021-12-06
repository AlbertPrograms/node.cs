import React from 'react';
import { UserToken } from '../../util/useToken';

interface LoginProps {
  setToken: (token: UserToken) => void;
}

const Login: React.FC<LoginProps> = ({ setToken }) => (
  <div className="container d-flex vh-100">
    <div className="row justify-content-center align-self-center w-100">
      <div className="col-6 col-md-4 col-lg-3 col-xl-2">
        <h3 className="mb-5 text-center">Bejelentkezés</h3>
        <form className="form-group row justify-content-center" action="/auth">
          <label className="text-light text-center" htmlFor="username">Felhasználónév</label>
          <input className="form-control bg-dark text-light m-2" name="username" />
          <label className="text-light text-center" htmlFor="password">Jelszó</label>
          <input className="form-control bg-dark text-light m-2" type="password" name="password" />
          <button className="btn btn-dark m-2" type="submit">Bejelentkezés</button>
          <button className="btn btn-dark m-2 d-none" disabled>
            <span className="spinner-border spinner-border-sm"></span>&nbsp;Folyamatban...
          </button>
          <small className="d-none text-success text-center">Sikeres belépés! Hamarosan továbbítunk...</small>
          <small className="d-none text-danger text-center">Sikertelen belépés</small>
        </form>
      </div>
    </div>
  </div>
);

export default Login;