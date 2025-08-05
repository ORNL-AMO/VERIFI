import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterChargesFormComponent } from './meter-charges-form.component';

describe('MeterChargesFormComponent', () => {
  let component: MeterChargesFormComponent;
  let fixture: ComponentFixture<MeterChargesFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterChargesFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterChargesFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
