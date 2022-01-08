import { User, UserParams } from '../entities/User';
import { EntityTable, TableField } from './EntityTable';
import { users } from '../data/users';

const tableFields: TableField<UserParams>[] = [
  {
    name: 'username',
    type: 'string',
    primary: true,
    notNullable: true,
  },
  {
    name: 'name',
    type: 'string',
    notNullable: true,
  },
  {
    name: 'email',
    type: 'string',
  },
  {
    name: 'password',
    type: 'string',
    notNullable: true,
  },
  {
    name: 'birthday',
    type: 'string',
    notNullable: true,
  },
  {
    name: 'admin',
    type: 'boolean',
    notNullable: true,
  },
  {
    name: 'teacher',
    type: 'boolean',
    notNullable: true,
  },
];

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

  async resetPassword(username: string) {
    const user = await this.find({ username });
    user.resetPassword();
    await this.save([user]);
  }
}
