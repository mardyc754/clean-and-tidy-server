import { AuthController, UserController } from '~/controllers';
import App from './App';

const port = process.env.PORT || 8080;

const app = new App([new AuthController(), new UserController()], port);

app.listen();
