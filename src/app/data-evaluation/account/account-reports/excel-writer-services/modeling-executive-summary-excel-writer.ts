import { Injectable } from '@angular/core';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import * as ExcelJS from 'exceljs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { FacilityGroupAnalysisItem } from 'src/app/shared/shared-analysis/calculations/regression-models.service';

@Injectable({
  providedIn: 'root',
})
export class ModelingExecutiveSummaryExcelWriter {

  workbook: ExcelJS.Workbook;
  maxPredictorCount: number;

  constructor(
    private facilityDbService: FacilitydbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService
  ) { }

  exportToExcel(selectedReport: IdbAccountReport, executiveSummaryItems: Array<FacilityGroupAnalysisItem>) {
    this.workbook = new ExcelJS.Workbook();

    let regressionGroupItems: Array<FacilityGroupAnalysisItem> = executiveSummaryItems.filter(item => {
      return item.group.analysisType == 'regression';
    });

    let classicIntensityGroupItems: Array<FacilityGroupAnalysisItem> = executiveSummaryItems.filter(item => {
      return item.group.analysisType == 'energyIntensity';
    });

    let absoluteGroupItems: Array<FacilityGroupAnalysisItem> = executiveSummaryItems.filter(item => {
      return item.group.analysisType == 'absoluteEnergyConsumption';
    });

    this.maxPredictorCount = regressionGroupItems.reduce((max, item) => {
      const predictorCount = item.selectedModel?.predictorVariables.length || 0;
      return predictorCount > max ? predictorCount : max;
    }, 0);

    if ((regressionGroupItems && regressionGroupItems.length > 0) ||
      (classicIntensityGroupItems && classicIntensityGroupItems.length > 0) ||
      (absoluteGroupItems && absoluteGroupItems.length > 0)) {
      this.addExecutiveSummarySheet(this.workbook, regressionGroupItems, classicIntensityGroupItems, absoluteGroupItems);

      this.workbook.xlsx.writeBuffer().then(excelData => {
        let blob: Blob = new Blob([excelData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        let a = document.createElement("a");
        let url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = selectedReport.name + '_Executive_Summary_VERIFI';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      });
    }
  }

  addExecutiveSummarySheet(workbook: ExcelJS.Workbook,
    regressionGroupItems: Array<FacilityGroupAnalysisItem>,
    classicIntensityGroupItems: Array<FacilityGroupAnalysisItem>,
    absoluteGroupItems: Array<FacilityGroupAnalysisItem>
  ) {
    let sheet: ExcelJS.Worksheet = workbook.addWorksheet('Executive Summary');

    let headerRow = ['Facility', 'Group', 'Baseline Year', 'Model Year', 'R2', 'Adjusted R2', 'Model P-Value', 'Model Equation', 'Model Notes', 'Model Validation Failures', 'Data Validation Failures', 'Constant'];

    for (let i = 0; i < this.maxPredictorCount; i++) {
      headerRow.push('Coefficient ' + (i + 1) + ' Name');
      headerRow.push('Coefficient ' + (i + 1) + ' Value');
      headerRow.push('Coefficient ' + (i + 1) + ' p-Value');
    }
    sheet.addRow(headerRow);
    sheet.getRow(1).eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFC0C0C0' }
      };

      cell.font = {
        bold: true,
        size: 10,
        color: { argb: 'FF000000' }
      };

      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };
    });

    if (regressionGroupItems?.length > 0) {
      regressionGroupItems.forEach(item => {
        let row = [
          this.facilityDbService.getFacilityNameById(item.facilityId),
          this.utilityMeterGroupDbService.getGroupName(item.group.idbGroupId),
          item.baselineYear,
          item.group.regressionModelYear,
          item.selectedModel.R2,
          item.selectedModel.adjust_R2,
          item.selectedModel.modelPValue,
          this.getModelEquationString(item),
          item.selectedModel.modelNotes.length > 0 ? item.selectedModel.modelNotes.join('; ') : '—',
          item.selectedModel.isValid ? '—' : item.selectedModel.modelValidationNotes.join('; '),
          item.selectedModel.SEPValidationPass ? '—' : item.selectedModel.dataValidationNotes.join('; '),
          item.selectedModel.coef[0]
        ];
        for (let i = 0; i < this.maxPredictorCount; i++) {
          let coefName = item.selectedModel.predictorVariables[i]?.name || '—';
          let coefValue = item.selectedModel.coef[i + 1] !== undefined ? item.selectedModel.coef[i + 1] : '—';
          let coefPValue = item.selectedModel.t.p[i + 1] !== undefined ? item.selectedModel.t.p[i + 1] : '—';
          row.push(coefName, coefValue, coefPValue);
        }
        sheet.addRow(row);
      });
    }

    if (classicIntensityGroupItems?.length > 0) {
      classicIntensityGroupItems.forEach(item => {
        let row = [
          this.facilityDbService.getFacilityNameById(item.facilityId),
          this.utilityMeterGroupDbService.getGroupName(item.group.idbGroupId),
          item.baselineYear,
          '—',
          '—',
          '—',
          '—',
          this.getPredictorVariables(item),
          'Classic Intensity',
          '—',
          '—',
          '—'
        ];
        for (let i = 0; i < this.maxPredictorCount; i++) {
          row.push('—', '—', '—');
        }
        sheet.addRow(row);
      });
    }

    if (absoluteGroupItems?.length > 0) {
      absoluteGroupItems.forEach(item => {
        let row = [
          this.facilityDbService.getFacilityNameById(item.facilityId),
          this.utilityMeterGroupDbService.getGroupName(item.group.idbGroupId),
          item.baselineYear,
          '—',
          '—',
          '—',
          '—',
          '—',
          'Absolute',
          '—',
          '—',
          '—'
        ];
        for (let i = 0; i < this.maxPredictorCount; i++) {
          row.push('—', '—', '—');
        }
        sheet.addRow(row);
      });
    }

    sheet.getColumn(7).numFmt = '0.000000000000000';
    for (let i = 15; i <= sheet.columnCount; i += 3) {
      sheet.getColumn(i).numFmt = '0.000000000000000';
    }

    for (let i = 1; i <= sheet.columnCount; i++) {
      if (i === 8) {
        sheet.getColumn(i).width = 40;
      } else {
        sheet.getColumn(i).width = 20;
      }
    }

    sheet.eachRow(row => {
      row.height = 30;
    });

  }

  getPredictorVariables(item: FacilityGroupAnalysisItem): string {
    let productionVariables: string = '';
    item.group.predictorVariables.forEach(variable => {
      if (variable.productionInAnalysis) {
        productionVariables = productionVariables + variable.name + '; ';
      }
    });
    return productionVariables;
  }

  getModelEquationString(item: FacilityGroupAnalysisItem): string {
    let coefIndex = 0;
    let valueStr: string;
    for (let coefVal of item.selectedModel.coef) {
      if (coefIndex === 0) {
        valueStr = this.getRegressionNumberString(coefVal);
        coefIndex++;
      }
      else {
        valueStr = valueStr + ' + (' + this.getRegressionNumberString(coefVal) + '*' + item.selectedModel.predictorVariables[coefIndex - 1].name + ')';
        coefIndex++;
      }
    }
    return valueStr;
  }

  getRegressionNumberString(num: number): string {
    if (isNaN(num) == false && num != null) {
      return (num).toLocaleString(undefined, { maximumSignificantDigits: 3, minimumSignificantDigits: 3 });
    }
    return '';
  }
}
