// import type { Employee } from '@prisma/client';
import type { Request, Response } from 'express';
import { transformIdToNumber } from '~/parsers';

import { EmployeeService } from '~/services';

import AbstractController from './AbstractController';

export default class EmployeeController extends AbstractController {
  private employeeService = new EmployeeService();

  constructor() {
    super('/employees');
    this.createRouters();
  }

  public createRouters() {
    this.router.get('/', this.getAllEmployees);
    this.router.get('/:id', this.getEmployeeById);
    this.router.get('/:id/reservations', this.getEmployeeReservations);
    this.router.get('/:id/services', this.getEmployeeServices);
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

  private getEmployeeById = async (req: Request, res: Response) => {
    const id = transformIdToNumber.parse(req.params.id);

    if (!id) {
      res.status(400).send({ message: 'Employee id not provided' });
      return;
    }

    const employee = await this.employeeService.getEmployeeById(id);

    if (employee) {
      res.status(200).send({
        data: employee
      });
    } else {
      res.status(404).send({ message: 'Employee not found' });
    }
  };

  private getEmployeeReservations = async (req: Request, res: Response) => {
    const id = transformIdToNumber.parse(req.params.id);

    if (!id) {
      res.status(400).send({ message: 'Employee id not provided' });
      return;
    }

    const reservations = await this.employeeService.getEmployeeReservations(id);

    if (reservations !== null) {
      res.status(200).send({ data: reservations });
    } else {
      res.status(400).send({ message: 'Error when receiving reservations' });
    }
  };

  private getEmployeeServices = async (req: Request, res: Response) => {
    const id = transformIdToNumber.parse(req.params.id);

    if (!id) {
      res.status(400).send({ message: 'Employee id not provided' });
      return;
    }

    const services = await this.employeeService.getEmployeeServices(id);

    if (services !== null) {
      res.status(200).send({ data: services });
    } else {
      res.status(400).send({ message: 'Error when receiving reservations' });
    }
  };

  private deleteEmployeeData = async (req: Request, res: Response) => {
    const id = transformIdToNumber.parse(req.params.id);

    if (!id) {
      res.status(400).send({ message: 'Employee id not provided' });
      return;
    }

    const deletedEmployee = await this.employeeService.deleteEmployee(id);

    if (deletedEmployee !== null) {
      res.status(200).send({ data: deletedEmployee });
    } else {
      res.status(400).send({ message: 'Error when deleting employee' });
    }
  };
}
