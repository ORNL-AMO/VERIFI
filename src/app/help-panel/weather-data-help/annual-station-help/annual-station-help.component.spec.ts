import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnualStationHelpComponent } from './annual-station-help.component';

describe('AnnualStationHelpComponent', () => {
  let component: AnnualStationHelpComponent;
  let fixture: ComponentFixture<AnnualStationHelpComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnnualStationHelpComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnnualStationHelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
