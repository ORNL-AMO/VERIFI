import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataManagementSidePanelComponent } from './data-management-side-panel.component';

describe('DataManagementSidePanelComponent', () => {
  let component: DataManagementSidePanelComponent;
  let fixture: ComponentFixture<DataManagementSidePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataManagementSidePanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataManagementSidePanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
