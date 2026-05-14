import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OperatingHoursModalComponent } from './operating-hours-modal.component';

describe('OperatingHoursModalComponent', () => {
  let component: OperatingHoursModalComponent;
  let fixture: ComponentFixture<OperatingHoursModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [OperatingHoursModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OperatingHoursModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
