import { Entity, EntityParams } from './EntityBase';

export interface TaskParams extends EntityParams {
  id: number;
  description: string;
  testData?: string[];
  expectedOutput: string[];
  pointValue: number;
}

export class Task extends Entity<TaskParams> {
  get Id() {
    return this.params.id;
  }

  get Description() {
    return this.params.description;
  }

  get TestData() {
    return this.params.testData;
  }

  get expectedOutput() {
    return this.params.expectedOutput;
  }

  get PointValue() {
    return this.params.pointValue;
  }
}
