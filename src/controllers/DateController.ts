import type { Response } from 'express';

import { GetHolidaysQueryType } from '~/schemas/dates';

import { validateGetHolidaysQuery } from '~/middlewares/type-validators/dates';

import { getHolidaysForYear } from '~/utils/holidays';

import type { DefaultBodyType, DefaultParamsType, TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class DateController extends AbstractController {
  constructor() {
    super('/dates');
    this.createRoutes();
  }

  public createRoutes() {
    this.router.get('/holidays', validateGetHolidaysQuery(), this.getHolidays);
  }

  private getHolidays = (
    req: TypedRequest<DefaultParamsType, DefaultBodyType, GetHolidaysQueryType>,
    res: Response
  ) => {
    const { year } = req.query;

    const holidays = getHolidaysForYear(
      year ? parseInt(year) : new Date().getFullYear()
    );
    res.json(holidays);
  };
}
