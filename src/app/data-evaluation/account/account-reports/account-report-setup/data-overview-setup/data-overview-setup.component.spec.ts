import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataOverviewSetupComponent } from './data-overview-setup.component';

describe('DataOverviewSetupComponent', () => {
  let component: DataOverviewSetupComponent;
  let fixture: ComponentFixture<DataOverviewSetupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DataOverviewSetupComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataOverviewSetupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
