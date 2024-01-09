import { Frequency, Status } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { omit } from 'lodash';
import { Stringified } from 'type-fest';

import type {
  EmployeeChangeData,
  EmployeeCreationData,
  EmployeeQueryOptions,
  EmployeeWorkingHoursOptions
} from '~/schemas/employee';

import {
  checkIsAdmin,
  checkIsEmployee
} from '~/middlewares/auth/checkAuthorization';
import { checkIfUserExisits } from '~/middlewares/auth/checkIfUserExists';
import {
  validateEmployeeChangeData,
  validateEmployeeCreationData,
  validateEmployeeQueryOptions
} from '~/middlewares/type-validators/employee';

import { EmployeeService } from '~/services';

import { queryParamToBoolean } from '~/utils/general';

import type { DefaultBodyType, DefaultParamsType, TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class EmployeeController extends AbstractController {
  private employeeService = new EmployeeService();

  constructor() {
    super('/employees');
    this.createRouters();
  }

  public createRouters() {
    this.router.get(
      '/',
      checkIsAdmin(),
      validateEmployeeQueryOptions(),
      this.getAllEmployees
    );
    this.router.post(
      '/',
      checkIsAdmin(),
      validateEmployeeCreationData(),
      checkIfUserExisits,
      this.createEmployee
    );
    this.router.get('/busy-hours', this.getEmployeesBusyHours);
    this.router.get('/:id', this.getEmployeeById);
    this.router.get(
      '/:id/visits',
      checkIsEmployee(),
      this.getEmployeeVisitParts
    );
    this.router.get(
      '/:id/reservations',
      checkIsEmployee(),
      this.getEmployeeReservations
    );
    this.router.put(
      '/:id',
      checkIsAdmin(),
      validateEmployeeChangeData(),
      this.changeEmployeeData
    );
  }

  private getAllEmployees = async (
    req: TypedRequest<DefaultParamsType, DefaultBodyType, EmployeeQueryOptions>,
    res: Response
  ) => {
    const employees = await this.employeeService.getAllEmployees();

    if (employees !== null) {
      res.status(200).send(employees);
    } else {
      res.status(400).send({ message: 'Error when receiving all employees' });
    }
  };

  private getEmployeeById = async (
    req: TypedRequest<
      { id: string },
      DefaultBodyType,
      { includeServices?: string }
    >,
    res: Response
  ) => {
    try {
      const includeEmployees = queryParamToBoolean(req.query.includeServices);

      if (includeEmployees) {
        const employee = await this.employeeService.getEmployeeWithServices(
          parseInt(req.params.id)
        );

        if (employee) {
          return res.status(200).send(employee);
        } else {
          return res
            .status(404)
            .send({ message: `Employee with id=${req.params.id} not found` });
        }
      }

      const employee = await this.employeeService.getEmployeeById(
        parseInt(req.params.id)
      );

      if (employee) {
        return res.status(200).send(employee);
      } else {
        return res
          .status(404)
          .send({ message: `Employee with id=${req.params.id} not found` });
      }
    } catch (error) {
      console.log(error);
      return res
        .status(400)
        .send({ message: `Error when receiving employee data` });
    }
  };

  private getEmployeeVisitParts = async (
    req: TypedRequest<{ id: string }, DefaultBodyType, { status: Status }>,
    res: Response
  ) => {
    try {
      const visits = await this.employeeService.getEmployeeVisitParts(
        parseInt(req.params.id),
        req.query.status
      );

      res.status(200).send(visits);
    } catch (error) {
      res.status(400).send({ message: `Error when receiving employee visits` });
    }
  };

  private getEmployeeReservations = async (
    req: TypedRequest<{ id: string }, DefaultBodyType, { status: Status }>,
    res: Response
  ) => {
    try {
      const reservations =
        await this.employeeService.getReservationsAssignedToEmployee(
          parseInt(req.params.id),
          {
            status: req.query.status
          }
        );

      res.status(200).send(reservations);
    } catch (error) {
      res.status(400).send({
        message: `Error when receiving employee reservations`
      });
    }
  };

  private createEmployee = async (
    req: TypedRequest<DefaultParamsType, EmployeeCreationData>,
    res: Response
  ) => {
    const { email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.status(400).send({
        message: 'Password and confirm password do not match',
        affectedField: 'confirmPassword'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    try {
      const user = await this.employeeService.getEmployeeByEmail(email);

      if (user !== null) {
        return res.status(409).send({
          message: 'Employee with given email already exists',
          affectedField: 'email'
        });
      }

      const employee = await this.employeeService.createEmployee({
        ...omit(req.body, 'confirmPassword', 'password'),
        password: hashedPassword
      });

      res.status(201).send(omit(employee, 'password'));
    } catch (error) {
      res.status(400).send({ message: `Error when creating new employee` });
    }
  };

  private changeEmployeeData = async (
    req: TypedRequest<{ id: string }, EmployeeChangeData>,
    res: Response
  ) => {
    try {
      const newLinkedServices = await this.employeeService.changeEmployeeData(
        parseInt(req.params.id),
        req.body
      );

      res.status(200).send(newLinkedServices);
    } catch (error) {
      res.status(400).send({
        message: `Error when changing employee data`
      });
    }
  };

  private getEmployeesBusyHours = async (
    req: TypedRequest<
      DefaultParamsType,
      DefaultBodyType,
      Stringified<EmployeeWorkingHoursOptions>
    >,
    res: Response
  ) => {
    try {
      const employees =
        await this.employeeService.getEmployeesBusyHoursForVisit({
          visitIds: req.query.visitIds
            ? req.query.visitIds.split(',').map((id) => parseInt(id))
            : undefined,
          frequency: req.query.frequency as Frequency | undefined,
          period: req.query.period,
          excludeFrom: req.query.excludeFrom,
          excludeTo: req.query.excludeTo
        });

      res.status(200).send(employees);
    } catch (error) {
      res
        .status(400)
        .send({ message: 'Error when fetching employees busy hours' });
    }
  };
}
