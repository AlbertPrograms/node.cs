import React from 'react';
import { Link } from 'react-router-dom';
import { UserData } from '../../App';

type HeaderProps = UserData & {
  logout: () => void;
};

const Header: React.FC<HeaderProps> = ({ name, isAdmin, isTeacher, logout }) => {
  return (
    <header
      className="navbar bg-primary bg-gradient mb-4 pt-2 py-md-0"
      id="header"
    >
      <nav
        className="container-xxl flex-wrap flex-md-nowrap"
        aria-label="Main navigation"
      >
        <ul className="navbar-nav flex-row flex-wrap bd-navbar-nav">
          <li className="nav-item pe-2">
            <Link className="nav-link text-light" to="/practice">
              Gyakorlás
            </Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link text-light" to="/exam">
              Vizsgázás
            </Link>
          </li>
        </ul>
        <ul className="navbar-nav flex-row flex-wrap bd-navbar-nav">
          <li className="nav-item p-2 pe-3 text-dark">
            {name && <span>Üdv, {name}</span>}
          </li>
          <li className="nav-item pe-2">
            <Link className="nav-link text-light" to="/profile">
              Profil
            </Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link text-light" to="/" onClick={() => logout()}>
              Kijelentkezés
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
