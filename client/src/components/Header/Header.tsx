import React, { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserData } from '../../App';
import './Header.css';

type HeaderProps = UserData & {
  logout: () => void;
};

const Header: React.FC<HeaderProps> = ({
  name,
  isAdmin,
  isTeacher,
  logout,
}) => {
  const [active, setActive] = useState<string>();

  useEffect(() => {
    const splitUrl = window.location.href.split('/');
    setActive(splitUrl[splitUrl.length - 1]);
  }, []);

  const getLinkClass = (active: boolean) =>
    active ? 'nav-link active' : 'nav-link';

  const getLinkAttributes = (to: string) => ({
    className: getLinkClass(to === active),
    to: `/${to}`,
    onClick: () => {
      console.log(active);
      setActive(to);
    },
  });

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
          {!isTeacher && !isAdmin ? (
            <Fragment>
              <li className="nav-item pe-2">
                <Link {...getLinkAttributes('practice')}>
                  Gyakorlás
                </Link>
              </li>
              <li className="nav-item pe-2">
                <Link {...getLinkAttributes('exam')}>
                  Vizsgázás
                </Link>
              </li>
            </Fragment>
          ) : (
            <Fragment>
              <li className="nav-item pe-2">
                <Link {...getLinkAttributes('practice')}>
                  Feladatpróba
                </Link>
              </li>
              <li className="nav-item pe-2">
                <Link {...getLinkAttributes('schedule')}>
                  Vizsgáztatás
                </Link>
              </li>
              <li className="nav-item pe-2">
                <Link {...getLinkAttributes('tasks')}>
                  Feladatok
                </Link>
              </li>
            </Fragment>
          )}
          {isAdmin && (
            <li className="nav-item pe-2">
              <Link {...getLinkAttributes('users')}>
                Felhasználók
              </Link>
            </li>
          )}
        </ul>
        <ul className="navbar-nav flex-row flex-wrap bd-navbar-nav">
          <li className="nav-item p-2 pe-3 text-dark">
            {name && <span>Üdv, {name}</span>}
          </li>
          <li className="nav-item pe-2">
            <Link {...getLinkAttributes('profile')}>
              Profil
            </Link>
          </li>
          <li className="nav-item">
            <Link className="nav-link" to="/" onClick={() => logout()}>
              Kijelentkezés
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
