import { TestBed } from '@angular/core/testing';
import { homeAccountOwner, homeDefinition } from '@domain/home/testing/home-fixtures';
import { HomeTemplateCatalog, HOME_COMPLETE_RECIPES } from './home-template-catalog.service';

describe('complete Home recipe catalog', () => {
  it('exposes only Blank until complete recipes are provided and leaves starter initialization unavailable', () => {
    const catalog = TestBed.inject(HomeTemplateCatalog);
    expect(catalog.choices.map(choice => choice.template)).toEqual(['blank']);
    expect(catalog.build('blank', 'account-a', homeAccountOwner).charts).toEqual([]);
    expect(catalog.starterBlueprints('account-a', homeAccountOwner)).toBeUndefined();
    expect(() => catalog.build('home', 'account-a', homeAccountOwner)).toThrow('not available');
  });
  it('consumes a complete provider recipe without advertising missing starter compositions', () => {
    TestBed.configureTestingModule({ providers: [{ provide: HOME_COMPLETE_RECIPES, useValue: [{ template: 'home', label: 'Complete test recipe', description: 'Provider boundary fixture', complete: true,
      build: () => ({ template: 'home', version: 3, dashboard: homeDefinition(), charts: [] }) }] }] });
    const catalog = TestBed.inject(HomeTemplateCatalog);
    expect(catalog.build('home', 'account-a', homeAccountOwner)).toMatchObject({ template: 'home', version: 3 });
    expect(catalog.starterBlueprints('account-a', homeAccountOwner)).toBeUndefined();
  });
});
