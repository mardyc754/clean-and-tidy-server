import type { Request, Response } from 'express';

import { EmployeeService } from '~/services';
import { validateEmployeeCreationData } from '~/middlewares/type-validators/employee';
import type { EmployeeCreationData } from '~/schemas/employee';
import type { DefaultParamsType, TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class EmployeeController extends AbstractController {
  private employeeService = new EmployeeService();

  constructor() {
    super('/employees');
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/', this.getAllEmployees);
    this.router.post('/', validateEmployeeCreationData(), this.createEmployee);
    this.router.get('/:id', this.getEmployeeById);
    this.router.get('/:id/reservations', this.getEmployeeReservations);
    this.router.get('/:id/services', this.getEmployeeServices);

    this.router.post(
      '/:employeeId/services/:serviceId',
      this.linkEmployeeWithService
    );
    this.router.delete('/:id', this.deleteEmployeeData);
  }

  private getAllEmployees = async (_: Request, res: Response) => {
    const employees = await this.employeeService.getAllEmployees();

    if (employees !== null) {
      res.status(200).send({
        data: employees
      });
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
      res.status(200).send({
        data: employee
      });
    } else {
      res
        .status(404)
        .send({ message: `Employee with id=${req.params.id} not found` });
    }
  };

  private getEmployeeReservations = async (
    req: TypedRequest<{ id: string }>,
    res: Response
  ) => {
    const reservations = await this.employeeService.getEmployeeReservations(
      parseInt(req.params.id)
    );

    if (reservations !== null) {
      res.status(200).send({ data: reservations });
    } else {
      res
        .status(404)
        .send({ message: `Employee with id=${req.params.id} not found` });
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
      res.status(200).send({ data: services });
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
    const employee = await this.employeeService.createEmployee({
      ...req.body
    });

    if (employee) {
      res.status(201).send({
        data: employee
      });
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
      res.status(200).send({ data: deletedEmployee });
    } else {
      res
        .status(404)
        .send({ message: `Employee with id=${req.params.id} not found` });
    }
  };

  private linkEmployeeWithService = async (
    req: TypedRequest<{ employeeId: string; serviceId: string }>,
    res: Response
  ) => {
    const newLinkedService = await this.employeeService.linkEmployeeWithService(
      parseInt(req.params.employeeId),
      parseInt(req.params.serviceId)
    );

    if (newLinkedService !== null) {
      res.status(200).send({ data: newLinkedService });
    } else {
      res.status(404).send({
        message: `Employee with id=${req.params.employeeId} or service with id=${req.params.serviceId} not found`
      });
    }
  };
}
