import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express, { Express } from 'express';

import type { AbstractController } from '~/controllers';

export default class App {
  private app: Express;
  private port: string | number;

  constructor(controllers: AbstractController[], port: string | number = 8080) {
    this.app = express();
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.json());
    this.app.use(cookieParser());
    this.app.use(
      cors({
        origin: process.env.FRONTEND_BASE_URL,
        credentials: true
      })
    );

    this.port = port;
    controllers.forEach((router) => {
      this.app.use(router.baseURL, router.router);
    });
  }

  public listen() {
    this.app.listen(this.port, () => {
      console.log(`Server listening on port: ${this.port}`);
    });
  }

  get instance() {
    return this.app;
  }
}
