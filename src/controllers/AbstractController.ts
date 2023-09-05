import { Router } from 'express';

export default abstract class AbstractController {
  protected _baseURL: string;
  protected _router: Router;

  constructor(baseURL: string) {
    this._baseURL = baseURL;
    this._router = Router();
  }

  get baseURL(): string {
    return this._baseURL;
  }

  get router(): Router {
    return this._router;
  }

  abstract createRouters(): void;
}
