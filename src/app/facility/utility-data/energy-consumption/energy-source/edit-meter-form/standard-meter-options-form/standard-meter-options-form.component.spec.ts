import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StandardMeterOptionsFormComponent } from './standard-meter-options-form.component';

describe('StandardMeterOptionsFormComponent', () => {
  let component: StandardMeterOptionsFormComponent;
  let fixture: ComponentFixture<StandardMeterOptionsFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [StandardMeterOptionsFormComponent]
    });
    fixture = TestBed.createComponent(StandardMeterOptionsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
