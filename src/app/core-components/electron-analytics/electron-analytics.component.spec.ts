import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElectronAnalyticsComponent } from './electron-analytics.component';

describe('ElectronAnalyticsComponent', () => {
  let component: ElectronAnalyticsComponent;
  let fixture: ComponentFixture<ElectronAnalyticsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ElectronAnalyticsComponent]
    });
    fixture = TestBed.createComponent(ElectronAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
