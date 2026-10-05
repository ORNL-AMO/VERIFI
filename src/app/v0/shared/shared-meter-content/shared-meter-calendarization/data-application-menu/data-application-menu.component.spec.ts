import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { CalanderizationService } from '@shared/helper-services/calanderization.service';
import { DataApplicationMenuComponent } from './data-application-menu.component';

@Pipe({ name: 'customNumber', standalone: false })
export class CustomNumberPipeStub implements PipeTransform {
  transform(value: unknown): unknown {
    return value;
  }
}

@NgModule({
  declarations: [DataApplicationMenuComponent, CustomNumberPipeStub],
  imports: [CommonModule, FormsModule],
  schemas: [NO_ERRORS_SCHEMA]
})
class DataApplicationMenuTestModule { }

describe('DataApplicationMenuComponent', () => {
  it('handles calendarization that is not ready without reading an empty result', () => {
    const calendarizationService = {
      getReadyCalanderizedMetersByFacilityID: vi.fn().mockReturnValue(undefined)
    };
    TestBed.configureTestingModule({
      imports: [DataApplicationMenuTestModule],
      providers: [
        { provide: AccountWorkspaceQueryService, useValue: {} },
        { provide: AccountWorkspaceStore, useValue: { selectedFacility: () => ({ guid: 'facility-a' }) } }
      ]
    });
    const component = TestBed.runInInjectionContext(() =>
      new DataApplicationMenuComponent(calendarizationService as unknown as CalanderizationService)
    );
    component.meter = {
      guid: 'meter-a',
      meterReadingDataApplication: 'fullMonth'
    } as any;
    component.utilityMeterData = [{}, {}, {}] as any;

    expect(() => component.calanderizeMeter()).not.toThrow();
    expect(component.monthlyData).toEqual([]);
    expect(component.calanderizationSummary).toEqual([]);
  });
});
