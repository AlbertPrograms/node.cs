import React, { useEffect, useState } from 'react';
import { TokenString } from '../../util/useToken';

interface ExamProps {
  token: TokenString;
}

interface ExamResponse {
  id: number;
  name: string;
  startMin: number;
  startMax: number;
  duration: number;
  registered: boolean;
  canRegister: boolean;
  canUnregister: boolean;
}

const mapDateFromMs = (ms: number) => {
  const pad = (number: number) => `${number < 10 ? '0' : ''}${number}`;

  const date = new Date(ms);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const Exam: React.FC<ExamProps> = ({ token }) => {
  const [exams, setExams] = useState<ExamResponse[]>([]);
  const [refreshNeeded, setRefreshNeeded] = useState(true);

  const getCardClass = ({ registered }: ExamResponse) => {
    return `card bg-dark ${registered ? 'border-success' : 'border-secondary'}`;
  };

  useEffect(() => {
    if (!refreshNeeded) {
      return;
    }

    fetch('/get-available-exams', {
      method: 'POST',
      body: JSON.stringify({
        sessionTokenString: token,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then(setExams)
      .then(() => {
        setRefreshNeeded(false);
      });
  }, [token, refreshNeeded]);

  const register = ({ id }: ExamResponse) => {
    if (
      !window.confirm(
        'Biztosan jelentkezik erre a vizsgára? Ez 36 órával a kezdés előbb már nem visszavonható.'
      )
    ) {
      return;
    }

    fetch('/exam-registration', {
      method: 'POST',
      body: JSON.stringify({
        sessionTokenString: token,
        id,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }

        setRefreshNeeded(true);
      })
      .catch((e) => {
        window.alert('Hiba történt a vizsgajelentkezés közben');
        console.error(e);
      });
  };

  const unregister = ({ id }: ExamResponse) => {
    if (
      !window.confirm(
        'Biztosan lejelentkezik erről a vizsgáról?'
      )
    ) {
      return;
    }

    fetch('/exam-unregistration', {
      method: 'POST',
      body: JSON.stringify({
        sessionTokenString: token,
        id,
      }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }

        setRefreshNeeded(true);
      })
      .catch((e) => {
        window.alert('Hiba történt a vizsgalejelentkezés közben');
        console.error(e);
      });
  };

  return (
    <div className="row w-100">
      {exams.map((exam) => {
        return (
          <div className="col-6 col-md-4 col-lg-3" key={exam.id}>
            <div className={getCardClass(exam)}>
              <div className="card-header border-secondary d-flex justify-content-between align-items-center">
                <div>{exam.name}</div>
                {exam.registered && exam.canUnregister ? (
                  <div>
                    <button
                      className="btn btn-dark border-danger text-light"
                      onClick={() => unregister(exam)}
                    >
                      Lejelentkezés
                    </button>
                  </div>
                ) : !exam.registered && exam.canRegister ? (
                  <div>
                    <button
                      className="btn btn-dark border-secondary text-light"
                      onClick={() => register(exam)}
                    >
                      Jelentkezés
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="card-body">
                <div className="text-light mb-2">
                  Időpont: {mapDateFromMs(exam.startMin)}
                </div>
                <div className="text-light mb-2">
                  Legkésőbbi kezdés: {mapDateFromMs(exam.startMax)}
                </div>
                <div className="text-light mb-2">
                  Időtartam: {exam.duration} perc
                </div>
                {exam.registered && (
                  <div className="text-light mb-2">
                    Ön már jelentkezett erre a vizsgára.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Exam;
