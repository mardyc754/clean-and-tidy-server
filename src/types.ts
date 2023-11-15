import type { Request } from 'express';
import type { ParamsDictionary, Query } from 'express-serve-static-core';

export type DefaultParamsType = ParamsDictionary;
export type DefaultBodyType = Record<string, unknown>;
export type DefaultQueryType = Query;

export interface TypedRequest<
  P extends ParamsDictionary = DefaultParamsType,
  U = DefaultBodyType,
  Q extends Query = DefaultQueryType
> extends Request {
  body: U;
  params: P;
  query: Q;
}

export type StartEndDate = {
  startDate: Date;
  endDate: Date;
};
