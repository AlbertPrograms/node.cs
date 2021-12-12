import { db, dbArraySeparatorString } from '../db';
import { Knex } from 'knex';
import { Entity, EntityInterface, EntityParams } from '../entities/EntityBase';

export interface TableField<T> {
  name: keyof T;
  type: 'string' | 'integer' | 'datetime' | 'boolean';
  primary?: boolean;
  notNullable?: boolean;
  multi?: boolean;
}

export class EntityTable<
  U extends EntityParams = EntityParams,
  T extends EntityInterface<U> = EntityInterface<U>
> {
  private static initPromise: Promise<void>;
  private entities: T[] = [];

  protected tableName: string;
  // Inheritance breaks is the first param is specified as EntityParams :/
  protected static instance: EntityTable<any, Entity>;
  protected entity: EntityInterface<U>;
  protected tableFields: TableField<U>[];
  protected defaultDataSet: T[];

  protected constructor() {
    this.initTable();
  }

  private async initTable(): Promise<void> {
    let resolve: () => void;

    EntityTable.initPromise = new Promise((r) => (resolve = r));

    // This delay ensures that descendant class fields are set
    await new Promise((r) => setTimeout(r, 1000));

    const tableExists = await db.schema.hasTable(this.tableName);
    if (!tableExists) {
      const primaryFields = this.PrimaryFields;

      this.checkPrimaryFieldValidity(primaryFields);

      await db.schema.createTable(this.tableName, (table) => {
        this.tableFields.forEach((tableField) => {
          const { name, type, primary, notNullable } = tableField;

          const field = table[type](name as string);
          primary && field.primary();
          notNullable && field.notNullable();
        });
      });

      this.save(this.defaultDataSet);
    }

    this.entities = await this.load();
    resolve();
  }
  private checkPrimaryFieldValidity(primaryFields: TableField<any>[]): void {
    if (primaryFields.length > 1) {
      throw new Error(
        `Table ${this.tableName} has more than one primary field`
      );
    } else if (primaryFields.length < 1) {
      throw new Error(`Primary field doesn't exist on table ${this.tableName}`);
    }
  }

  private get PrimaryFields() {
    return this.tableFields.filter((field) => field.primary);
  }
  private get PrimaryField() {
    return this.PrimaryFields?.[0];
  }
  private get PrimaryFieldName() {
    return this.PrimaryField.name;
  }

  private async update(entities: T[]): Promise<void> {
    this.entities.forEach((entity) => {
      this.entities
        .find((g) => g[this.PrimaryFieldName] === entity[this.PrimaryFieldName])
        .set(entity);
    });

    db.transaction((trx) => {
      const queries: Knex.QueryBuilder[] = entities.map((entity) => {
        return db(this.tableName)
          .where('name', entity.name)
          .update(() => {
            return this.convertFromEntityToDbParams(entity);
          })
          .transacting(trx);
      });

      Promise.all(queries).then(trx.commit).catch(trx.rollback);
    });
  }
  private convertToEntityFromDbParams(params: U): T {
    const newParams: Partial<U> = {};

    for (const field of this.tableFields) {
      const name = field.name;
      if (field.multi) {
        newParams[name] = (params[name] as string).split(
          dbArraySeparatorString
        ) as unknown as U[keyof U];
      } else {
        newParams[name] = params[name];
      }
    }

    return this.entity.createNew(newParams as U) as unknown as T;
  }
  private convertFromEntityToDbParams(entity: T): U {
    const params: Partial<U> = {};

    for (const field of this.tableFields) {
      const name = field.name;
      if (field.multi) {
        params[name] = (entity.getParams()[name] as string[]).join(
          dbArraySeparatorString
        ) as unknown as U[keyof U];
      } else {
        params[name] = entity.getParams()[name];
      }
    }

    return params as U;
  }

  private async add(entities: T[]): Promise<void> {
    this.entities.push(...entities);

    db.batchInsert(
      this.tableName,
      /*@ts-ignore*/
      entities.map((entity) => this.convertFromEntityToDbParams(entity)),
      50
    );
  }

  private async load(): Promise<T[]> {
    return (await db.select('*').from(this.tableName)).map((lp: U) =>
      this.convertToEntityFromDbParams(lp)
    );
  }

  static getInstance(): EntityTable<any> {
    if (!EntityTable.instance) {
      EntityTable.instance = new EntityTable();
    }

    return EntityTable.instance;
  }

  async get(): Promise<T[]> {
    await EntityTable.initPromise;

    return [...this.entities];
  }

  async save(entities: T[]): Promise<void> {
    await EntityTable.initPromise;

    const existing = entities.filter((entity) =>
      this.entities.some((e) => e.name === entity.name)
    );
    const newEntities = entities.filter(
      (entity) => !existing.some((e) => e.name === entity.name)
    );

    this.update(existing);
    this.add(newEntities);
  }
}
