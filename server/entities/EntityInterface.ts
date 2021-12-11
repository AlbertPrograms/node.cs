// Fields of an entity, also parameters of its constructor
export type EntityParams = Record<string, string | number | boolean>;

// An entity class with a
export type Entity<T extends EntityParams = EntityParams> = Record<keyof T, any> & {
  createNew: (params: T | Entity<T>) => Entity<T>;
  set: (params: T | Entity<T>) => void;
}