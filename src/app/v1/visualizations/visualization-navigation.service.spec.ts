import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { VisualizationNavigationService } from './visualization-navigation.service';

// Creation and ordinary entry use the same navigation; accordion defaults belong to the workbench.
describe('visualization navigation', () => {
  function setup() {
    const navigate = vi.fn(async () => true);
    TestBed.configureTestingModule({ providers: [{ provide: Router, useValue: { navigate } }] });
    return { service: TestBed.inject(VisualizationNavigationService), navigate };
  }

  it('opens the saved visualization for its account and identity', async () => {
    const { service, navigate } = setup();
    await expect(service.open('account-a', 'chart-a')).resolves.toBe(true);
    expect(navigate).toHaveBeenCalledWith(['/v1', 'workspace', 'account', 'account-a', 'visualization', 'workbench', 'chart-a']);
  });

  it('preserves navigation cancellation and errors', async () => {
    const { service, navigate } = setup();
    navigate.mockResolvedValueOnce(false);
    await expect(service.open('account-a', 'chart-a')).resolves.toBe(false);
    navigate.mockRejectedValueOnce(new Error('navigation failed'));
    await expect(service.open('account-a', 'chart-a')).rejects.toThrow('navigation failed');
  });

  it('returns to the remembered facility independently for each account', async () => {
    const { service, navigate } = setup();
    service.rememberReturn('account-a', 'facility-a');
    await service.returnToDashboard('account-a');
    expect(navigate).toHaveBeenLastCalledWith(['/v1', 'workspace', 'account', 'account-a', 'visualization', 'dashboard'], { queryParams: { facility: 'facility-a' } });
    await service.returnToDashboard('account-b');
    expect(navigate).toHaveBeenLastCalledWith(['/v1', 'workspace', 'account', 'account-b', 'visualization', 'dashboard'], { queryParams: {} });
  });
});
