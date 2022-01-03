import { Task, TaskParams } from "../entities/Task";

const taskParams: TaskParams[] = [
  {
    id: 0,
    description: 'Írassa ki a standard kimenetre, hogy `Hello world!`',
    expectedOutput: ['Hello world!'],
    pointValue: 1,
  },
  {
    id: 1,
    description:
      'Írjon programot, mely az argumentumban megadott sorszámú fibonacci sorozatot írja ki vesszővel és szóközzel elválasztva a standard kimenetre! Pl. bemenet: `7`, kimenet: `1, 1, 2, 3, 5, 8, 13`',
    testData: ['1', '10', '30'],
    expectedOutput: [
      '1',
      '1, 1, 2, 3, 5, 8, 13, 21, 34, 55',
      '1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025, 121393, 196418, 317811, 514229, 832040',
    ],
    pointValue: 3,
  },
];

export const tasks = taskParams.map(taskParams => new Task(taskParams));