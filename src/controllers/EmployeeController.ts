import { Frequency, Status } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { Response } from 'express';
import { Stringified } from 'type-fest';

import type {
  EmployeeCreationData,
  EmployeeQueryOptions,
  EmployeeWorkingHoursOptions,
  ServicesWorkingHoursOptions
} from '~/schemas/employee';

import { checkIsAdmin, checkIsEmployee } from '~/middlewares/auth/checkRole';
import {
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
    this.router.post('/', validateEmployeeCreationData(), this.createEmployee);
    this.router.get('/busy-hours', this.getEmployeesBusyHours);
    this.router.get('/:id', this.getEmployeeById);
    this.router.get('/:id/visits', checkIsEmployee(), this.getEmployeeVisits);
    this.router.get(
      '/:id/reservations',
      checkIsEmployee(),
      this.getEmployeeReservations
    );
    this.router.get('/:id/services', this.getEmployeeServices);

    this.router.put(
      '/:employeeId/services',
      this.changeEmployeeServiceAssignment
    );
    this.router.delete('/:id', this.deleteEmployeeData);
    this.router.get('/services/:id', this.getEmployeesOfferingService);
  }

  private getAllEmployees = async (
    req: TypedRequest<DefaultParamsType, DefaultBodyType, EmployeeQueryOptions>,
    res: Response
  ) => {
    const employees = await this.employeeService.getAllEmployees({
      includeVisits: queryParamToBoolean(req.query.includeVisits)
    });

    if (employees !== null) {
      res.status(200).send(employees);
    } else {
      res.status(400).send({ message: 'Error when receiving all employees' });
    }
  };

  private getEmployeeById = async (
    req: TypedRequest<{ id: string }>,
    res: Response
  ) => {
    const employee = await this.employeeService.getEmployeeById(
      parseInt(req.params.id)
    );

    if (employee) {
      res.status(200).send(employee);
    } else {
      res
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

  private getEmployeeServices = async (
    req: TypedRequest<{ id: string }>,
    res: Response
  ) => {
    const services = await this.employeeService.getEmployeeServices(
      parseInt(req.params.id)
    );

    if (services !== null) {
      res.status(200).send(services);
    } else {
      res
        .status(404)
        .send({ message: `Employee with id=${req.params.id} not found` });
    }
  };

  private createEmployee = async (
    req: TypedRequest<DefaultParamsType, EmployeeCreationData>,
    res: Response
  ) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);

    const user = await this.employeeService.getEmployeeByEmail(email);

    if (user !== null) {
      res
        .status(409)
        .send({ message: 'Employee with given email already exists' });
      return;
    }

    const employee = await this.employeeService.createEmployee({
      ...req.body,
      password: hashedPassword
    });

    if (employee) {
      res.status(201).send(employee);
    } else {
      res
        .status(404)
        .send({ message: `Employee with id=${req.params.id} not found` });
    }
  };

  private deleteEmployeeData = async (
    req: TypedRequest<{ id: string }>,
    res: Response
  ) => {
    const deletedEmployee = await this.employeeService.deleteEmployee(
      parseInt(req.params.id)
    );

    if (deletedEmployee !== null) {
      res.status(200).send(deletedEmployee);
    } else {
      res
        .status(404)
        .send({ message: `Employee with id=${req.params.id} not found` });
    }
  };

  private changeEmployeeServiceAssignment = async (
    req: TypedRequest<{ employeeId: string }, { serviceIds: number[] }>,
    res: Response
  ) => {
    const newLinkedServices =
      await this.employeeService.changeEmployeeServiceAssignment(
        parseInt(req.params.employeeId),
        req.body.serviceIds
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
      period: req.query.period
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
