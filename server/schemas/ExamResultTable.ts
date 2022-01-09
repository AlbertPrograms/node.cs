import { ExamResult, ExamResultParams } from '../entities/ExamResult';
import { EntityTable, TableField } from './EntityTable';

const tableFields: TableField<ExamResultParams>[] = [
  {
    name: 'id',
    type: 'integer',
    primary: true,
    notNullable: true,
  },
  {
    name: 'examId',
    type: 'integer',
    notNullable: true,
  },
  {
    name: 'studentUsername',
    type: 'string',
    notNullable: true,
  },
  {
    name: 'solutions',
    type: 'string',
    notNullable: true,
    multi: true,
  },
  {
    name: 'successes',
    type: 'boolean',
    notNullable: true,
    multi: true,
  },
];

export class ExamResultTable extends EntityTable<ExamResultParams, ExamResult> {
  protected tableName = 'examResult';
  protected static instance: ExamResultTable;
  protected entity = new ExamResult(null);
  protected tableFields = tableFields;

  static getInstance(): ExamResultTable {
    if (!ExamResultTable.instance) {
      ExamResultTable.instance = new ExamResultTable();
    }

    return ExamResultTable.instance;
  }
}
