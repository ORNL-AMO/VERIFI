import { PortalModule } from '@angular/cdk/portal';
import { Component, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { vi } from 'vitest';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { EditorConflictReviewComponent } from './editor-conflict-review.component';
import { DraftConflict } from '../draft-reconciliation';

@Component({ standalone: true, imports: [EditorConflictReviewComponent, PortalModule],
  template: '<app-editor-conflict-review [conflicts]="conflicts()" (resolved)="resolved($event)"/><ng-template [cdkPortalOutlet]="modal.activePortal()"/>' })
class ConflictHost {
  readonly modal = inject(ModalPortalService);
  conflicts = signal<readonly DraftConflict[]>([{ id: 'name', label: 'Name', localValue: 'Mine', savedValue: 'Theirs' }]);
  readonly resolved = vi.fn();
}

describe('EditorConflictReviewComponent', () => {
  it('requires an explicit choice, permits cancellation, and emits selected application values', () => {
    TestBed.configureTestingModule({ imports: [ConflictHost], providers: [ModalPortalService] });
    const fixture = TestBed.createComponent(ConflictHost); fixture.detectChanges();
    const review = fixture.debugElement.query(By.directive(EditorConflictReviewComponent)).componentInstance as EditorConflictReviewComponent;
    review.open(); fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('[role="dialog"]')?.textContent).toContain('Mine');
    const footer = host.querySelector('footer')!;
    expect(footer.querySelectorAll('button')[0].disabled).toBe(false);
    expect(footer.querySelectorAll('button')[1].disabled).toBe(true);
    review.close(); fixture.detectChanges(); expect(host.querySelector('[role="dialog"]')).toBeNull();
    review.open(); fixture.detectChanges();
    const select = host.querySelector('select')!;
    select.value = 'local'; select.dispatchEvent(new Event('change')); fixture.detectChanges();
    host.querySelectorAll<HTMLButtonElement>('footer button')[1].click(); fixture.detectChanges();
    expect(fixture.componentInstance.resolved).toHaveBeenCalledExactlyOnceWith({ name: 'local' });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });

  it('invalidates an open review if the saved conflict values change', () => {
    TestBed.configureTestingModule({ imports: [ConflictHost], providers: [ModalPortalService] });
    const fixture = TestBed.createComponent(ConflictHost); fixture.detectChanges();
    const review = fixture.debugElement.query(By.directive(EditorConflictReviewComponent)).componentInstance as EditorConflictReviewComponent;
    review.open(); fixture.detectChanges();
    fixture.componentInstance.conflicts.set([{ id: 'name', label: 'Name', localValue: 'Mine', savedValue: 'New saved value' }]);
    fixture.detectChanges();
    expect(fixture.componentInstance.modal.activePortal()).toBeNull();
    expect(fixture.componentInstance.resolved).not.toHaveBeenCalled();
  });
  it('offers only supported deletion choices and rejects unsupported application values', () => {
    TestBed.configureTestingModule({ imports: [ConflictHost], providers: [ModalPortalService] });
    const fixture = TestBed.createComponent(ConflictHost);
    fixture.componentInstance.conflicts.set([{ id: 'year', label: 'Removed year', localValue: 2024, savedValue: undefined, allowedChoices: ['saved'] }]);
    fixture.detectChanges();
    const review = fixture.debugElement.query(By.directive(EditorConflictReviewComponent)).componentInstance as EditorConflictReviewComponent;
    review.open(); fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('option[value="local"]')).toBeNull(); expect(host.querySelector('option[value="saved"]')).not.toBeNull();
    review.choices.controls['year'].setValue('local'); review.confirm();
    expect(fixture.componentInstance.resolved).not.toHaveBeenCalled();
    const select = host.querySelector('select')!; select.value = 'saved'; select.dispatchEvent(new Event('change')); fixture.detectChanges();
    host.querySelectorAll<HTMLButtonElement>('footer button')[1].click(); fixture.detectChanges();
    expect(fixture.componentInstance.resolved).toHaveBeenCalledExactlyOnceWith({ year: 'saved' });
  });
});
