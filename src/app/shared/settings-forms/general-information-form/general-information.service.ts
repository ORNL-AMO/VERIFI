import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class GeneralInformationService {
  constructor(private http: HttpClient) { }

  async getCompleteAddress(address: string): Promise<Array<NominatimResponse>> {
    if(address){
      let url = `https://nominatim.openstreetmap.org/search?q=${address}&format=json&addressdetails=1`;
      try{
        const response = await fetch(url);
        const data = await response.json();
        if(data.length > 0){
          return data;
        }
      } catch (err) {
        return [];
      }
    }
    return null;
  }
}

export interface NominatimResponse {
  place_id: string;
  display_name: string;
  address: {
    postcode: string;
    city: string;
    town: string;
    state: string;
    country: string;
    country_code: string;
    house_number: string;
    road: string;
  }
}
