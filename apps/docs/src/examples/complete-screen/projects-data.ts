export type ProjectStatus = 'Active' | 'Paused';

export type Project = {
  id: string;
  name: string;
  owner: string;
  status: ProjectStatus;
};

export const owners = ['Ada Park', 'Priya Shah', 'Tomás Ruiz'];

export const sampleProjects: Project[] = [
  { id: 'aster', name: 'Aster', owner: 'Ada Park', status: 'Active' },
  { id: 'borealis', name: 'Borealis', owner: 'Priya Shah', status: 'Paused' },
  { id: 'cirrus', name: 'Cirrus', owner: 'Tomás Ruiz', status: 'Active' },
];
