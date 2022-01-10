import React, { useEffect, useState } from 'react';
import { TokenString } from '../../util/useToken';
import { formatTaskDescription } from '../Editor/Editor';
import './ExamResults.css';

interface ExamResultParams {
  token: TokenString;
}

interface ExamResultsResponse {
  examName: string;
  student: string;
  totalPoints: number;
  scoredPoints: number;
  tasksSolutionsAndSuccesses: [string, string, boolean][];
}

const ExamResults: React.FC<ExamResultParams> = ({ token }) => {
  const [examResults, setExamResults] = useState<ExamResultsResponse[]>([]);

  // Exam result getter
  useEffect(() => {
    fetch('/get-exam-results', {
      method: 'POST',
      body: JSON.stringify({ sessionTokenString: token }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then((res) => res.json())
      .then(setExamResults);
  }, [token]);

  return (
    <div className="row w-100">
      {examResults.map(
        ({
          examName,
          student,
          totalPoints,
          scoredPoints,
          tasksSolutionsAndSuccesses,
        }) => (
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card bg-dark border-secondary">
              <div className="card-header border-secondary d-flex justify-content-between align-items-center">
                <div>{examName}</div>
              </div>
              <div className="card-body">
                <div className="text-light mb-2">Tanuló: {student}</div>
                <div className="text-light mb-2">
                  Elérhető pontok: {totalPoints}
                </div>
                <div className="text-light mb-2">
                  Elért pontok: {scoredPoints}
                </div>
                <div className="text-light mb-2">Feladatok</div>
                {tasksSolutionsAndSuccesses.map(([task, solution, success]) => (
                  <div
                    className={`border ${
                      success ? 'border-success' : 'border-danger'
                    } p-2 my-2`}
                  >
                    <div className="text-light mb-2">Feladat:</div>
                    <div className="text-light mb-2">{formatTaskDescription(task)}</div>
                    <hr />
                    <div className="text-light mb-2">Kód:</div>
                    <div className="code text-light mb-2 bg-black bg-opacity-25 font-monospace p-2">
                      {solution}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default ExamResults;
