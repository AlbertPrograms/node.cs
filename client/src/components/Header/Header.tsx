import React, { Fragment, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
  const [active, setActive] = useState('');
  const location = useLocation();

  useEffect(() => {
    const splitUrl = location.pathname.split('/');
    setActive(splitUrl[splitUrl.length - 1].split('?')[0]);
  }, [location]);

  const getLinkClass = (active: boolean) =>
    active ? 'nav-link active' : 'nav-link';

  const getLinkAttributes = (to: string, aliases?: string[]) => ({
    className: getLinkClass(
      to === active || (!!aliases && aliases.includes(active))
    ),
    to: `/${to}`,
    onClick: () => {
      setActive(to);
    },
  });

  return (
    <header className="navbar bg-primary pt-2 py-md-0" id="header">
      <nav
        className="container-xxl flex-wrap flex-md-nowrap"
        aria-label="Main navigation"
      >
        <ul className="navbar-nav flex-row flex-wrap bd-navbar-nav">
          {!isTeacher && !isAdmin ? (
            <Fragment>
              <li className="nav-item pe-2">
                <Link {...getLinkAttributes('practice')}>Gyakorlás</Link>
              </li>
              <li className="nav-item pe-2">
                <Link {...getLinkAttributes('exam')}>Vizsgázás</Link>
              </li>
            </Fragment>
          ) : (
            <Fragment>
              <li className="nav-item pe-2">
                <Link {...getLinkAttributes('practice', ['task-test'])}>Feladatpróba</Link>
              </li>
              <li className="nav-item pe-2">
                <Link {...getLinkAttributes('schedule')}>Vizsgáztatás</Link>
              </li>
              <li className="nav-item pe-2">
                <Link {...getLinkAttributes('tasks')}>Feladatok</Link>
              </li>
            </Fragment>
          )}
          {isAdmin && (
            <li className="nav-item pe-2">
              <Link {...getLinkAttributes('users')}>Felhasználók</Link>
            </li>
          )}
        </ul>
        <ul className="navbar-nav flex-row flex-wrap bd-navbar-nav">
          <li className="nav-item p-2 pe-3 text-dark">
            {name && <span>Üdv, {name}</span>}
          </li>
          <li className="nav-item pe-2">
            <Link {...getLinkAttributes('profile')}>Profil</Link>
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
