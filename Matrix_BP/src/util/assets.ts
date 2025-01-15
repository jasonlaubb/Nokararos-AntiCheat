export function getAbsoluteGcd(current: number, last: number) {
    const EXPANDER = 1.6777216e7; // Adjusted to the provided value

    let currentExpanded = Math.floor(current * EXPANDER);
    let lastExpanded = Math.floor(last * EXPANDER);
    let ABS_GCD = 1;
    try {
        ABS_GCD = gcd(currentExpanded, lastExpanded);
    } catch {}
    return ABS_GCD;
}

export function gcd(a: number, b: number) {
    if (a < b) {
        return gcd(b, a);
    }
    if (fastAbs(b) < 0.001) {
        return a;
    } else {
        return gcd(b, a - Math.floor(a / b) * b);
    }
}
export const EXPANDER = Math.pow(2, 24);

export function arrayToList(arr: Array<any>) {
    const list = [];

    for (const item of arr) {
        list.push(item);
    }

    return list;
}

export function getAverageDifference(arr: number[]) {
    return arr.slice(1).reduce((sum, current, index) => sum + (current - arr[index]), 0) / (arr.length - 1);
}

export function fastAverage(arr: number[]) {
    return arr.reduce((sum, current) => sum + current, 0) / arr.length;
}
import { Player } from "@minecraft/server";
import { fastAbs, fastSqrt } from "./fastmath";
export function getStandardDeviation(numbers: number[]) {
    const n = numbers.length;
    if (n === 0) return 0;

    let sum = 0;
    let sumSqr = 0;

    for (const num of numbers) {
        sum += num;
        sumSqr += num * num;
    }

    const mean = sum / n;
    const variance = (sumSqr - sum * mean) / (n - 1);

    return fastSqrt(variance);
}
export function checkRepetition(arr: number[]) {
    const alreadyList: { [key: number]: number} = {};
    arr.forEach((value) => {
        alreadyList[value] ??= 0;
        alreadyList[value]++;
    })
    return Math.max(...Object.values(alreadyList));
}

export function getTotalAbsMovementVector (player: Player) {
    const { x, y } = player.inputInfo.getMovementVector();
    return (fastAbs(x) + fastAbs(y)) as 0 | 1 | 2;
}