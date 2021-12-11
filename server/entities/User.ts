import bcrypt from 'bcrypt';
import { Entity, EntityParams } from './EntityInterface';

export interface UserParams extends EntityParams {
  name: string; // admin for admin, neptune code otherwise
  email: string;
  password: string;
  admin: boolean;
  teacher: boolean;
}

export class User implements Entity<UserParams> {
  private name: string;
  private email: string;
  private password: string;
  private admin: boolean;
  private teacher: boolean;

  constructor({ name, email, password, admin, teacher }: UserParams) {
    this.name = name;
    this.email = email;
    this.password = password;
    this.admin = admin;
    this.teacher = teacher;
  }

  createNew(paramsOrUser: UserParams | User) {
    const params = this.getParamsFromParamsOrUser(paramsOrUser);

    return new User(params);
  }

  set(paramsOrUser: UserParams | User) {
    const params = this.getParamsFromParamsOrUser(paramsOrUser);

    this.setFromParams(params);
  }
  private setFromParams({ name, email, password, admin, teacher }: UserParams) {
    this.name = name;
    this.email = email;
    this.password = password;
    this.admin = admin;
    this.teacher = teacher;
  }

  private getParamsFromParamsOrUser(paramsOrUser: UserParams | User): UserParams {
    const params: UserParams = Object.hasOwnProperty.call(
      paramsOrUser,
      'getConstructorParams'
    )
      ? (paramsOrUser as User).getConstructorParams()
      : (paramsOrUser as UserParams);

    return params;
  }

  get Name() {
    return this.name;
  }

  get Email() {
    return this.email;
  }

  isAdmin() {
    return !!this.admin;
  }

  isTeacher() {
    return !!this.teacher;
  }

  authenticate(providedPassword: string) {
    return bcrypt.compareSync(providedPassword, this.password);
  }

  private getConstructorParams(): UserParams {
    return {
      name: this.name,
      email: this.email,
      password: this.password,
      admin: this.admin,
      teacher: this.teacher,
    };
  }
}
