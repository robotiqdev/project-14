export interface User {
  id: string;
  email: string;
  name: string;
  timezone: string;
}

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByTimezones(timezones: string[]): Promise<User[]>;
}

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<User | null> {
    throw new Error('Not implemented');
  }

  async findByTimezones(timezones: string[]): Promise<User[]> {
    throw new Error('Not implemented');
  }
}
