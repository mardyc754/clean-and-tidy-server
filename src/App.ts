import 'dotenv/config';
import express, { Express } from 'express';
import cookieParser from 'cookie-parser';

import type { AbstractController } from '~/controllers';

export default class App {
  private app: Express;
  private port: string | number;

  constructor(controllers: AbstractController[], port: string | number) {
    this.app = express();
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.json());
    this.app.use(cookieParser());

    this.port = port;

    this.initializeControllers(controllers);
  }

  public listen() {
    this.app.listen(this.port, () => {
      console.log(`Server listening on port: ${this.port}`);
    });
  }

  private initializeControllers(controllers: AbstractController[]) {
    controllers.forEach((router) => {
      this.app.use(router.baseURL, router.router);
    });
  }
}
