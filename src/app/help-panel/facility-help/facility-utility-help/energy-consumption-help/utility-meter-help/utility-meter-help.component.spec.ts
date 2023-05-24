import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UtilityMeterHelpComponent } from './utility-meter-help.component';

describe('UtilityMeterHelpComponent', () => {
  let component: UtilityMeterHelpComponent;
  let fixture: ComponentFixture<UtilityMeterHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ UtilityMeterHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UtilityMeterHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
