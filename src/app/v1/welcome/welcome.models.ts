export interface WelcomeAction {
  readonly title: string;
  readonly summary: string;
  readonly icon: string;
  readonly tone: 'primary' | 'secondary' | 'success';
  readonly cta: string;
  readonly action: 'create' | 'import' | 'example';
}

export interface WelcomeExample {
  readonly title: string;
  readonly assetPath: string;
  readonly summary: string;
  readonly details: ReadonlyArray<string>;
  readonly highlights: ReadonlyArray<string>;
  readonly cta: string;
  readonly isSingleFacilityCompany?: boolean;
}

export const WELCOME_ACTIONS: ReadonlyArray<WelcomeAction> = [
  {
    title: 'Create New Account',
    summary: 'Start setup for an account, facilities, meters, predictors, analyses, reports, and backup preferences.',
    icon: 'fa-plus',
    tone: 'primary',
    cta: 'Create account',
    action: 'create'
  },
  {
    title: 'Upload Account Backup',
    summary: 'Restore or share an existing VERIFI account backup file from another system.',
    icon: 'fa-upload',
    tone: 'secondary',
    cta: 'Upload backup',
    action: 'import'
  },
  {
    title: 'Load Example Account',
    summary: 'Open a representative manufacturing account and explore the full workspace concept.',
    icon: 'fa-file-circle-plus',
    tone: 'secondary',
    cta: 'Load example',
    action: 'example'
  }
];

export const WELCOME_EXAMPLES: ReadonlyArray<WelcomeExample> = [
  {
    title: 'Cocoa Co. Portfolio',
    assetPath: 'assets/example-data/ExampleAccount.json',
    summary: 'A multi-facility account for exploring portfolio navigation, rollups, analyses, reports, and the broader workspace concept.',
    details: [
      'Use this example when you want to see how VERIFI organizes several manufacturing facilities under one corporate account.',
      'It includes utility data, analysis-ready structures, and reporting context that demonstrate account-level and facility-level workflows together.'
    ],
    highlights: ['3 facilities', '9 meters', '4 analysis items', 'Account reports'],
    cta: 'Load Portfolio Example'
  },
  {
    title: 'Cocoa Co. Single Facility',
    assetPath: 'assets/example-data/SingleFacilityExample.json',
    summary: 'A smaller account for walking through one facility setup, meters, utility data, analysis, and focused workflows.',
    details: [
      'Use this example when you want a simpler workspace with less portfolio noise and a faster path through facility-level data entry and analysis.',
      'It is useful for demonstrating the tool to new users who need to understand the basic workflow before scaling up.'
    ],
    highlights: ['1 facility', '5 meters', '2 analysis items', 'Focused walkthrough'],
    cta: 'Load Single Facility Example',
    isSingleFacilityCompany: true
  }
];
