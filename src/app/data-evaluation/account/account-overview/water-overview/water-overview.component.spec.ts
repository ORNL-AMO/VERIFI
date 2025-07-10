import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaterOverviewComponent } from './water-overview.component';

describe('WaterOverviewComponent', () => {
  let component: WaterOverviewComponent;
  let fixture: ComponentFixture<WaterOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WaterOverviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WaterOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
