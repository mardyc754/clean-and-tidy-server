import type { Query } from 'express-serve-static-core';
import type { Request } from 'express';

export interface TypedRequest<T extends Query, U> extends Request {
  body: U;
  query: T;
}
