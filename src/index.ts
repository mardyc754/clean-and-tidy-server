import {
  AuthController,
  ClientController,
  TypesOfCleaningController,
  EmployeeController,
  RecurringReservationController,
  ReservationController,
  AddressController
} from '~/controllers';
import App from './App';

const port = process.env.PORT || 8080;

const app = new App(
  [
    new AuthController(),
    new ClientController(),
    new TypesOfCleaningController(),
    new EmployeeController(),
    new ReservationController(),
    new RecurringReservationController(),
    new AddressController()
  ],
  port
);

app.listen();
