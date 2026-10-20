import { PortfolioTile } from './portfolio-inventory.models';

export function portfolioTile(guid: string, overrides: Partial<PortfolioTile> = {}): PortfolioTile {
  return { guid, name: `Item ${guid}`, icon: 'facility', route: ['/facility', guid],
    status: { tone: 'success', icon: 'success', label: 'All data valid' },
    ...overrides };
}
