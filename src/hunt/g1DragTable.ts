// ============================================================
// src/hunt/g1DragTable.ts - Standard G1 drag function
// ============================================================
// Drag coefficient (Cd) of the standard G1 reference projectile versus Mach number.
// A bullet's ballistic coefficient (BC) scales this curve to that bullet.
//
// Data: the standard G1 table (Ingalls / Aberdeen Proving Ground), 79 points.
// These values were cross-checked point for point against the TableG1 published by
// the open-source py-ballisticcalc library.

/** [Mach, Cd] pairs, sorted by Mach. */
const G1_TABLE: ReadonlyArray<readonly [number, number]> = [
    [0.00, 0.2629],
    [0.05, 0.2558],
    [0.10, 0.2487],
    [0.15, 0.2413],
    [0.20, 0.2344],
    [0.25, 0.2278],
    [0.30, 0.2214],
    [0.35, 0.2155],
    [0.40, 0.2104],
    [0.45, 0.2061],
    [0.50, 0.2032],
    [0.55, 0.2020],
    [0.60, 0.2034],
    [0.70, 0.2165],
    [0.725, 0.2230],
    [0.75, 0.2313],
    [0.775, 0.2417],
    [0.80, 0.2546],
    [0.825, 0.2706],
    [0.85, 0.2901],
    [0.875, 0.3136],
    [0.90, 0.3415],
    [0.925, 0.3734],
    [0.95, 0.4084],
    [0.975, 0.4448],
    [1.00, 0.4805],
    [1.025, 0.5136],
    [1.05, 0.5427],
    [1.075, 0.5677],
    [1.10, 0.5883],
    [1.125, 0.6053],
    [1.15, 0.6191],
    [1.20, 0.6393],
    [1.25, 0.6518],
    [1.30, 0.6589],
    [1.35, 0.6621],
    [1.40, 0.6625],
    [1.45, 0.6607],
    [1.50, 0.6573],
    [1.55, 0.6528],
    [1.60, 0.6474],
    [1.65, 0.6413],
    [1.70, 0.6347],
    [1.75, 0.6280],
    [1.80, 0.6210],
    [1.85, 0.6141],
    [1.90, 0.6072],
    [1.95, 0.6003],
    [2.00, 0.5934],
    [2.05, 0.5867],
    [2.10, 0.5804],
    [2.15, 0.5743],
    [2.20, 0.5685],
    [2.25, 0.5630],
    [2.30, 0.5577],
    [2.35, 0.5527],
    [2.40, 0.5481],
    [2.45, 0.5438],
    [2.50, 0.5397],
    [2.60, 0.5325],
    [2.70, 0.5264],
    [2.80, 0.5211],
    [2.90, 0.5168],
    [3.00, 0.5133],
    [3.10, 0.5105],
    [3.20, 0.5084],
    [3.30, 0.5067],
    [3.40, 0.5054],
    [3.50, 0.5040],
    [3.60, 0.5030],
    [3.70, 0.5022],
    [3.80, 0.5016],
    [3.90, 0.5010],
    [4.00, 0.5006],
    [4.20, 0.4998],
    [4.40, 0.4995],
    [4.60, 0.4992],
    [4.80, 0.4990],
    [5.00, 0.4988],
];

/** Cd for the G1 projectile at a given Mach number (linear interpolation between table points). */
export function getG1Cd(mach: number): number {
    const first = G1_TABLE[0];
    const last = G1_TABLE[G1_TABLE.length - 1];
    if (mach <= first[0]) return first[1];
    if (mach >= last[0]) return last[1];

    // Table is small (79 points) and this runs a few thousand times per solve, so a linear scan is fine.
    for (let i = 1; i < G1_TABLE.length; i++) {
        const [m1, cd1] = G1_TABLE[i];
        if (mach <= m1) {
            const [m0, cd0] = G1_TABLE[i - 1];
            return cd0 + ((cd1 - cd0) * (mach - m0)) / (m1 - m0);
        }
    }
    return last[1];
}
