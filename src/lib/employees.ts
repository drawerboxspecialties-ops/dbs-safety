export type Employee = {
  id: string;
  name: string;
  department: string;
};

export function cloneEmployees(list: Employee[]): Employee[] {
  return list.map((e) => ({
    id: e.id,
    name: e.name,
    department: e.department,
  }));
}

export function slugPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function makeEmployeeId(
  name: string,
  department: string,
  existing: { id: string }[] = [],
) {
  const base =
    [slugPart(name), slugPart(department)].filter(Boolean).join("__") ||
    `employee-${Date.now()}`;
  if (!existing.some((e) => e.id === base)) return base;
  let id = base;
  let n = 2;
  while (existing.some((e) => e.id === id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

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

const SEED: { name: string; department: string }[] = [
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

export const EMPLOYEES: Employee[] = SEED.map((person) => ({
  id: makeEmployeeId(person.name, person.department),
  name: person.name,
  department: person.department,
}));

export const BLANK_ROWS = 6;

export function departmentOptions(employees: Employee[] = EMPLOYEES) {
  const extra = employees
    .map((e) => e.department)
    .filter((d) => d && !(DEPT_ORDER as readonly string[]).includes(d));
  return [...DEPT_ORDER, ...Array.from(new Set(extra))];
}

export function employeesByDepartment(employees: Employee[] = EMPLOYEES) {
  const order = departmentOptions(employees);
  return order
    .map((department) => ({
      department,
      people: employees.filter((e) => e.department === department),
    }))
    .filter((g) => g.people.length > 0);
}
