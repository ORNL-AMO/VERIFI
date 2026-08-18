import { P1SectionDefinition, P1WelcomeAction } from './p1.models';

export const p1WelcomeActions: Array<P1WelcomeAction> = [
  {
    title: 'Create New Account',
    summary: 'Start setup for an account, facilities, meters, predictors, analyses, reports, and backup preferences.',
    icon: 'fa-plus',
    tone: 'primary',
    cta: 'Create account'
  },
  {
    title: 'Upload Account Backup',
    summary: 'Restore or share an existing VERIFI account backup file from another system.',
    icon: 'fa-upload',
    tone: 'secondary',
    cta: 'Upload backup'
  },
  {
    title: 'Load Example Account',
    summary: 'Open a representative manufacturing account and explore the full workspace concept.',
    icon: 'fa-file-circle-plus',
    tone: 'success',
    cta: 'Load example'
  }
];

export const p1Sections: Array<P1SectionDefinition> = [
  { id: 'home', label: 'Home', shortLabel: 'Home', icon: 'fa-house' },
  { id: 'data', label: 'Data', shortLabel: 'Data', icon: 'fa-database' },
  { id: 'visualization', label: 'Visualization', shortLabel: 'Visuals', icon: 'fa-chart-line' },
  { id: 'analysis', label: 'Analysis', shortLabel: 'Analysis', icon: 'fa-chart-simple' },
  { id: 'reports', label: 'Reports', shortLabel: 'Reports', icon: 'fa-file-lines' },
  { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: 'fa-gear', utility: true },
  { id: 'imports', label: 'Imports & Backup', shortLabel: 'Imports', icon: 'fa-file-arrow-up', utility: true }
];
