import { Block, Dimension, Vector3 } from "@minecraft/server";

// Define variables
export const PI = 3.14159;
// Angle functions
export function calculateAngleFromView(pos1: Vector3, pos2: Vector3, rotationY: number): number {
    const commonAngle = (Math.atan2(pos2.z - pos1.z, pos2.x - pos1.x) * 180) / PI;
    const rotatedAngle = commonAngle - rotationY - 90;
    const finalAngle = rotatedAngle <= -180 ? rotatedAngle + 360 : rotatedAngle;
    return fastAbs(finalAngle);
}

// Distance functions
export function calculateDistance(pos1: Vector3, pos2: Vector3): number {
    return pythag(pos1.x - pos2.x, pos1.z - pos2.z);
}

// General Maths functions
export function fastRound(x: number) {
    return (x + 0.5) | 0;
}

export function fastTrunc(x: number) {
    if (x < 0) return (x - 0.5) | 0;
    return x | 0;
}
export function fastFloor(x: number) {
    return x | 0;
}
export function fastAbs(x: number) {
    return x < 0 ? -x : x;
}

export function fastHypot(x: number, y: number) {
    try {
        return pythag(x, y);
    } catch (e) {
        console.warn("[FastHypot] Error: " + e);
        return Math.hypot(x, y);
    }
}
export function pythag (a: number, b: number) {
    return Math.sqrt(a ** 2 + b ** 2);
}

export function pythag3d (a: number, b: number, c: number) {
    return Math.sqrt(a ** 2, b ** 2, c ** 2);
}
const DOUBLE_PI = PI * 2;
const HALF_PI = PI * 0.5;
export function fastSin(x: number) {
    if (x < -PI) x += DOUBLE_PI;
    else if (x > PI) x -= DOUBLE_PI;

    if (x < 0) return 1.27323954 * x + 0.405284735 * x * x;
    else return 1.27323954 * x - 0.405284735 * x * x;
}
export function fastCos(x: number) {
    return fastSin(x + HALF_PI);
}
export function fastTotalDelta(...x: number[]): number {
    return x.slice(1).reduce((acc, val, i) => acc + (val - x[i]), 0);
}
const SQRT_TABLE = new Float32Array(1024);
for (let i = 0; i < 1024; i++) {
    SQRT_TABLE[i] = Math.sqrt(i);
}
/**
 * @author 4urxa
 * @description Fast sqrt
 */
export function fastSqrt(x: number) {
    // Just did some better testing, this needs recoding. When I get to it I will make another pull request - 4urxra
    return Math.sqrt(x)
    try {
        // Handle special cases
        if (x < 0) return NaN;
        if (x === 0 || x === 1) return x;
        
        // Use lookup table for small integers
        if (x < 1024 && Number.isInteger(x)) {
            return SQRT_TABLE[x];
        }
        
        // Fast inverse square root approximation
        const halfX = x * 0.5;
        let i = new Float32Array(1);
        i[0] = x;
        let j = new Int32Array(i.buffer);
        j[0] = 0x5f375a86 - (j[0] >> 1);
        let y = new Float32Array(j.buffer)[0];
        
        // One Newton iteration for better accuracy
        y = y * (1.5 - (halfX * y * y));
        
        return x * y;
    } catch (e) {
        console.warn("[FastSqrt] Error: " + e);
        return Math.sqrt(x);
    }
}

/**
 * @description Most efficient way to get all the blocks around a block.
 */
export function fastSurround (centerLocation: Vector3, dimension: Dimension): (Block | undefined )[] | undefined {
    try {
        const block = dimension.getBlock(centerLocation);
        // directions
        const d = block!.below();
        const u = block!.above();
        const w = block!.west();
        const e = block!.east();
        const s = block!.south();
        const n = block!.north();
        const nw = n!.west();
        const ne = n!.east();
        const sw = s!.west();
        const se = s!.east();
        const uw = u!.west();
        const ue = u!.east();
        const us = u!.south();
        const un = u!.north();
        const dw = d!.west();
        const de = d!.east();
        const ds = d!.south();
        const dn = d!.north();
        const unw = un!.west();
        const une = un!.east();
        const usw = us!.west();
        const use = us!.east();
        const dsw = ds!.west();
        const dse = ds!.east();
        const dnw = dn!.west();
        const dne = dn!.east();
        return [d, u, w, e, s, n, nw, ne, sw, se, uw, ue, us, un, dw, de, ds, dn, unw, une, usw, use, dsw, dse, dnw, dne];
    } catch {
        return undefined;
    }
}
export function fastBelow (centerLocation: Vector3, dimension: Dimension): (Block | undefined )[] | undefined {
    try {
        const block = dimension.getBlock(centerLocation);
        // directions
        const blockBelow = block?.below();
        if (!blockBelow) return undefined;
        const blockBelowNorth = blockBelow.north();
        const blockBelowSouth = blockBelow.south();
        return [block, blockBelowNorth, blockBelow.east(), blockBelowSouth, blockBelow.west(), blockBelowNorth?.east(), blockBelowNorth?.west(), blockBelowSouth?.east(), blockBelowSouth?.west()];
    } catch {
        return undefined;
    }
}
