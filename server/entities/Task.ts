import { Entity, EntityParams } from './EntityBase';

export interface TaskParams extends EntityParams {
  id: number;
  description: string;
  testData?: string[];
  expectedOutput: string[];
  hiddenTestData?: string[];
  hiddenExpectedOutput: string[];
  pointValue: number;
  practicable: boolean;
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

  get ExpectedOutput() {
    return this.params.expectedOutput;
  }

  get HiddenTestData() {
    return this.params.testData;
  }

  get HiddenExpectedOutput() {
    return this.params.expectedOutput;
  }

  get PointValue() {
    return this.params.pointValue;
  }

  get Practicable() {
    return this.params.practicable;
  }
}
