import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private users: User[] = [
    {
      id: 0,
      name: 'Bob',
      email: 'bob@gmail.com',
      password: 'bobPass',
    },
    {
      id: 1,
      name: 'John',
      email: 'john@gmail.com',
      password: 'johnPass',
    },
    {
      id: 2,
      name: 'Gary',
      email: 'gary@gmail.com',
      password: 'garyPass',
    },
    {
      id: 3,
      name: 'Darren Nienaber',
      email: 'twobutteredballs@gmail.com',
      password: 'staysignal01',
    },
  ];

  findByEmail(email: string): Promise<User | undefined> {
    const user = this.users.find((user: User) => user.email === email);
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }
    return Promise.resolve(user);
  }

  findOne(id: number): Promise<User | undefined> {
    const user = this.users.find((user: User) => user.id === id);
    if (!user) {
      throw new NotFoundException(`User with email ${id} not found`);
    }
    return Promise.resolve(user);
  }
}
