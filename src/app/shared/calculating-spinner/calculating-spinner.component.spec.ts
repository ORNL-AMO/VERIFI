import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalculatingSpinnerComponent } from './calculating-spinner.component';

describe('CalculatingSpinnerComponent', () => {
  let component: CalculatingSpinnerComponent;
  let fixture: ComponentFixture<CalculatingSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CalculatingSpinnerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalculatingSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
