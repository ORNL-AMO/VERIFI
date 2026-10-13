import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { AccountDataModule } from '../account-data.module';
import { AccountPortfolioComponent } from './account-portfolio.component';

// Exercise native ResizeObserver and the same scroll ancestry as the routed browse tabs.
describe('portfolio sticky browse layout', () => {
  it('keeps the header and toolbar connected while scrolling and updates the offset after resizing', async () => {
    TestBed.configureTestingModule({
      imports: [AccountDataModule],
      providers: [
        provideRouter([]),
        { provide: ModalPortalService, useValue: { show: vi.fn(), hide: vi.fn() } },
        { provide: AccountWorkspaceStore, useValue: {
          account: signal({ guid: 'account-a', name: 'Account A' }), facilities: signal([{ guid: 'facility-a' }]),
          meters: signal([]), predictors: signal([]), energyUseEquipment: signal([]),
          accountAnalyses: signal([]), facilityAnalyses: signal([]), facilityReports: signal([]),
          canWrite: signal(true), hasPending: signal(false)
        } }
      ]
    });
    const fixture = TestBed.createComponent(AccountPortfolioComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    host.classList.add('v1-root');
    Object.assign(host.style, { width: '900px', height: '500px', overflow: 'auto' });
    const content = document.createElement('section');
    // A simple routed-toolbar probe avoids unrelated resource services and calculations.
    content.innerHTML = '<form class="v1-data-browse-toolbar">Search controls</form><div style="height:1400px"></div>';
    host.querySelector('.v1-account-portfolio')!.append(content);
    const sticky = host.querySelector('.v1-account-portfolio__sticky') as HTMLElement;
    const toolbar = content.querySelector('form')!;
    await vi.waitFor(() => expect(parseFloat(host.style.getPropertyValue('--portfolio-sticky-height')))
      .toBeCloseTo(sticky.getBoundingClientRect().height, 0));
    host.scrollTop = 350;
    await vi.waitFor(() => {
      expect(sticky.getBoundingClientRect().top).toBeCloseTo(host.getBoundingClientRect().top, 0);
      expect(toolbar.getBoundingClientRect().top).toBeCloseTo(sticky.getBoundingClientRect().bottom, 0);
    });
    sticky.style.paddingBottom = '45px';
    await vi.waitFor(() => {
      expect(parseFloat(host.style.getPropertyValue('--portfolio-sticky-height'))).toBeCloseTo(sticky.getBoundingClientRect().height, 0);
      expect(toolbar.getBoundingClientRect().top).toBeCloseTo(sticky.getBoundingClientRect().bottom, 0);
    });
  });
});
