import { faker } from '@faker-js/faker';
import { Frequency, Status } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import short from 'short-uuid';
import { expect } from 'vitest';

import { advanceDateByMinutes } from '~/utils/dateUtils';

export const reservationFixture = () => ({
  // addressId: expect.any(Number),
  // bookerEmail: faker.internet.email(),
  bookerFirstName: faker.person.firstName(),
  bookerLastName: faker.person.lastName(),
  extraInfo: null,
  frequency: Frequency.ONCE,
  // id: expect.any(Number),
  name: `reservation-${short.generate()}`
});

export const unitFixture = () => ({
  // id: expect.any(Number),
  fullName: faker.lorem.word(),
  shortName: faker.lorem.word(),
  price: faker.number.int({ min: 1, max: 200 }),
  duration: faker.number.int({ min: 1, max: 60 })
});

export const serviceFixture = () => ({
  detergentsCost: '0',
  // id: expect.any(Number),
  isPrimary: false,
  minCostIfPrimary: null,
  minNumberOfUnitsIfPrimary: null,
  name: faker.lorem.word()
  // reservationId: expect.any(Number),
  // unitId: null
});

const visitStartDate = new Date('2024-01-01').toISOString();

export const visitFixture = () => ({
  canDateBeChanged: true,
  detergentsCost: '0'
  // id: expect.any(Number),
  // reservationId: expect.any(Number)
});

export const visitPartFixture = () => ({
  cost: '123',
  // employeeId: expect.any(Number),
  endDate: advanceDateByMinutes(visitStartDate, 240).toISOString(),
  // id: expect.any(Number),
  numberOfUnits: 12,
  // serviceId: expect.any(Number),
  startDate: visitStartDate,
  status: Status.ACTIVE
  // visitId: expect.any(Number)
});

export const employeeFixture = () => ({
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  password: bcrypt.hashSync('password', 8),
  // id: expect.any(Number),
  isAdmin: false,
  lastName: faker.person.lastName(),
  phone: '123456789'
});

export const clientFixture = () => ({
  // id: expect.any(Number),
  email: faker.internet.email(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  password: bcrypt.hashSync('password', 8),
  phone: '123456789'
});

export const addressFixture = () => ({
  street: faker.location.street(),
  postCode: '12-345',
  houseNumber: faker.location.buildingNumber()
  // id: expect.any(Number)
});

export const employeeServiceFixture = () => ({
  employeeId: expect.any(Number),
  serviceId: expect.any(Number)
});

export const cleaningFrequencyFixture = () => ({
  // id: expect.any(Number),
  name: faker.lorem.word(),
  value: Frequency.ONCE
});

export const reservationServiceFixture = () => ({
  // id: expect.any(Number),
  // reservationId: expect.any(Number),
  // serviceId: expect.any(Number),
  isMainServiceForReservation: false
});
