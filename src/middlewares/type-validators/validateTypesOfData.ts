import type { NextFunction, Response } from 'express';
import {
  ZodError,
  type ZodObject,
  type ZodRawShape,
  type ZodString,
  type ZodUnknown,
  z
} from 'zod';

import type {
  DefaultBodyType,
  DefaultParamsType,
  DefaultQueryType,
  TypedRequest
} from '~/types';

type ParamsParser<T extends ZodRawShape = Record<string, ZodString>> =
  ZodObject<T>;
type BodyParser<T extends ZodRawShape = Record<string, ZodUnknown>> =
  ZodObject<T>;
type QueryParser<T extends ZodRawShape = Record<string, ZodUnknown>> =
  ZodObject<T>;

type VerifySchemas<
  P extends ZodRawShape = Record<string, ZodString>,
  B extends ZodRawShape = Record<string, ZodUnknown>,
  Q extends ZodRawShape = Record<string, ZodString>
> = {
  paramsParser?: ParamsParser<P>;
  bodyParser?: BodyParser<B>;
  queryParser?: QueryParser<Q>;
};

type ZodObjectOrDefault<
  typeToCheck,
  zodSchemaType extends ZodRawShape,
  fallbackType
> = typeToCheck extends ZodObject<zodSchemaType>
  ? z.infer<typeToCheck>
  : fallbackType;

export function validateParamsTypes<T extends ZodRawShape>(
  parser: ParamsParser<T>
) {
  return (
    req: TypedRequest<ZodObjectOrDefault<typeof parser, T, DefaultParamsType>>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      parser.parse(req.params);
    } catch (err) {
      console.error(err);
      return res
        .status(400)
        .send({ message: 'Error when parsing params type', hasError: true });
    }

    return next();
  };
}

export function validateBodyTypes<T extends ZodRawShape>(
  parser: BodyParser<T>
) {
  return (
    req: TypedRequest<
      DefaultParamsType,
      ZodObjectOrDefault<typeof parser, T, DefaultBodyType>
    >,
    res: Response,
    next: NextFunction
  ) => {
    try {
      parser.parse(req.body);
    } catch (err) {
      console.error(err);
      return res
        .status(400)
        .send({ message: 'Error when parsing body type', hasError: true });
    }

    return next();
  };
}

export function validateQueryTypes<T extends ZodRawShape>(
  parser: QueryParser<T>
) {
  return (
    req: TypedRequest<
      DefaultParamsType,
      DefaultBodyType,
      ZodObjectOrDefault<typeof parser, T, DefaultQueryType>
    >,
    res: Response,
    next: NextFunction
  ) => {
    try {
      parser.parse(req.query);
    } catch (err) {
      console.error(err);
      return res.status(400).send({
        message: 'Error when parsing query params type',
        hasError: true
      });
    }

    return next();
  };
}

export function validateTypes<
  P extends ZodRawShape,
  B extends ZodRawShape,
  Q extends ZodRawShape
>({ paramsParser, bodyParser, queryParser }: VerifySchemas<P, B, Q>) {
  return (
    req: TypedRequest<
      ZodObjectOrDefault<typeof paramsParser, P, DefaultParamsType>,
      ZodObjectOrDefault<typeof bodyParser, B, DefaultBodyType>,
      ZodObjectOrDefault<typeof queryParser, Q, DefaultQueryType>
    >,
    res: Response,
    next: NextFunction
  ) => {
    try {
      paramsParser && paramsParser.parse(req.params);
      bodyParser && bodyParser.parse(req.body);
      queryParser && queryParser.parse(req.body);
    } catch (err) {
      console.error(err);
      let errors;

      if (err instanceof ZodError) {
        errors = err.errors;
      }

      return res.status(400).send({
        message: 'Error when parsing data type',
        data: errors,
        hasError: true
      });
    }

    return next();
  };
}
