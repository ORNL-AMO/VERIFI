export function getGUID(): string {
    return Math.random().toString(36).substr(2, 9);
}