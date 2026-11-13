import { firstValueFrom } from 'rxjs';
import { userDefinedInspectionFixture } from '@domain/calculations/analysis-calculations/testing/user-defined-inspection.fixture';
import { runUserDefinedInspection } from './user-defined-inspection-calculation';

describe('User-defined inspection chart Worker in Chromium', () => {
  const NativeWorker = globalThis.Worker;
  const terminations: Array<ReturnType<typeof vi.spyOn>> = [];
  class EmittedAssetWorker extends NativeWorker {
    constructor(url: string | URL, options?: WorkerOptions) {
      // Angular emits the Worker at the bundle root; Vitest rebases import.meta.url to the source directory.
      super(new URL(new URL(String(url)).pathname.split('/').pop()!, location.origin + '/'), options);
      terminations.push(vi.spyOn(this as Worker, 'terminate'));
    }
  }
  afterEach(() => { vi.unstubAllGlobals(); terminations.length = 0; });

  it.each([false, true])('matches the fallback for a pre-baseline model period (fiscal: %s) and terminates the Worker', async fiscal => {
    const request = userDefinedInspectionFixture();
    if (fiscal) { request.facility.fiscalYear = 'nonCalendarYear'; request.facility.fiscalYearMonth = 6; }
    const original = structuredClone(request);
    vi.stubGlobal('Worker', undefined);
    const fallback = await firstValueFrom(runUserDefinedInspection(request));
    vi.stubGlobal('Worker', EmittedAssetWorker);
    const response = await firstValueFrom(runUserDefinedInspection(request));
    expect(response).toEqual(fallback);
    expect(response.chartData!.filter(point => point.date.getFullYear() === 2023)).toHaveLength(12);
    expect(response.chartData![0]).toEqual({ date: new Date(2023, 0, 1), energyUse: 100, modeledEnergy: 21 });
    expect(terminations[0]).toHaveBeenCalledOnce();
    expect(request).toEqual(original);
  });

  it('reports invalid Worker requests through the inspection error contract', async () => {
    vi.stubGlobal('Worker', EmittedAssetWorker);
    const request = userDefinedInspectionFixture();
    request.selectedGroup = undefined;
    expect(await firstValueFrom(runUserDefinedInspection(request))).toEqual({ error: true });
    expect(terminations[0]).toHaveBeenCalledOnce();
  });
});
