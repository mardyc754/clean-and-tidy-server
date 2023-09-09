import { UserService } from '~/services';
import AbstractController from './AbstractController';

export default class UserController extends AbstractController {
  private userService = new UserService();

  constructor() {
    super('/users');
    this.createRouters();
  }

  public createRouters() {
    // this.router.get('/', this.getAllUsers);
    // this.router.get('/:id', this.getUserById);
  }
}
