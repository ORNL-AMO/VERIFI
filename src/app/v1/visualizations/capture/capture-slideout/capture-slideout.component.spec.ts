import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { VisualizationCaptureSession } from '../visualization-capture-session';
import { CaptureSlideoutModule } from './capture-slideout.module';
import { CaptureSlideoutComponent } from './capture-slideout.component';

describe('capture naming slideout', () => {
  function setup() {
    TestBed.configureTestingModule({ imports: [CaptureSlideoutModule] });
    const fixture = TestBed.createComponent(CaptureSlideoutComponent);
    const session = new VisualizationCaptureSession(() => { throw new Error('Opening or canceling must not resolve persistence'); });
    fixture.componentRef.setInput('definition', { ...utilityVisualizationFixture(), name: 'HQ (Simple) - Monthly Electricity' });
    fixture.componentRef.setInput('session', session); fixture.detectChanges();
    const saved = vi.fn(), closed = vi.fn(); fixture.componentInstance.saveRequested.subscribe(saved); fixture.componentInstance.closed.subscribe(closed);
    return { fixture, session, saved, closed, component: fixture.componentInstance, element: fixture.nativeElement as HTMLElement };
  }
  it('prefills a name and confirms once in the slideout, rejecting whitespace', () => {
    const { fixture, saved, component, element } = setup();
    expect(element.querySelector<HTMLInputElement>('input')!.value).toBe('HQ (Simple) - Monthly Electricity');
    component.name.setValue('  '); element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); fixture.detectChanges();
    expect(saved).not.toHaveBeenCalled(); expect(element.querySelector('[role="alert"]')).toBeTruthy();
    component.name.setValue(' Monthly energy '); element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(saved).toHaveBeenCalledExactlyOnceWith('Monthly energy');
  });
  it('cancels without storage and blocks dismissal and repeated submission during saving', () => {
    const { fixture, component, session, saved, closed, element } = setup();
    (element.querySelector('.v1-workspace-slideout__header button') as HTMLButtonElement).click(); expect(closed).toHaveBeenCalledOnce();
    session.saving.set(true); fixture.detectChanges();
    (element.querySelector('.v1-workspace-slideout-backdrop') as HTMLButtonElement).click(); component.save();
    expect(closed).toHaveBeenCalledOnce(); expect(saved).not.toHaveBeenCalled();
    expect(element.querySelector<HTMLButtonElement>('[type="submit"]')!.disabled).toBe(true);
  });
});
