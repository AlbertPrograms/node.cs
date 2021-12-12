import bcrypt from 'bcrypt';
import { Entity, EntityParams } from './EntityBase';

export interface UserParams extends EntityParams {
  name: string; // admin for admin, neptune code otherwise
  email: string;
  password: string;
  admin: boolean;
  teacher: boolean;
}

export class User extends Entity<UserParams> {
  get Name() {
    return this.params.name;
  }

  get Email() {
    return this.params.email;
  }

  isAdmin() {
    return !!this.params.admin;
  }

  isTeacher() {
    return !!this.params.teacher;
  }

  authenticate(providedPassword: string) {
    return bcrypt.compareSync(providedPassword, this.params.password);
  }
}
