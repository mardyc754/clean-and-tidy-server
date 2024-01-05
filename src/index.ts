import {
  AddressController,
  AuthController,
  ClientController,
  DateController,
  EmployeeController,
  ReservationController,
  TypesOfCleaningController,
  VisitController,
  VisitPartController
} from '~/controllers';

import App from './App';

const app = new App(
  [
    new AuthController(),
    new ClientController(),
    new TypesOfCleaningController(),
    new EmployeeController(),
    new VisitController(),
    new ReservationController(),
    new AddressController(),
    new DateController(),
    new VisitPartController()
  ],
  process.env.PORT || 8080
);

app.listen();
