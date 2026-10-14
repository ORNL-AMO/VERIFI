import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';
import { AnalysisNavigationStage, AnalysisStageNavigationComponent } from './analysis-stage-navigation.component';

describe('AnalysisStageNavigationComponent', () => {
  it.each(['vertical', 'horizontal'] as const)('announces blocking errors for every stage kind without an attention summary in %s layout', layout => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AnalysisStageNavigationComponent);
    const kinds: readonly AnalysisNavigationStage['kind'][] = ['analysis', 'group', 'facility', 'used-by', undefined];
    fixture.componentRef.setInput('layout', layout);
    fixture.componentRef.setInput('ariaLabel', 'Analysis progress');
    fixture.componentRef.setInput('stages', kinds.flatMap(kind => [true, false].map(canOpen => ({
      id: `${kind ?? 'account'}-${canOpen}`, kind, label: kind === 'facility' ? 'Facility Results' : 'Stage',
      route: ['/stage'], current: false, completed: false, hasBlockingErrors: true, canOpen
    }))));
    fixture.detectChanges();

    const rows = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('li'));
    expect(rows).toHaveLength(10);
    for (const [index, row] of rows.entries()) {
      expect(row.textContent).toContain('Has blocking errors');
      expect(row.querySelector('.v1-status-attention')).toBeNull();
      expect(row.querySelector('a') !== null).toBe(index % 2 === 0);
      if (index % 2 === 1) expect(row.querySelector('[aria-disabled="true"]')).not.toBeNull();
    }
    const icons = fixture.debugElement.queryAll(By.css('.v1-analysis-stages__marker app-ui-icon'));
    expect(icons.map(icon => icon.componentInstance.name)).toEqual(Array(10).fill('badgeAlert'));
  });

  it.each(['vertical', 'horizontal'] as const)('preserves warning completion and disabled-stage descriptions in %s layout', layout => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AnalysisStageNavigationComponent);
    fixture.componentRef.setInput('layout', layout);
    fixture.componentRef.setInput('ariaLabel', 'Analysis progress');
    fixture.componentRef.setInput('stages', [true, false].map((canOpen, index) => ({
      id: `group:${index}`, kind: 'group', label: `Group ${index}`, route: ['/group', String(index)],
      current: index === 0, completed: true, hasBlockingErrors: false, canOpen,
      attention: { total: 1, errorCount: 0, warningCount: 1, state: 'warning' }
    })));
    fixture.detectChanges();
    const rows = Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('li'));
    expect(rows[0].querySelector('a')?.getAttribute('aria-current')).toBe('step');
    expect(rows[1].querySelector('a')).toBeNull();
    expect(rows[1].querySelector('[aria-disabled="true"]')).not.toBeNull();
    for (const row of rows) {
      expect(row.textContent).toContain('Complete');
      expect(row.textContent).toContain('1 issue: 0 errors, 1 warning');
      expect(row.querySelector('.v1-status-attention [aria-hidden="true"]')?.textContent).toBe(layout === 'vertical' ? '1' : '!');
    }
  });

  it.each([true, false])('keeps the complete issue breakdown when a blocking marker suppresses the badge (canOpen=%s)', canOpen => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(AnalysisStageNavigationComponent);
    fixture.componentRef.setInput('ariaLabel', 'Analysis progress');
    fixture.componentRef.setInput('stages', [{
      id: 'setup', label: 'Setup', icon: 'settings', route: ['/setup'],
      current: true, completed: false, hasBlockingErrors: true, canOpen,
      attention: { total: 3, errorCount: 1, warningCount: 2, state: 'error' }
    }]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Has blocking errors');
    expect(fixture.nativeElement.textContent).toContain('3 issues: 1 error, 2 warnings');
    expect(fixture.nativeElement.querySelector('.v1-status-attention')).toBeNull();
    const icon = fixture.debugElement.query(By.css('app-ui-icon'));
    expect(icon.componentInstance.name).toBe('badgeAlert');
  });
});
