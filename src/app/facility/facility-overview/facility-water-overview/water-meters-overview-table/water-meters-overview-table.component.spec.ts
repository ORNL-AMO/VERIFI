import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaterMetersOverviewTableComponent } from './water-meters-overview-table.component';

describe('WaterMetersOverviewTableComponent', () => {
  let component: WaterMetersOverviewTableComponent;
  let fixture: ComponentFixture<WaterMetersOverviewTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WaterMetersOverviewTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WaterMetersOverviewTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
