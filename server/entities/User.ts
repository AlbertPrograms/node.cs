import bcrypt from 'bcrypt';
import { Entity, EntityParams } from './EntityBase';

export interface UserParams extends EntityParams {
  username: string; // admin for admin, neptune code otherwise
  name: string;
  email: string;
  password: string;
  admin: boolean;
  teacher: boolean;
}

export class User extends Entity<UserParams> {
  get Username() {
    return this.params.username;
  }

  get Name() {
    return this.params.name;
  }

  set Name(name: string) {
    this.params.name = name;
  }

  get Email() {
    return this.params.email;
  }

  set Email(email: string) {
    this.params.email = email;
  }

  isAdmin() {
    return this.params.admin;
  }

  setAdmin(admin: boolean) {
    this.params.admin = admin;
  }

  isTeacher() {
    return this.params.teacher;
  }

  setTeacher(teacher: boolean) {
    this.params.teacher = teacher;
  }

  authenticate(providedPassword: string) {
    return bcrypt.compareSync(providedPassword, this.params.password);
  }
}
