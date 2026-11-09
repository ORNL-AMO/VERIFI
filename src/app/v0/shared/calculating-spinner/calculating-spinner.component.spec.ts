import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalculatingSpinnerComponent } from './calculating-spinner.component';

@NgModule({
  declarations: [CalculatingSpinnerComponent],
  imports: [CommonModule]
})
class CalculatingSpinnerTestModule {}

describe('CalculatingSpinnerComponent', () => {
  it('shows Retry only for retryable errors and emits the retry action', () => {
    TestBed.configureTestingModule({ imports: [CalculatingSpinnerTestModule] });
    const fixture: ComponentFixture<CalculatingSpinnerComponent> = TestBed.createComponent(CalculatingSpinnerComponent);
    const retry = vi.fn();
    fixture.componentInstance.error = true;
    fixture.componentInstance.retryable = true;
    fixture.componentInstance.retry.subscribe(retry);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent.trim()).toBe('Retry');
    button.click();
    expect(retry).toHaveBeenCalledOnce();
  });
});
