import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { PortfolioDetailPreferencesService, PORTFOLIO_DETAIL_STORAGE_KEY } from './portfolio-detail-preferences.service';

describe('portfolio detail preferences', () => {
  function setup(stored: unknown = null) {
    const storage = { retrieve: vi.fn(() => stored), store: vi.fn((_key: string, next: unknown) => { stored = next; }) };
    TestBed.configureTestingModule({ providers: [{ provide: LocalStorageService, useValue: storage }] });
    return { service: TestBed.inject(PortfolioDetailPreferencesService), storage };
  }
  it.each([null, [], 'detailed', 42, { '["a","meters"]': 'unknown' }])('defaults safely for invalid or missing storage %s', stored => {
    const { service } = setup(stored);
    expect(service.read('a', 'meters')).toBe('simple');
    expect(service.read('a', 'analyses')).toBe('simple');
    expect(service.read('a', 'facilityAnalyses')).toBe('summary');
  });
  it('persists only detail levels, isolated by account and resource, and reloads them in a new service', () => {
    const { service, storage } = setup();
    service.save('a', 'meters', 'summary'); service.save('a', 'predictors', 'detailed'); service.save('b', 'meters', 'detailed');
    expect(service.read('a', 'facilities')).toBe('simple');
    expect(storage.store).toHaveBeenLastCalledWith(PORTFOLIO_DETAIL_STORAGE_KEY, { '["a","meters"]': 'summary', '["a","predictors"]': 'detailed', '["b","meters"]': 'detailed' });
    const reloaded = TestBed.runInInjectionContext(() => new PortfolioDetailPreferencesService());
    expect(reloaded.read('a', 'meters')).toBe('summary'); expect(reloaded.read('b', 'meters')).toBe('detailed');
    service.save('a', 'facilityAnalyses', 'simple');
    const restored = TestBed.runInInjectionContext(() => new PortfolioDetailPreferencesService());
    expect(restored.read('a', 'facilityAnalyses')).toBe('simple');
  });
  it('keeps browsing and in-memory preferences working when storage throws', () => {
    const { service, storage } = setup(); storage.retrieve.mockImplementation(() => { throw Error('Blocked'); });
    storage.store.mockImplementation(() => { throw Error('Full'); });
    expect(service.read('a', 'meters')).toBe('simple');
    expect(() => service.save('a', 'meters', 'detailed')).not.toThrow();
    expect(service.read('a', 'meters')).toBe('detailed');
  });
});
