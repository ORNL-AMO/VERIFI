import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmissionsOverviewComponent } from './emissions-overview.component';

describe('EmissionsOverviewComponent', () => {
  let component: EmissionsOverviewComponent;
  let fixture: ComponentFixture<EmissionsOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EmissionsOverviewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmissionsOverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
