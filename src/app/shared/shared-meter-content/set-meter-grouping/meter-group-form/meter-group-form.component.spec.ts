import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MeterGroupFormComponent } from './meter-group-form.component';

describe('MeterGroupFormComponent', () => {
  let component: MeterGroupFormComponent;
  let fixture: ComponentFixture<MeterGroupFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MeterGroupFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MeterGroupFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
