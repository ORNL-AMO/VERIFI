import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SetMeterGroupingComponent } from './set-meter-grouping.component';

describe('SetMeterGroupingComponent', () => {
  let component: SetMeterGroupingComponent;
  let fixture: ComponentFixture<SetMeterGroupingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SetMeterGroupingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SetMeterGroupingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
