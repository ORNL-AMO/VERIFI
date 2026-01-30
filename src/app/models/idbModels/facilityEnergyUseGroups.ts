import { getNewIdbEntry, IdbEntry } from "./idbEntry";

export interface IdbFacilityEnergyUseGroup extends IdbEntry {
    facilityId: string,
    accountId: string,
    name: string,
    sidebarOpen: boolean,
    notes: string,
    color: string
}

export function getNewIdbFacilityEnergyUseGroup(accountId: string, facilityId: string): IdbFacilityEnergyUseGroup {
    let idbEntry: IdbEntry = getNewIdbEntry();
    return {
        ...idbEntry,
        facilityId: facilityId,
        accountId: accountId,
        name: 'Energy Use Group',
        sidebarOpen: true,
        notes: '',
        color: getRandomFlatHexColor()
    }
}


// function hslToHex(h: number, s: number, l: number): string {
//     s /= 100;
//     l /= 100;
//     const c = (1 - Math.abs(2 * l - 1)) * s;
//     const x = c * (1 - Math.abs((h / 60) % 2 - 1));
//     const m = l - c / 2;
//     let r = 0, g = 0, b = 0;
//     if (h < 60) { r = c; g = x; b = 0; }
//     else if (h < 120) { r = x; g = c; b = 0; }
//     else if (h < 180) { r = 0; g = c; b = x; }
//     else if (h < 240) { r = 0; g = x; b = c; }
//     else if (h < 300) { r = x; g = 0; b = c; }
//     else { r = c; g = 0; b = x; }
//     r = Math.round((r + m) * 255);
//     g = Math.round((g + m) * 255);
//     b = Math.round((b + m) * 255);
//     return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
// }

export function getRandomFlatHexColor(): string {
    //generate random color
    // let str: string = Math.random().toString(36).substring(2, 15);
    // let hash = 0;
    // for (let i = 0; i < str.length; i++) {
    //     hash = str.charCodeAt(i) + ((hash << 5) - hash);
    // }
    // const hue = Math.abs(hash) % 360;
    // const saturation = 70;
    // const lightness = 55;
    // return hslToHex(hue, saturation, lightness);
    const randomIndex = Math.floor(Math.random() * Colors.length);
    return Colors[randomIndex];
}

export const Colors = [
    '#F9EBEA',
    '#F2D7D5',
    '#E6B0AA',
    '#D98880',
    '#CD6155',
    '#C0392B',
    '#A93226',
    '#922B21',
    '#7B241C',
    '#641E16',
    '#FDEDEC',
    '#FADBD8',
    '#F5B7B1',
    '#F1948A',
    '#EC7063',
    '#E74C3C',
    '#CB4335',
    '#B03A2E',
    '#943126',
    '#78281F',
    '#F5EEF8',
    '#EBDEF0',
    '#D7BDE2',
    '#C39BD3',
    '#AF7AC5',
    '#9B59B6',
    '#884EA0',
    '#76448A',
    '#633974',
    '#512E5F',
    '#F4ECF7',
    '#E8DAEF',
    '#D2B4DE',
    '#BB8FCE',
    '#A569BD',
    '#8E44AD',
    '#7D3C98',
    '#6C3483',
    '#5B2C6F',
    '#4A235A',

    '#EAF2F8',
    '#D4E6F1',
    '#A9CCE3',
    '#7FB3D5',
    '#5499C7',
    '#2980B9',
    '#2471A3',
    '#1F618D',
    '#1A5276',
    '#154360',
    '#EBF5FB',
    '#D6EAF8',
    '#AED6F1',
    '#85C1E9',
    '#5DADE2',
    '#3498DB',
    '#2E86C1',
    '#2874A6',
    '#21618C',
    '#1B4F72',
    '#E8F8F5',
    '#D1F2EB',
    '#A3E4D7',
    '#76D7C4',
    '#48C9B0',
    '#1ABC9C',
    '#17A589',
    '#148F77',
    '#117864',
    '#0E6251',
    '#E8F6F3',
    '#D0ECE7',
    '#A2D9CE',
    '#73C6B6',
    '#45B39D',
    '#16A085',
    '#138D75',
    '#117A65',
    '#0E6655',
    '#0B5345',
    '#E9F7EF',
    '#D4EFDF',
    '#A9DFBF',
    '#7DCEA0',
    '#52BE80',
    '#27AE60',
    '#229954',
    '#1E8449',
    '#196F3D',
    '#145A32',
    '#EAFAF1',
    '#D5F5E3',
    '#ABEBC6',
    '#82E0AA',
    '#58D68D',
    '#2ECC71',
    '#28B463',
    '#239B56',
    '#1D8348',
    '#186A3B',
    '#FEF9E7',
    '#FCF3CF',
    '#F9E79F',
    '#F7DC6F',
    '#F4D03F',
    '#F1C40F',
    '#D4AC0D',
    '#B7950B',
    '#9A7D0A',
    '#7D6608',
    '#FEF5E7',
    '#FDEBD0',
    '#FAD7A0',
    '#F8C471',
    '#F5B041',
    '#F39C12',
    '#D68910',
    '#B9770E',
    '#9C640C',
    '#7E5109',
    '#FDF2E9',
    '#FAE5D3',
    '#F5CBA7',
    '#F0B27A',
    '#EB984E',
    '#E67E22',
    '#CA6F1E',
    '#AF601A',
    '#935116',
    '#784212',
    '#FBEEE6',
    '#F6DDCC',
    '#EDBB99',
    '#E59866',
    '#DC7633',
    '#D35400',
    '#BA4A00',
    '#A04000',
    '#873600',
    '#6E2C00',
    '#EBEDEF',
    '#D6DBDF',
    '#AEB6BF',
    '#85929E',
    '#5D6D7E',
    '#34495E',
    '#2E4053',
    '#283747',
    '#212F3C',
    '#1B2631',
    '#EAECEE',
    '#D5D8DC',
    '#ABB2B9',
    '#808B96',
    '#566573',
    '#2C3E50',
    '#273746',
    '#212F3D',
    '#1C2833',
    '#17202A'
]