import { createEnvironmentInjector, EnvironmentInjector, importProvidersFrom } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { VisualizationSourceProvider } from '@domain/visualizations/visualization-source-provider';
import { PreviewModule } from './preview.module';
import { PreviewDateContextResolver, PreviewRegistry, VISUALIZATION_DATE_CONTEXT_RESOLVER,
  VISUALIZATION_PREVIEW_PRESENTERS, VISUALIZATION_SOURCE_PROVIDERS,
  VisualizationPreviewPresenter } from './preview-registry';

class AdapterFixture { }

function registrations() {
  const source: VisualizationSourceProvider = { kind: 'utility',
    describe: vi.fn<VisualizationSourceProvider['describe']>(),
    supportsChart: vi.fn<VisualizationSourceProvider['supportsChart']>(),
    resolve: vi.fn<VisualizationSourceProvider['resolve']>() };
  const presenter: VisualizationPreviewPresenter = { kind: 'time-series', component: AdapterFixture,
    prepare: vi.fn<VisualizationPreviewPresenter['prepare']>() };
  const dates: PreviewDateContextResolver = { resolve: vi.fn<PreviewDateContextResolver['resolve']>() };
  return { source, presenter, dates, providers: [
    { provide: VISUALIZATION_SOURCE_PROVIDERS, multi: true, useValue: source },
    { provide: VISUALIZATION_PREVIEW_PRESENTERS, multi: true, useValue: presenter },
    { provide: VISUALIZATION_DATE_CONTEXT_RESOLVER, useValue: dates }
  ] };
}

describe('feature-scoped visualization preview registrations', () => {
  it('resolves lazy feature registrations through PreviewModule without using or altering another injector', () => {
    const parent = registrations(), selected = registrations(), other = registrations();
    TestBed.configureTestingModule({ providers: parent.providers });
    const application = TestBed.inject(EnvironmentInjector);
    const feature = createEnvironmentInjector([importProvidersFrom(PreviewModule), ...selected.providers], application);
    const sibling = createEnvironmentInjector([importProvidersFrom(PreviewModule), ...other.providers], application);
    const inherited = createEnvironmentInjector([importProvidersFrom(PreviewModule)], application);
    try {
      const registry = feature.get(PreviewRegistry), siblingRegistry = sibling.get(PreviewRegistry), inheritedRegistry = inherited.get(PreviewRegistry);
      expect(registry.provider('utility')).toBe(selected.source);
      expect(registry.presenter('time-series')).toBe(selected.presenter);
      expect(registry.dates).toBe(selected.dates);
      expect(siblingRegistry.provider('utility')).toBe(other.source);
      expect(siblingRegistry.presenter('time-series')).toBe(other.presenter);
      expect(siblingRegistry.dates).toBe(other.dates);
      expect(inheritedRegistry.provider('utility')).toBe(parent.source);
      expect(inheritedRegistry.presenter('time-series')).toBe(parent.presenter);
      expect(inheritedRegistry.dates).toBe(parent.dates);
      expect(registry).not.toBe(siblingRegistry); expect(registry).not.toBe(inheritedRegistry);
      expect(application.get(PreviewRegistry, null)).toBeNull();
      expect(application.get(VISUALIZATION_SOURCE_PROVIDERS)).toEqual([parent.source]);
      expect(application.get(VISUALIZATION_PREVIEW_PRESENTERS)).toEqual([parent.presenter]);
      expect(application.get(VISUALIZATION_DATE_CONTEXT_RESOLVER)).toBe(parent.dates);
    } finally { inherited.destroy(); sibling.destroy(); feature.destroy(); }
  });

  it('keeps the empty registration defaults when the feature has no adapters', () => {
    TestBed.configureTestingModule({});
    const feature = createEnvironmentInjector([importProvidersFrom(PreviewModule)], TestBed.inject(EnvironmentInjector));
    try {
      const registry = feature.get(PreviewRegistry);
      expect(registry.provider('utility')).toBeUndefined();
      expect(registry.presenter('time-series')).toBeUndefined();
      expect(registry.dates).toBeUndefined();
    } finally { feature.destroy(); }
  });
});
