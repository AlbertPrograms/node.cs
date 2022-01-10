import React, { useEffect, useState } from 'react';
import { UserData } from '../../App';
import { TokenString } from '../../util/useToken';

interface ProfileParams {
  token: TokenString;
  userData: UserData;
}

const Profile: React.FC<ProfileParams> = ({ token, userData }) => {
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [pwStrength, setPwStrength] = useState(0);

  // https://www.section.io/engineering-education/password-strength-checker-javascript/
  useEffect(() => {
    if (
      /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{8,})/.test(newPw)
    ) {
      setPwStrength(3);
    } else if (
      /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9])(?=.{6,})/.test(
        newPw
      ) ||
      /(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])(?=.{8,})/.test(newPw)
    ) {
      setPwStrength(2);
    } else {
      setPwStrength(1);
    }
  }, [newPw]);

  const changePw = () => {
    fetch('/change-password', {
      method: 'POST',
      body: JSON.stringify({
        sessionTokenString: token,
        oldPw,
        newPw,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }

        setOldPw('');
        setNewPw('');
        setNewPwConfirm('');
        window.alert('Sikeres jelszóváltoztatás');
      })
      .catch((e) => {
        window.alert('Hiba történt a jelszóváltoztatás közben');
        console.error(e);
      });
  };

  return (
    <div className="row w-100">
      <div className="col-12 col-md-6 col-xl-3">
        <div className="card bg-dark border-secondary">
          <div className="card-header border-secondary d-flex justify-content-between align-items-center">
            <div>{userData.username}</div>
          </div>
          <div className="card-body">
            <div className="text-light mb-2">Név: {userData.name}</div>
            <div className="text-light mb-2">E-mail: {userData.email}</div>
            <div className="text-light mb-2">
              Születési dátum: {userData.birthday}
            </div>
            {!!userData.isAdmin && (
              <div className="text-light mb-2">Adminisztrátor</div>
            )}
            {!!userData.isTeacher && (
              <div className="text-light mb-2">Tanár</div>
            )}

            <div className="text-light mb-2">Jelszóváltoztatás</div>
            <input
              type="password"
              className="form-control bg-dark text-light mt-3"
              placeholder="Régi jelszó"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
            />
            <input
              type="password"
              className="form-control bg-dark text-light mt-3"
              placeholder="Új jelszó"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
            <input
              type="password"
              className="form-control bg-dark text-light mt-3"
              placeholder="Új jelszó megerősítése"
              value={newPwConfirm}
              onChange={(e) => setNewPwConfirm(e.target.value)}
            />
            {!!newPw.length && newPw.length < 6 && (
              <p className="text-danger py-2 m-0">
                A jelszó legalább hat karakter hosszú kell, hogy legyen
              </p>
            )}
            {!!newPw.length && newPw !== newPwConfirm && (
              <p className="text-danger py-2 m-0">
                A megadott jelszavak nem egyeznek
              </p>
            )}
            {!!newPw.length && newPw.length >= 6 && (
              <div className="mt-2">
                {pwStrength === 3 && (
                  <label className="text-success">Erős jelszó</label>
                )}
                {pwStrength === 2 && (
                  <label className="text-warning">Közepes jelszó</label>
                )}
                {pwStrength === 1 && (
                  <label className="text-danger">Gyenge jelszó</label>
                )}
              </div>
            )}

            <button
              className="btn btn-dark border-secondary mt-3 w-100"
              onClick={() => changePw()}
              disabled={
                !newPw.length || newPw.length < 6 || newPw !== newPwConfirm
              }
            >
              Jelszóváltoztatás
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
