export type P1SectionId = 'home' | 'data' | 'visualization' | 'analysis' | 'reports' | 'settings' | 'imports';
export type P1ContextMode = 'account' | 'facility';
export type P1PanelTabId = 'help' | 'todos' | 'results' | 'details';
export type P1StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface P1AccountSummary {
  id: string;
  name: string;
  descriptor: string;
  lastModified: string;
  facilityCount?: number;
  facilityCountLabel: string;
  meterCountLabel: string;
  predictorCountLabel: string;
  reportCountLabel: string;
  status: string;
  isActive: boolean;
}

export interface P1FacilitySummary {
  id: string;
  accountId: string;
  name: string;
  location: string;
  status: string;
  meters: number;
  meterReadings: number;
  predictors: number;
  analyses: number;
  reports: number;
  equipment: number;
  footprint: string;
}

export interface P1WelcomeAction {
  title: string;
  summary: string;
  icon: string;
  tone: 'primary' | 'secondary' | 'success';
  cta: string;
}

export interface P1SectionDefinition {
  id: P1SectionId;
  label: string;
  shortLabel: string;
  icon: string;
  utility?: boolean;
}

export interface P1NavItem {
  id: string;
  routeId?: string;
  label: string;
  meta?: string;
  status?: P1StatusTone;
  queryParams?: Record<string, string | undefined>;
  children?: Array<P1NavItem>;
}

export interface P1NavGroup {
  title: string;
  items: Array<P1NavItem>;
}

export interface P1Metric {
  label: string;
  value: string;
  trend: string;
  tone: P1StatusTone;
}

export interface P1ContentCard {
  title: string;
  summary: string;
  meta: string;
  tone: P1StatusTone;
}

export interface P1WorkspaceContent {
  eyebrow: string;
  title: string;
  summary: string;
  primaryAction: string;
  metrics: Array<P1Metric>;
  cards: Array<P1ContentCard>;
  activity: Array<string>;
}

export interface P1PanelContent {
  help: Array<string>;
  todos: Array<P1ContentCard>;
  results: Array<P1Metric>;
  details: Array<P1ContentCard>;
}

export type P1ViewStatus = 'loading' | 'empty' | 'error' | 'ready';

export interface P1ViewState {
  status: P1ViewStatus;
  message: string;
}

export interface P1PrototypeData {
  state: P1ViewState;
  selectedAccountId?: string;
  selectedFacilityId?: string;
  accounts: Array<P1AccountSummary>;
  facilities: Array<P1FacilitySummary>;
  welcomeActions: Array<P1WelcomeAction>;
  sections: Array<P1SectionDefinition>;
  nav: Record<P1ContextMode, Record<P1SectionId, Array<P1NavGroup>>>;
  content: Record<P1ContextMode, Record<P1SectionId, P1WorkspaceContent>>;
  panel: Record<P1ContextMode, Record<P1SectionId, P1PanelContent>>;
}
