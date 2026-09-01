export type Employee = {
  name: string;
  department: string;
};

export const DEPT_ORDER = [
  "Rough Mill",
  "Mill",
  "CNC",
  "Custom",
  "Pre Assembly",
  "Assembly",
  "Shipping",
  "Trucking",
  "Maintenance",
  "Manufacturing",
] as const;

export const EMPLOYEES: Employee[] = [
  { name: "AGUILAR VILLANUEVA, MIGUEL", department: "Rough Mill" },
  { name: "LUCERO MENDEZ, MANUEL", department: "Rough Mill" },
  { name: "PATRICK, JACOB", department: "Rough Mill" },
  { name: "PEREZ, RAMIRO H", department: "Rough Mill" },
  { name: "VASQUEZ, FRANCISCO", department: "Rough Mill" },
  { name: "CLIMACO BELLO, PEDRO", department: "Mill" },
  { name: "CLIMACO, MARCO", department: "Mill" },
  { name: "LACY, ANTHONY", department: "Mill" },
  { name: "MAYORGA, JOEL SANCHEZ", department: "Mill" },
  { name: "OLIVAREZ, STEVEN", department: "Mill" },
  { name: "OLMOS, JORGE", department: "Mill" },
  { name: "PINEDO, GONZALO", department: "Mill" },
  { name: "ROMERO FLORES, JAVIER", department: "Mill" },
  { name: "MALDONADO, HENRY", department: "CNC" },
  { name: "VILLAFAN SUAREZ, JOSE A", department: "CNC" },
  { name: "CORTEZ, EUGENIO", department: "Custom" },
  { name: "FLORES, KAREN", department: "Custom" },
  { name: "BONILLA, NELSON E", department: "Pre Assembly" },
  { name: "BULFRANO, ANGEL", department: "Pre Assembly" },
  { name: "ESPINOZA, JESUS", department: "Pre Assembly" },
  { name: "GARCIA, ROGELIO", department: "Pre Assembly" },
  { name: "JIMENEZ, VICENTE", department: "Pre Assembly" },
  { name: "ORTIZ PINEDA, TOMAS", department: "Pre Assembly" },
  { name: "PATINO-RODRIGUEZ, JOSE", department: "Pre Assembly" },
  { name: "SOLORZANO VELIZ, FRANCISCO", department: "Pre Assembly" },
  { name: "BARRERA CABRERA, ENRIQUE", department: "Assembly" },
  { name: "BEATRIZ, HELADIA", department: "Assembly" },
  { name: "CARRANZA, RUBEN", department: "Assembly" },
  { name: "CUYUCH, ROMEO", department: "Assembly" },
  { name: "GONZALEZ, DANIEL", department: "Assembly" },
  { name: "MARTINEZ RESENDIZ, MARCELO", department: "Assembly" },
  { name: "MARTINEZ TORRES, ALFREDO", department: "Assembly" },
  { name: "RESENDIZ MUNOZ, JUAN", department: "Assembly" },
  { name: "ROSAS, VICTOR", department: "Assembly" },
  { name: "VENTURA JIMENEZ, DANIEL", department: "Assembly" },
  { name: "CARRENO TRUJILLO, DANIEL", department: "Shipping" },
  { name: "ELIZARRARAZ, JOSE R", department: "Shipping" },
  { name: "ARELLANO, NOEL", department: "Trucking" },
  { name: "CEJA, RODOLFO S", department: "Trucking" },
  { name: "SOPONRATH, JAMIE TONY", department: "Trucking" },
  { name: "MAGDALENO DIAZ, CRISTIAN", department: "Maintenance" },
  { name: "VORN, TONY", department: "Maintenance" },
  { name: "RODRIGUEZ, CALIXTO", department: "Manufacturing" },
];

export const BLANK_ROWS = 6;

export function employeesByDepartment() {
  return DEPT_ORDER.map((department) => ({
    department,
    people: EMPLOYEES.filter((e) => e.department === department),
  })).filter((g) => g.people.length > 0);
}
