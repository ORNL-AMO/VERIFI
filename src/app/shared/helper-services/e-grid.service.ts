import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class EGridService {

  subRegionsByZipcode: Array<SubRegionData>;
  co2Emissions: Array<SubregionEmissions>;

  constructor() { }

  parseEGridData() {
    fetch('assets/eGrid_data/eGrid_zipcode_lookup.xlsx')
      .then(response => response.arrayBuffer())
      .then(buffer => {
        let wb: XLSX.WorkBook = XLSX.read(new Uint8Array(buffer), { type: "array", raw: false });
        //zip code regions
        // [0: "ZIP (character)"
        // 1: "ZIP (numeric)"
        // 2: "state"
        // 3: "eGRID Subregion #1"
        // 4: "eGRID Subregion #2"
        // 5: "eGRID Subregion #3"]
        let sheetOne = XLSX.utils.sheet_to_json(wb.Sheets["eGrid_zipcode_lookup"], { raw: false });
        this.setSubRegionsByZip(sheetOne)
        //eGrid data
        //0: SUBRGN
        //1: CO2e
        //2: CH4
        //3: N2O
        let sheetTwo = XLSX.utils.sheet_to_json(wb.Sheets["eGrid_co2"], { raw: false });
        this.setCo2Emissions(sheetTwo);
      });
  }

  setSubRegionsByZip(fileData: Array<any>) {
    let subRegionsByZipcode = new Array<SubRegionData>();
    fileData.forEach(result => {
      if (result['ZIP (character)']) {
        subRegionsByZipcode.push({
          zip: result['ZIP (character)'],
          state: result['state'],
          subregions: [
            result['eGRID Subregion #1'],
            result['eGRID Subregion #2'],
            result['eGRID Subregion #3'],
          ]
        })
      }
    });
    this.subRegionsByZipcode = subRegionsByZipcode;
  }


  setCo2Emissions(csvResults: Array<any>) {
    let co2Emissions = new Array<SubregionEmissions>();
    csvResults.forEach(result => {
      if (result['SUBRGN']) {
        co2Emissions.push({
          subregion: result['SUBRGN'],
          co2Emissions: Number(result['CO2e']),
        })
      }
    });

    this.co2Emissions = co2Emissions;
  }
}

export interface SubRegionData {
  zip: number,
  state: string,
  co2Emissions?: number,
  subregions?: Array<string>
}

export interface SubregionEmissions {
  subregion: string,
  co2Emissions: number
}