// The possible types of value and entity field can have
export type EntityValueType = string[] | string | number[] | number | boolean;

// Fields of an entity, also parameters of its constructor
export type EntityParams = Record<string, EntityValueType>;

interface EntityConstructor<T extends EntityParams = EntityParams> {
  new (params: T): Entity<T>;
}

export type EntityInterface<T extends EntityParams = EntityParams> = Record<
  keyof T,
  any
> & {
  createNew: (paramsOrEntity: T | Entity<T>) => Entity<T>;
  set: (paramsOrEntity: T | Entity<T>) => void;
  getParams: () => T;
  match: (searchParams: Record<keyof T, EntityValueType>) => boolean;
};

export class Entity<T extends EntityParams = EntityParams>
  implements EntityInterface
{
  protected params: T;

  protected getParamsFromParamsOrEntity(paramsOrEntity: Entity<T> | T): T {
    return this.isEntity(paramsOrEntity)
      ? paramsOrEntity.getParams()
      : paramsOrEntity;
  }
  private isEntity(paramsOrEntity: Entity<T> | T): paramsOrEntity is Entity<T> {
    return typeof (paramsOrEntity as Entity<T>)?.getParams === 'function';
  }

  constructor(params: T) {
    this.params = params;
  }

  createNew(paramsOrEntity: Entity<T> | T): Entity<T> {
    const params = this.getParamsFromParamsOrEntity(paramsOrEntity);

    return new (this.constructor as EntityConstructor<T>)(params);
  }

  set(paramsOrEntity: Entity<T> | T) {
    this.params = this.getParamsFromParamsOrEntity(paramsOrEntity);
  }

  getParams(): T {
    return { ...this.params };
  }

  match(searchParams: Record<keyof T, EntityValueType>): boolean {
    return Object.keys(searchParams).every(
      (key) => this.params[key] === searchParams[key]
    );
  }
}
