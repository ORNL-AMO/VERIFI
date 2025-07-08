import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataManagementHelpPanelComponent } from './data-management-help-panel.component';

describe('DataManagementHelpPanelComponent', () => {
  let component: DataManagementHelpPanelComponent;
  let fixture: ComponentFixture<DataManagementHelpPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataManagementHelpPanelComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataManagementHelpPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
