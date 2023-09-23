import {
  AuthController,
  UserController,
  TypesOfCleaningController,
  EmployeeController
} from '~/controllers';
import App from './App';

const port = process.env.PORT || 8080;

const app = new App(
  [
    new AuthController(),
    new UserController(),
    new TypesOfCleaningController(),
    new EmployeeController()
  ],
  port
);

app.listen();
