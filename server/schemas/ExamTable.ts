import { Exam, ExamParams } from '../entities/Exam';
import { EntityTable, TableField } from './EntityTable';

const tableFields: TableField<ExamParams>[] = [
  {
    name: 'id',
    type: 'integer',
    primary: true,
    notNullable: true,
  },
  {
    name: 'name',
    type: 'string',
    notNullable: true,
  },
  {
    name: 'startMin',
    type: 'integer',
    notNullable: true,
  },
  {
    name: 'startMax',
    type: 'integer',
    notNullable: true,
  },
  {
    name: 'duration', // in minutes, 15 minimum, 150 maximum
    type: 'integer',
    notNullable: true,
  },
  {
    name: 'students', // usernames
    type: 'string',
    multi: true,
  },
  {
    name: 'tasks', // ids
    type: 'integer',
    multi: true,
  },
];

export class ExamTable extends EntityTable<ExamParams, Exam> {
  protected tableName = 'exam';
  protected static instance: ExamTable;
  protected entity = new Exam(null);
  protected tableFields = tableFields;

  static getInstance(): ExamTable {
    if (!ExamTable.instance) {
      ExamTable.instance = new ExamTable();
    }

    return ExamTable.instance;
  }

  async registerStudent(id: number, studentUsername: string) {
    const exam = await this.find({ id });
    exam.registerStudent(studentUsername);
    await this.save([exam]);
  }

  async unregisterStudent(id: number, studentUsername: string) {
    const exam = await this.find({ id });
    exam.unregisterStudent(studentUsername);
    await this.save([exam]);
  }
}
