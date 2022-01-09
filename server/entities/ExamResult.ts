import { Entity, EntityParams } from './EntityBase';

export interface ExamResultParams extends EntityParams {
  id: number;
  examId: number;
  studentUsername: string;
  solutions: string[];
  successes: boolean[];
}

export class ExamResult extends Entity<ExamResultParams> {
  get Id() {
    return this.params.id;
  }

  get ExamId() {
    return this.params.examId;
  }

  set ExamId(examId: number) {
    this.params.examId = examId;
  }

  get StudentUsername() {
    return this.params.studentUsername;
  }

  set StudentUsername(studentUsername: string) {
    this.params.studentUsername = studentUsername;
  }

  get Solutions() {
    return [...this.params.solutions];
  }

  get Successes() {
    return [...this.params.successes];
  }
}
