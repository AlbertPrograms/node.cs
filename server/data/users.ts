import { User, UserParams } from '../entities/User';

const userParams: UserParams[] = [
  {
    username: 'admin',
    name: 'Rendszergazda',
    email: null,
    password: '$2b$10$./uFc4LymMbcwlCEbB0bfezR.aktAMsUyt7HAFRjz/2FzQB1frP3y',
    admin: true,
    teacher: false,
  },
]

export const users = userParams.map(userParams => new User(userParams));