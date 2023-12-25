-- This script was generated by the ERD tool in pgAdmin 4.
-- Please log an issue at https://redmine.postgresql.org/projects/pgadmin4/issues/new if you find any bugs, including reproduction steps.
BEGIN;


CREATE TABLE IF NOT EXISTS public."Address"
(
    id integer NOT NULL DEFAULT nextval('"Address_id_seq"'::regclass),
    street character varying(40) COLLATE pg_catalog."default" NOT NULL,
    "houseNumber" character varying(6) COLLATE pg_catalog."default" NOT NULL,
    "postCode" character varying(6) COLLATE pg_catalog."default" NOT NULL,
    city character varying(40) COLLATE pg_catalog."default" NOT NULL,
    CONSTRAINT "Address_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public."CleaningFrequency"
(
    id integer NOT NULL DEFAULT nextval('"CleaningFrequency_id_seq"'::regclass),
    name text COLLATE pg_catalog."default" NOT NULL,
    value "Frequency" NOT NULL,
    CONSTRAINT "CleaningFrequency_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public."Client"
(
    id integer NOT NULL DEFAULT nextval('"Client_id_seq"'::regclass),
    "firstName" character varying(50) COLLATE pg_catalog."default",
    "lastName" character varying(50) COLLATE pg_catalog."default",
    email character varying(40) COLLATE pg_catalog."default" NOT NULL,
    password character varying(60) COLLATE pg_catalog."default",
    phone character varying(15) COLLATE pg_catalog."default",
    CONSTRAINT "Client_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public."Employee"
(
    id integer NOT NULL DEFAULT nextval('"Employee_id_seq"'::regclass),
    "firstName" character varying(50) COLLATE pg_catalog."default" NOT NULL,
    "lastName" character varying(50) COLLATE pg_catalog."default" NOT NULL,
    email character varying(40) COLLATE pg_catalog."default" NOT NULL,
    password character varying(60) COLLATE pg_catalog."default" NOT NULL,
    "isAdmin" boolean NOT NULL DEFAULT false,
    phone character varying(15) COLLATE pg_catalog."default",
    CONSTRAINT "Employee_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public."EmployeeService"
(
    "employeeId" integer NOT NULL,
    "serviceId" integer NOT NULL,
    CONSTRAINT "EmployeeService_pkey" PRIMARY KEY ("employeeId", "serviceId")
);

CREATE TABLE IF NOT EXISTS public."Reservation"
(
    id integer NOT NULL DEFAULT nextval('"Reservation_id_seq"'::regclass),
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    frequency "Frequency" NOT NULL,
    status "Status" NOT NULL,
    "bookerEmail" text COLLATE pg_catalog."default" NOT NULL,
    "addressId" integer NOT NULL,
    "bookerFirstName" character varying(50) COLLATE pg_catalog."default" NOT NULL,
    "bookerLastName" character varying(50) COLLATE pg_catalog."default" NOT NULL,
    "extraInfo" character varying(500) COLLATE pg_catalog."default",
    CONSTRAINT "Reservation_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public."ReservationService"
(
    "reservationId" integer NOT NULL,
    "serviceId" integer NOT NULL,
    "isMainServiceForReservation" boolean NOT NULL DEFAULT false,
    CONSTRAINT "ReservationService_pkey" PRIMARY KEY ("reservationId", "serviceId")
);

CREATE TABLE IF NOT EXISTS public."Service"
(
    id integer NOT NULL DEFAULT nextval('"Service_id_seq"'::regclass),
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    "unitId" integer,
    "isPrimary" boolean NOT NULL DEFAULT false,
    "minNumberOfUnitsIfPrimary" integer,
    "minCostIfPrimary" money,
    CONSTRAINT "Service_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public."Unit"
(
    id integer NOT NULL DEFAULT nextval('"Unit_id_seq"'::regclass),
    "shortName" character varying(40) COLLATE pg_catalog."default" NOT NULL,
    "fullName" character varying(60) COLLATE pg_catalog."default" NOT NULL,
    price money NOT NULL,
    duration integer NOT NULL,
    CONSTRAINT "Unit_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public."Visit"
(
    id integer NOT NULL DEFAULT nextval('"Visit_id_seq"'::regclass),
    "includeDetergents" boolean NOT NULL,
    "reservationId" integer NOT NULL,
    "canDateBeChanged" boolean NOT NULL DEFAULT true,
    CONSTRAINT "Visit_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public."VisitPart"
(
    "visitId" integer NOT NULL,
    "serviceId" integer NOT NULL,
    "employeeId" integer NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "numberOfUnits" integer NOT NULL,
    status "Status" NOT NULL DEFAULT 'TO_BE_CONFIRMED'::"Status",
    cost money NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    id integer NOT NULL DEFAULT nextval('"VisitPart_id_seq"'::regclass),
    CONSTRAINT "VisitPart_pkey" PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public."_CleaningFrequencyToService"
(
    "A" integer NOT NULL,
    "B" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public."_PrimarySecondaryService"
(
    "A" integer NOT NULL,
    "B" integer NOT NULL
);

ALTER TABLE IF EXISTS public."EmployeeService"
    ADD CONSTRAINT "EmployeeService_employeeId_fkey" FOREIGN KEY ("employeeId")
    REFERENCES public."Employee" (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE RESTRICT;


ALTER TABLE IF EXISTS public."EmployeeService"
    ADD CONSTRAINT "EmployeeService_serviceId_fkey" FOREIGN KEY ("serviceId")
    REFERENCES public."Service" (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE RESTRICT;


ALTER TABLE IF EXISTS public."Reservation"
    ADD CONSTRAINT "Reservation_addressId_fkey" FOREIGN KEY ("addressId")
    REFERENCES public."Address" (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE RESTRICT;


ALTER TABLE IF EXISTS public."Reservation"
    ADD CONSTRAINT "Reservation_bookerEmail_fkey" FOREIGN KEY ("bookerEmail")
    REFERENCES public."Client" (email) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE;


ALTER TABLE IF EXISTS public."ReservationService"
    ADD CONSTRAINT "ReservationService_reservationId_fkey" FOREIGN KEY ("reservationId")
    REFERENCES public."Reservation" (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE;


ALTER TABLE IF EXISTS public."ReservationService"
    ADD CONSTRAINT "ReservationService_serviceId_fkey" FOREIGN KEY ("serviceId")
    REFERENCES public."Service" (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE;


ALTER TABLE IF EXISTS public."Service"
    ADD CONSTRAINT "Service_unitId_fkey" FOREIGN KEY ("unitId")
    REFERENCES public."Unit" (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "Service_unitId_key"
    ON public."Service"("unitId");


ALTER TABLE IF EXISTS public."Visit"
    ADD CONSTRAINT "Visit_reservationId_fkey" FOREIGN KEY ("reservationId")
    REFERENCES public."Reservation" (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE;


ALTER TABLE IF EXISTS public."VisitPart"
    ADD CONSTRAINT "VisitPart_employeeId_serviceId_fkey" FOREIGN KEY ("employeeId", "serviceId")
    REFERENCES public."EmployeeService" ("employeeId", "serviceId") MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE;


ALTER TABLE IF EXISTS public."VisitPart"
    ADD CONSTRAINT "VisitPart_visitId_fkey" FOREIGN KEY ("visitId")
    REFERENCES public."Visit" (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE;


ALTER TABLE IF EXISTS public."_CleaningFrequencyToService"
    ADD CONSTRAINT "_CleaningFrequencyToService_A_fkey" FOREIGN KEY ("A")
    REFERENCES public."CleaningFrequency" (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE;


ALTER TABLE IF EXISTS public."_CleaningFrequencyToService"
    ADD CONSTRAINT "_CleaningFrequencyToService_B_fkey" FOREIGN KEY ("B")
    REFERENCES public."Service" (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "_CleaningFrequencyToService_B_index"
    ON public."_CleaningFrequencyToService"("B");


ALTER TABLE IF EXISTS public."_PrimarySecondaryService"
    ADD CONSTRAINT "_PrimarySecondaryService_A_fkey" FOREIGN KEY ("A")
    REFERENCES public."Service" (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE;


ALTER TABLE IF EXISTS public."_PrimarySecondaryService"
    ADD CONSTRAINT "_PrimarySecondaryService_B_fkey" FOREIGN KEY ("B")
    REFERENCES public."Service" (id) MATCH SIMPLE
    ON UPDATE CASCADE
    ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "_PrimarySecondaryService_B_index"
    ON public."_PrimarySecondaryService"("B");

END;