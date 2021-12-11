import { db, dbArraySeparatorString } from '../db';
import { Knex } from 'knex';
import { Entity, EntityParams } from '../entities/EntityInterface';

export interface TableField<T> {
  name: keyof T;
  type: 'string' | 'integer' | 'datetime' | 'boolean';
  primary?: boolean;
  notNullable?: boolean;
  multi?: boolean;
}

export class EntityTable<U extends EntityParams = EntityParams, T extends Entity<U> = Entity<U>> {
  private static initPromise: Promise<void>;
  private entities: T[] = [];

  protected tableName = 'entityName';
  // Inheritance breaks is the first param is specified as EntityParams :/
  protected static instance: EntityTable<any, Entity>;
  protected static entityClass: Entity['prototype'];
  protected tableFields: TableField<U>[] = [];
  protected defaultDataSet: T[] = [];

  protected constructor() {
    this.initTable();
  }

  private async initTable(): Promise<void> {
    let resolve: () => void;

    EntityTable.initPromise = new Promise((r) => (resolve = r));

    const tableExists = await db.schema.hasTable(this.tableName);
    console.log(tableExists);
    if (!tableExists) {
      const primaryFields = this.PrimaryFields;

      if (primaryFields.length > 1) {
        throw new Error(
          `Table ${this.tableName} has more than one primary field`
        );
      } else if (primaryFields.length < 1) {
        throw new Error(
          `Primary field doesn't exist on table ${this.tableName}`
        );
      }

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
            const newEntity: Partial<U> = {};

            for (const field of this.tableFields) {
              if (field.multi) {
                newEntity[field.name] = entity[field.name].join(dbArraySeparatorString);
              } else {
                newEntity[field.name] = entity[field.name];
              }
            }

            return newEntity;
          })
          .transacting(trx);
      });

      Promise.all(queries)
        .then(trx.commit)
        .catch(trx.rollback);
    });
  }

  private async add(entities: T[]): Promise<void> {
    this.entities.push(...entities);

    db.batchInsert(
      this.tableName,
      entities.map((entity) => entity.convertToDb()),
      50
    );
  }

  private async load(): Promise<T[]> {
    return (await db.select('*').from(this.tableName)).map(
      (lp: U) => EntityTable.entityClass.createNew(lp) as T
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
    const newListings = entities.filter(
      (entity) => !existing.some((e) => e.name === entity.name)
    );

    this.update(existing);
    this.add(newListings);
  }
}
