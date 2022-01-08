import { User, UserParams } from '../entities/User';

// TODO first time setup for admin?
const userParams: UserParams[] = [
  {
    username: 'admin',
    name: 'Rendszergazda',
    email: 'set_me!',
    password: '$2b$10$./uFc4LymMbcwlCEbB0bfezR.aktAMsUyt7HAFRjz/2FzQB1frP3y',
    admin: true,
    teacher: false,
  },
]

export const users = userParams.map(userParams => new User(userParams));