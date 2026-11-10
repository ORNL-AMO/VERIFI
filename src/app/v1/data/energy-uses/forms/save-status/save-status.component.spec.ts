import { TestBed } from '@angular/core/testing';
import { EnergyUsesModule } from '../../energy-uses.module';
import { SaveStatusComponent } from './save-status.component';

it('announces form save failures and permits retry only when the editor can retry', () => {
  TestBed.configureTestingModule({ imports: [EnergyUsesModule] });
  const fixture = TestBed.createComponent(SaveStatusComponent), retry = vi.fn();
  fixture.componentInstance.retryRequested.subscribe(retry);
  fixture.componentRef.setInput('state', 'error'); fixture.componentRef.setInput('message', 'Save failed'); fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement, button = root.querySelector('button')!;
  expect(root.querySelector('[aria-live="polite"]')?.textContent).toContain('Save failed');
  expect(button.disabled).toBe(true); button.click(); expect(retry).not.toHaveBeenCalled();
  fixture.componentRef.setInput('canRetry', true); fixture.detectChanges(); button.click(); expect(retry).toHaveBeenCalledOnce();
  fixture.componentRef.setInput('state', 'saved'); fixture.componentRef.setInput('message', 'Saved.'); fixture.detectChanges();
  expect(root.querySelector('button')).toBeNull(); expect(root.textContent).toContain('Saved.');
});
