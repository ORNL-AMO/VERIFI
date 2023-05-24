import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataOverviewMapComponent } from './data-overview-map.component';

describe('DataOverviewMapComponent', () => {
  let component: DataOverviewMapComponent;
  let fixture: ComponentFixture<DataOverviewMapComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataOverviewMapComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataOverviewMapComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
