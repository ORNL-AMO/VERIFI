
export function checkNumberValueValid(value: number): boolean {
    return (value != undefined) && (value != null) && (isNaN(value) == false);
}