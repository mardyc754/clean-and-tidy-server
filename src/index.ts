import { AuthController } from '~/controllers';
import App from './App';

const port = process.env.PORT || 8080;

const app = new App([new AuthController()], port);

app.listen();
