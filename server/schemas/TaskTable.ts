import { Task, TaskParams } from '../entities/Task';
import { EntityTable, TableField } from './EntityTable';
import { tasks } from '../data/tasks';

const tableFields: TableField<TaskParams>[] = [
  {
    name: 'id',
    type: 'integer',
    primary: true,
    notNullable: true,
  },
  {
    name: 'description',
    type: 'string',
    notNullable: true,
  },
  {
    name: 'testData',
    type: 'string',
    multi: true,
  },
  {
    name: 'expectedOutput',
    type: 'boolean',
    notNullable: true,
    multi: true,
  },
  {
    name: 'pointValue',
    type: 'boolean',
    notNullable: true,
  },
];

export class TaskTable extends EntityTable<TaskParams, Task> {
  protected tableName = 'task';
  protected static instance: TaskTable;
  protected entity = new Task(null);
  protected tableFields = tableFields;
  protected defaultDataSet = tasks;

  static getInstance(): TaskTable {
    if (!TaskTable.instance) {
      TaskTable.instance = new TaskTable();
    }

    return TaskTable.instance;
  }
}
