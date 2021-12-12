// Fields of an entity, also parameters of its constructor
export type EntityParams = Record<string, string[] | string | number | boolean>;

// An entity class with a
export type EntityInterface<T extends EntityParams = EntityParams> = Record<
  keyof T,
  any
> & {
  createNew: (paramsOrEntity: T | Entity<T>) => Entity<T>;
  set: (paramsOrEntity: T | Entity<T>) => void;
  getParams: () => T;
};

export class Entity<T extends EntityParams = EntityParams>
  implements EntityInterface
{
  protected params: T;

  private getParamsFromParamsOrEntity(paramsOrEntity: Entity<T> | T): T {
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

    return new Entity(params) as Entity<T>;
  }

  set(paramsOrEntity: Entity<T> | T) {
    this.params = this.getParamsFromParamsOrEntity(paramsOrEntity);
  }

  getParams(): T {
    return { ...this.params };
  }
}
