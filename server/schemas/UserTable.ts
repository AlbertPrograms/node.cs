import { db } from '../db';
import { User, UserParams } from '../entities/User';
import { users } from '../data/users';
import { Knex } from 'knex';
import { EntityTable, TableField } from './EntityTable';

const tableFields: TableField<UserParams>[] = [
  {
    name: 'name',
    type: 'string',
    primary: true,
  },
  {
    name: 'email',
    type: 'string',
  },
  {
    name: 'password',
    type: 'string',
  },
  {
    name: 'admin',
    type: 'boolean',
  },
  {
    name: 'teacher',
    type: 'boolean',
  },
]

export class UserTable extends EntityTable<UserParams, User> {
  protected tableName = 'user';
  protected static instance: UserTable;
  protected entity = new User(null);
  protected tableFields = tableFields;
  protected defaultDataSet = users;

  static getInstance(): UserTable {
    if (!UserTable.instance) {
      UserTable.instance = new UserTable();
    }

    return UserTable.instance;
  }
}
