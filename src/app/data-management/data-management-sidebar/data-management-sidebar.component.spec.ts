import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataManagementSidebarComponent } from './data-management-sidebar.component';

describe('DataManagementSidebarComponent', () => {
  let component: DataManagementSidebarComponent;
  let fixture: ComponentFixture<DataManagementSidebarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DataManagementSidebarComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DataManagementSidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
