import { Router } from 'express';

export default abstract class AbstractController {
  protected _baseURL: string;
  protected _router: Router;
  // private instance!: AbstractController;

  protected constructor(baseURL: string) {
    this._baseURL = baseURL;
    this._router = Router();
  }

  // public getInstance(): AbstractController {
  //   if (!this.instance) {
  //     this.instance = new (this.constructor as new (baseURL: string) => AbstractController)(
  //       this.baseURL
  //     );
  //   }
  //   return this.instance;
  // }

  get baseURL(): string {
    return this._baseURL;
  }

  get router(): Router {
    return this._router;
  }

  abstract createRouters(): void;
}
