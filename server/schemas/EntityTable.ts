import { db, dbArraySeparatorString } from '../db';
import { Knex } from 'knex';
import {
  Entity,
  EntityInterface,
  EntityParams,
  EntityValueType,
} from '../entities/EntityBase';

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
  protected defaultDataSet: T[] = [];

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
  private get PrimaryFieldKey() {
    return this.PrimaryField.name;
  }
  private get PrimaryFieldName() {
    return `${this.PrimaryFieldKey}`;
  }

  private async update(entities: T[]): Promise<void> {
    entities.forEach((entity) => {
      this.entities
        .find((e) => {
          return (
            e.getParams()[this.PrimaryFieldKey] ===
            entity.getParams()[this.PrimaryFieldKey]
          );
        })
        .set(entity);
    });

    await db.transaction((trx) => {
      const queries: Knex.QueryBuilder[] = entities.map((entity) => {
        return db(this.tableName)
          .where(
            this.PrimaryFieldName,
            entity.getParams()[this.PrimaryFieldKey]
          )
          .update(this.convertFromEntityToDbParams(entity))
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
        if ([null, undefined].includes(params[name])) {
          continue;
        }
        if (field.type === 'integer') {
          newParams[name] = `${params[name]}`
            ?.split(dbArraySeparatorString)
            .map((param) => parseInt(param)) as U[keyof U];
        } else if (field.type === 'boolean') {
          newParams[name] = `${params[name]}`
            ?.split(dbArraySeparatorString)
            .map((param) => param === 'true') as U[keyof U];
        } else {
          newParams[name] = `${params[name]}`?.split(
            dbArraySeparatorString
          ) as U[keyof U];
        }
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
        params[name] = (entity.getParams()[name] as [])?.join(
          dbArraySeparatorString
        ) as U[keyof U];
      } else {
        params[name] = entity.getParams()[name];
      }
    }

    return params as U;
  }

  private async add(entities: T[]): Promise<void> {
    this.entities.push(...entities);

    await db.batchInsert(
      this.tableName,
      /*@ts-ignore*/ // TODO some typescript black magic going on here :)
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

  async getParams(): Promise<U[]> {
    await EntityTable.initPromise;

    return this.entities.map((entity) => entity.getParams());
  }

  async save(entities: T[]): Promise<void> {
    await EntityTable.initPromise;

    const existing = entities.filter((entity) =>
      this.entities.some(
        (e) =>
          e.getParams()[this.PrimaryFieldKey] ===
          entity.getParams()[this.PrimaryFieldKey]
      )
    );
    const newEntities = entities.filter(
      (entity) =>
        !existing.some(
          (e) =>
            e.getParams()[this.PrimaryFieldKey] ===
            entity.getParams()[this.PrimaryFieldKey]
        )
    );

    await this.update(existing);
    await this.add(newEntities);

    // Make sure db and memory don't de-sync
    await this.load();
  }

  async saveParams(entityParams: U[]): Promise<void> {
    return this.save(
      entityParams.map((params) =>
        this.entity.createNew(params)
      ) as unknown as T[]
    );
  }

  async delete(searchParams: Record<keyof U, EntityValueType>): Promise<void> {
    const index = this.entities.findIndex((entity) =>
      entity.match(searchParams)
    );
    const primaryFieldValue =
      this.entities[index].getParams()[this.PrimaryFieldKey];

    this.entities.splice(index, 1);
    await db(this.tableName)
      .where(this.PrimaryFieldName, primaryFieldValue)
      .del();
  }

  async find(searchParams: Record<keyof U, EntityValueType>): Promise<T> {
    return this.entities.find((entity) => entity.match(searchParams));
  }
}
