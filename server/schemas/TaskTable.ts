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
    type: 'string',
    notNullable: true,
    multi: true,
  },
  {
    name: 'hiddenTestData',
    type: 'string',
    multi: true,
  },
  {
    name: 'hiddenExpectedOutput',
    type: 'string',
    notNullable: true,
    multi: true,
  },
  {
    name: 'pointValue',
    type: 'integer',
    notNullable: true,
  },
  {
    name: 'practicable',
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

  async getTasks(ids: number[]) {
    const tasks = await this.get();
    return tasks.filter((task) => ids.includes(task.Id));
  }
}
