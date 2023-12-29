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

import { checkIfUserExisits } from '~/middlewares/auth/checkIfUserExists';
import { checkIsAdmin, checkIsEmployee } from '~/middlewares/auth/checkRole';
import {
  validateEmployeeChangeData,
  validateEmployeeCreationData,
  validateEmployeeQueryOptions
} from '~/middlewares/type-validators/employee';

import { ClientService, EmployeeService } from '~/services';

import { queryParamToBoolean } from '~/utils/general';

import type { DefaultBodyType, DefaultParamsType, TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class EmployeeController extends AbstractController {
  private employeeService = new EmployeeService();
  private clientService = new ClientService();

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
      validateEmployeeCreationData(),
      checkIfUserExisits,
      this.createEmployee
    );
    this.router.get('/busy-hours', this.getEmployeesBusyHours);
    this.router.get('/:id', this.getEmployeeById);
    this.router.get('/:id/visits', checkIsEmployee(), this.getEmployeeVisits);
    this.router.get(
      '/:id/reservations',
      checkIsEmployee(),
      this.getEmployeeReservations
    );

    this.router.put(
      '/:employeeId',
      validateEmployeeChangeData(),
      this.changeEmployeeData
    );
    this.router.get('/services/:id', this.getEmployeesOfferingService);
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
  };

  private getEmployeeVisits = async (
    req: TypedRequest<{ id: string }, DefaultBodyType, { status: Status }>,
    res: Response
  ) => {
    const visits = await this.employeeService.getEmployeeVisits(
      parseInt(req.params.id),
      req.query.status
    );

    if (visits !== null) {
      res.status(200).send(visits);
    } else {
      res
        .status(404)
        .send({ message: `Employee with id=${req.params.id} not found` });
    }
  };

  private getEmployeeReservations = async (
    req: TypedRequest<{ id: string }, DefaultBodyType, { status: Status }>,
    res: Response
  ) => {
    const reservations =
      await this.employeeService.getReservationsAssignedToEmployee(
        parseInt(req.params.id),
        {
          status: req.query.status
        }
      );

    if (reservations !== null) {
      res.status(200).send(reservations);
    } else {
      res.status(404).send({
        message: `Employee with id=${req.params.id} not found`
      });
    }
  };

  private createEmployee = async (
    req: TypedRequest<DefaultParamsType, EmployeeCreationData>,
    res: Response
  ) => {
    const { email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      res.status(400).send({
        message: 'Password and confirm password do not match',
        affectedField: 'confirmPassword'
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    const user = await this.employeeService.getEmployeeByEmail(email);

    if (user !== null) {
      res.status(409).send({
        message: 'Employee with given email already exists',
        affectedField: 'email'
      });
      return;
    }

    const employee = await this.employeeService.createEmployee({
      ...omit(req.body, 'confirmPassword', 'password'),
      password: hashedPassword
    });

    if (employee) {
      res.status(201).send(omit(employee, 'password'));
    } else {
      res.status(400).send({ message: `Error when creating new employee` });
    }
  };

  private changeEmployeeData = async (
    req: TypedRequest<{ employeeId: string }, EmployeeChangeData>,
    res: Response
  ) => {
    const newLinkedServices = await this.employeeService.changeEmployeeData(
      parseInt(req.params.employeeId),
      req.body
    );

    if (newLinkedServices !== null) {
      res.status(200).send(newLinkedServices);
    } else {
      res.status(404).send({
        message: `Employee with id=${req.params.employeeId} not found`
      });
    }
  };

  private getEmployeesOfferingService = async (
    req: TypedRequest<{ id: string }>,
    res: Response
  ) => {
    const employees = await this.employeeService.getEmployeesOfferingService(
      parseInt(req.params.id)
    );

    if (employees !== null) {
      res.status(200).send(employees);
    } else {
      res
        .status(400)
        .send({ message: 'Error when fetching employees offering service' });
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
    const employees = await this.employeeService.getEmployeesBusyHoursForVisit({
      visitIds: req.query.visitIds
        ? req.query.visitIds.split(',').map((id) => parseInt(id))
        : undefined,
      frequency: req.query.frequency as Frequency | undefined,
      period: req.query.period,
      excludeFrom: req.query.excludeFrom,
      excludeTo: req.query.excludeTo
    });

    if (employees !== null) {
      res.status(200).send(employees);
    } else {
      res
        .status(400)
        .send({ message: 'Error when fetching employees busy hours' });
    }
  };
}
