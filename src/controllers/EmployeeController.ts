import type { Request, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';

import { validateIdFromParams } from '~/middlewares/common';
import { verifyEmployeeData } from '~/middlewares/employee';

import { EmployeeService } from '~/services';
import { type ZodEmployee } from '~/parsers';
import type { TypedRequest } from '~/types';

import AbstractController from './AbstractController';

export default class EmployeeController extends AbstractController {
  private employeeService = new EmployeeService();

  constructor() {
    super('/employees');
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/', this.getAllEmployees);
    this.router.post('/', verifyEmployeeData, this.createEmployee);
    this.router.get('/:id', validateIdFromParams, this.getEmployeeById);
    this.router.get(
      '/:id/reservations',
      validateIdFromParams,
      this.getEmployeeReservations
    );
    this.router.get(
      '/:id/services',
      validateIdFromParams,
      this.getEmployeeServices
    );
    this.router.delete('/:id', validateIdFromParams, this.deleteEmployeeData);
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
      res.status(404).send({ message: 'Employee not found' });
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
    req: TypedRequest<ParamsDictionary, ZodEmployee>,
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
}
