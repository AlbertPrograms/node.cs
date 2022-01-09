import React, { ChangeEvent, useEffect, useState } from 'react';
import { TokenString } from '../../util/useToken';

interface Exam {
  id: number;
  name: string;
  startMin: number;
  startMax: number;
  duration: number;
  students: string[]; // usernames
}

interface EditorExam {
  id: number;
  name: string;
  startMin: string;
  startMax: string;
  duration: string;
  students: string[];
  existing: boolean;
  dirty: boolean;
}

interface ExamsParams {
  token: TokenString;
}

const mapDateFromMs = (ms: number) => {
  const pad = (number: number) => `${number < 10 ? '0' : ''}${number}`;

  const date = new Date(ms);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate() + 1);
  const hour = pad(date.getHours() + 1);
  const minute = pad(date.getMinutes() + 1);
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

const Exams: React.FC<ExamsParams> = ({ token }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [editedExams, setEditedExams] = useState<EditorExam[]>([]);
  const [missingNames, setMissingNames] = useState<Boolean[]>([]);
  const [missingStartMins, setMissingStartMins] = useState<Boolean[]>([]);
  const [missingStartMaxes, setMissingStartMaxes] = useState<Boolean[]>([]);
  const [missingDurations, setMissingDurations] = useState<Boolean[]>([]);
  const [startMinErrors, setSetStartMinErrors] = useState<Boolean[]>([]);
  const [startMaxErrors, setStartMaxErrors] = useState<Boolean[]>([]);
  const [startMaxEarlyErrors, setStartMaxEarlyErrors] = useState<Boolean[]>([]);
  const [durationErrors, setDurationErrors] = useState<Boolean[]>([]);
  const [errors, setErrors] = useState(false);
  const [lastEditedElement, setLastEditedElement] =
    useState<HTMLInputElement>();
  const [refreshNeeded, setRefreshNeeded] = useState(true);
  const [canSave, setCanSave] = useState(false);

  // Exam getter
  useEffect(() => {
    if (!refreshNeeded) {
      return;
    }

    fetch('/get-exams', {
      method: 'POST',
      body: JSON.stringify({ sessionTokenString: token }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then(setExams)
      .then(() => {
        setRefreshNeeded(false);
      });
  }, [token, refreshNeeded]);

  // Edited exam mapping from base exams
  useEffect(() => {
    setEditedExams(
      exams.map((exam) => ({
        ...exam,
        startMin: mapDateFromMs(exam.startMin),
        startMax: mapDateFromMs(exam.startMax),
        duration: `${exam.duration}`,
        existing: true,
        dirty: false,
      }))
    );
  }, [exams]);

  // Error mapping
  useEffect(() => {
    const testDateStringValid = (dateString: string) =>
      /^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}$/.test(dateString) &&
      !isNaN(new Date(dateString).getTime());
    const testDuration = (durationString: string) => {
      if (/^[0-9]+$/.test(durationString)) {
        return false;
      }

      const duration = parseInt(durationString);
      return duration >= 15 && duration <= 150;
    };
    const testStartMaxEarly = (startMin: string, startMax: string) => {
      return new Date(startMin).getTime() - new Date(startMax).getTime() > 0;
    };

    setMissingNames(editedExams.map((exam) => !exam.name.length));
    setMissingStartMins(editedExams.map((exam) => !exam.startMin.length));
    setMissingStartMaxes(editedExams.map((exam) => !exam.startMax.length));
    setMissingDurations(editedExams.map((exam) => !exam.duration.length));
    setSetStartMinErrors(
      editedExams.map((exam) => !testDateStringValid(exam.startMin))
    );
    setStartMaxErrors(
      editedExams.map((exam) => !testDateStringValid(exam.startMax))
    );
    setStartMaxEarlyErrors(
      editedExams.map((exam) => testStartMaxEarly(exam.startMin, exam.startMax))
    );
    setDurationErrors(editedExams.map((exam) => testDuration(exam.duration)));
  }, [editedExams]);

  // Dirty calc
  useEffect(() => {
    setCanSave(editedExams.some((exam) => exam.dirty));
  }, [editedExams]);

  // Error calc
  useEffect(() => {
    setErrors(
      missingNames.some(Boolean) ||
        missingStartMins.some(Boolean) ||
        missingStartMaxes.some(Boolean) ||
        missingDurations.some(Boolean) ||
        startMaxErrors.some(Boolean) ||
        startMinErrors.some(Boolean) ||
        startMaxEarlyErrors.some(Boolean) ||
        durationErrors.some(Boolean)
    );
  }, [
    missingNames,
    missingStartMins,
    missingStartMaxes,
    missingDurations,
    startMaxErrors,
    startMinErrors,
    startMaxEarlyErrors,
    durationErrors,
  ]);

  // Empty line removal
  useEffect(() => {
    if (!editedExams.some((exam) => !exam.students.every(Boolean))) {
      // Do nothing if there's no empty element in any student array of the exams
      return;
    }

    if (lastEditedElement) {
      const elemToSelect = (lastEditedElement?.previousElementSibling ??
        lastEditedElement?.nextElementSibling) as HTMLInputElement;
      elemToSelect.focus();
    }

    const newEditedExams = editedExams.map((exam) => {
      const students = exam.students.filter(Boolean);

      return { ...exam, students };
    });

    setEditedExams(newEditedExams);
  }, [editedExams, lastEditedElement]);

  const handleChange =
    (examId: number, field: keyof Exam, fieldId?: number) =>
    (e: ChangeEvent) => {
      const elem = e.target as HTMLInputElement;
      const newValue = elem.value;

      setLastEditedElement(elem);

      if (!Array.isArray(editedExams)) {
        return;
      }

      const newEditedExams = JSON.parse(JSON.stringify(editedExams));

      if (fieldId !== undefined) {
        newEditedExams[examId][field][fieldId] = newValue;
      } else {
        newEditedExams[examId][field] = newValue;
      }
      newEditedExams[examId].dirty = true;

      setEditedExams(newEditedExams);
    };

  const addEntry = (examId: number, field: keyof Exam) => (e: ChangeEvent) => {
    const elem = e.target as HTMLInputElement;
    const newValue = elem.value;

    const newEditedExams = JSON.parse(JSON.stringify(editedExams));

    newEditedExams[examId][field].push(newValue);
    newEditedExams[examId].dirty = true;

    setEditedExams(newEditedExams);

    window.setTimeout(() => {
      const previousInputOrTextarea = e.target.previousElementSibling as
        | HTMLInputElement
        | HTMLTextAreaElement;
      previousInputOrTextarea.focus();
      previousInputOrTextarea.setSelectionRange(1, 1);
    }, 0);
  };

  const getNewEditorExam = (): EditorExam => ({
    id: Math.max(...editedExams.map((exam) => exam.id), -1) + 1,
    name: '',
    startMin: '',
    startMax: '',
    duration: '',
    students: [],
    existing: false,
    dirty: true,
  });

  const addExam = () => {
    const newEditedExam = getNewEditorExam();
    const newEditedExams = JSON.parse(JSON.stringify(editedExams));
    newEditedExams.push(newEditedExam);

    setEditedExams(newEditedExams);
  };

  const deleteExam = ({ id, existing }: EditorExam) => {
    if (!existing) {
      // If the exam doesn't exist yet, just remove the card
      const newEditedExams = JSON.parse(JSON.stringify(editedExams));
      const examIndex = editedExams.findIndex((exam) => exam.id === id);
      newEditedExams.splice(examIndex, 1);

      setEditedExams(newEditedExams);
      return;
    }

    if (!window.confirm(`Biztosan törölni kívánja a ${id}. vizsgát?`)) {
      return;
    }

    fetch('/delete-exam', {
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
        window.alert('Hiba történt a törlés közben');
        console.error(e);
      });
  };

  const save = () => {
    if (errors) {
      return;
    }

    const examsToSave: Exam[] = editedExams.map((exam) => ({
      ...exam,
      startMin: new Date(exam.startMin).getTime(),
      startMax: new Date(exam.startMax).getTime(),
      duration: parseInt(exam.duration),
    }));

    fetch('/save-exams', {
      method: 'POST',
      body: JSON.stringify({ sessionTokenString: token, exams: examsToSave }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => {
        if (res.status !== 200) {
          throw new Error();
        }

        setRefreshNeeded(true);
      })
      .catch((e) => {
        window.alert('Hiba történt a mentés közben');
        console.error(e);
      });
  };

  const cancel = () => {
    setRefreshNeeded(true);
  };

  const getCardClass = ({ existing }: EditorExam) => {
    return `card bg-dark ${existing ? 'border-secondary' : 'border-warning'}`;
  };

  return (
    <div className="row w-100">
      {editedExams.map((exam, index) => {
        return (
          <div className="col-6 col-md-4 col-lg-3" key={exam.id}>
            <div className={getCardClass(exam)}>
              <div className="card-header border-secondary d-flex justify-content-between align-items-center">
                <div
                  className={exam.dirty && exam.existing ? 'text-warning' : ''}
                >
                  Vizsga #{exam.id}
                  {exam.dirty && exam.existing && ' (*)'}
                </div>
                <div>
                  <button
                    className="btn btn-dark border-secondary text-danger"
                    onClick={() => deleteExam(exam)}
                  >
                    Vizsga törlése
                  </button>
                </div>
              </div>
              <div className="card-body">
                <label className="text-light text-center mb-2">Név</label>
                <input
                  className="form-control bg-dark text-light"
                  value={exam.name}
                  onChange={handleChange(index, 'name')}
                />
                {missingNames[index] && (
                  <p className="text-danger py-2 m-0">A név nem lehet üres.</p>
                )}

                <label className="text-light text-center my-2">
                  Kezdés leghamarabb (ÉÉÉÉ-HH-NN óó:pp)
                </label>
                <input
                  className="form-control bg-dark text-light"
                  value={exam.startMin}
                  onChange={handleChange(index, 'startMin')}
                />
                {missingStartMins[index] ? (
                  <p className="text-danger py-2 m-0">
                    A leghamarabbi kezdés nem lehet üres.
                  </p>
                ) : startMinErrors[index] ? (
                  <p className="text-danger py-2 m-0">
                    A dátum formátuma nem megfelelő.
                  </p>
                ) : null}

                <label className="text-light text-center my-2">
                  Kezdés legkésőbb (ÉÉÉÉ-HH-NN óó:pp)
                </label>
                <input
                  className="form-control bg-dark text-light"
                  value={exam.startMax}
                  onChange={handleChange(index, 'startMax')}
                />
                {missingStartMaxes[index] ? (
                  <p className="text-danger py-2 m-0">
                    A legkésőbbi kezdés nem lehet üres.
                  </p>
                ) : startMaxErrors[index] ? (
                  <p className="text-danger py-2 m-0">
                    A dátum formátuma nem megfelelő.
                  </p>
                ) : startMaxEarlyErrors[index] ? (
                  <p className="text-danger py-2 m-0">
                    A legkésőbbi kezdés dátum nem lehet korábban, mint a
                    legkorábbié.
                  </p>
                ) : null}

                <label className="text-light text-center my-2">
                  Időtartam percben (min. 15, max. 150)
                </label>
                <input
                  className="form-control bg-dark text-light"
                  value={exam.duration}
                  onChange={handleChange(index, 'duration')}
                />
                {missingDurations[index] ? (
                  <p className="text-danger py-2 m-0">
                    Az időtartam nem lehet üres.
                  </p>
                ) : durationErrors[index] ? (
                  <p className="text-danger py-2 m-0">
                    Az időtartam formátuma nem megfelelő.
                  </p>
                ) : null}

                <label className="text-light text-center my-2">
                  Regisztrált tanulók (NEPTUN/EHA kód)
                </label>
                {exam.students.map((student, sIndex) => (
                  <input
                    key={`${sIndex}`}
                    className="form-control bg-dark text-light mb-2"
                    value={student}
                    onChange={handleChange(index, 'students', sIndex)}
                  />
                )) || <br />}
                <input
                  className="form-control bg-dark text-light"
                  value=""
                  placeholder="Új tanuló hozzáadása"
                  onChange={addEntry(index, 'students')}
                />
              </div>
            </div>
          </div>
        );
      })}

      {canSave && (
        <div className="row fixed-bottom p-2">
          <div className="col-2 col-md-3 col-lg-4"></div>
          <div className="col-4 col-md-3 col-lg-2">
            <button
              className="btn btn-dark border-success w-100 me-2"
              onClick={() => save()}
              disabled={errors}
            >
              Mentés
            </button>
          </div>
          <div className="col-4 col-md-3 col-lg-2">
            <button
              className="btn btn-dark border-danger w-100"
              onClick={() => cancel()}
            >
              Mégse
            </button>
          </div>
          <div className="col-2 col-md-3 col-lg-4"></div>
        </div>
      )}
      <div className="col-6 col-md-4 col-lg-3 p-2">
        <button
          className="btn btn-dark border-secondary me-2"
          onClick={() => addExam()}
        >
          Új vizsga
        </button>
      </div>
    </div>
  );
};

export default Exams;
