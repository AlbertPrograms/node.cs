import bcrypt from 'bcrypt';
import { Entity, EntityParams } from './EntityBase';

export interface ExamParams extends EntityParams {
  id: number;
  name: string;
  startMin: number;
  startMax: number;
  duration: number;
  students: string[]; // usernames
  tasks: number[]; // ids
}

export class Exam extends Entity<ExamParams> {
  get Id() {
    return this.params.id;
  }

  get Name() {
    return this.params.name;
  }

  set Name(name: string) {
    this.params.name = name;
  }

  get StartMin() {
    return this.params.startMin;
  }

  set StartMin(startMin: number) {
    this.params.startMin = startMin;
  }

  get StartMax() {
    return this.params.startMax;
  }

  set StartMax(startMax: number) {
    this.params.startMax = startMax;
  }

  get Duration() {
    return this.params.duration;
  }

  set Duration(duration: number) {
    this.params.duration = duration;
  }

  hasStudent(studentUsername: string) {
    if (!Array.isArray(this.params.students)) {
      return false;
    }

    return this.params.students.includes(studentUsername);
  }

  registerStudent(studentUsername: string) {
    if (!Array.isArray(this.params.students)) {
      this.params.students = [];
    }

    this.params.students.push(studentUsername);
  }

  unregisterStudent(studentUsername: string) {
    if (!Array.isArray(this.params.students)) {
      this.params.students = [];
    }

    const studentIndex = this.params.students.findIndex(
      (student) => student === studentUsername
    );
    if (studentIndex) {
      this.params.students.splice(studentIndex, 1);
    }
  }

  hasTask(taskId: number) {
    if (!Array.isArray(this.params.tasks)) {
      this.params.tasks = [];
    }

    return this.params.tasks.includes(taskId);
  }
}
