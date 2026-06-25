/**
 * Levels and Map Database for Math Vault - 10 levels with 15x15 grids, unique environments, and Class 10th Math puzzles
 */
export const LEVELS = [
    {
        name: "Level 1: Arabic City",
        theme: "arabic_city",
        openWorld: true,
        modelPath: "/arabic_city.glb",
        floorColor: 0xd4a843, // Sandy gold
        wallColor: 0xfef08a,  // Light sand
        lightColorLeft: 0xf59e0b, // Sunset orange
        lightColorRight: 0xd97706, // Deep amber
        fogColor: 0xfef3c7, // Sandy yellow fog
        fogDensity: 0.008,
        grid: [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        ],
        spawn: { x: 6, z: 12 },
        exit: { x: 1, z: 1 },
        enemies: [
            { x: -8, z: -8, hp: 60, name: "REAL NUMBERS GUARD" },
            { x: 6, z: -8, hp: 80, name: "AP GUARD" },
            { x: -12, z: 12, hp: 75, name: "LINEAR EQUATIONS GUARD" }
        ],
        vaults: [
            {
                id: 0,
                name: "Farmer's Field",
                concept: "Ascending Order",
                gridX: 4,
                gridZ: 3,
                type: "algebra",
                problem: "Class 10 Real Numbers: Use Euclid's division algorithm to find the HCF of 135 and 225.",
                label: "HCF Value",
                min: 15,
                max: 75,
                defaultVal: 30,
                ans: 45,
                formula: "HCF(225, 135) => 225 = 135*1 + 90; 135 = 90*1 + 45; 90 = 45*2 + 0. HCF is 45."
            },
            {
                id: 1,
                name: "Rooftop Projectile",
                concept: "Descending Order",
                gridX: 11,
                gridZ: 3,
                type: "algebra",
                problem: "Class 10 AP: Find the 10th term of the Arithmetic Progression (AP): 2, 7, 12, 17, ...",
                label: "Term (a_10)",
                min: 30,
                max: 60,
                defaultVal: 35,
                ans: 47,
                formula: "a_10 = a + 9d = 2 + 9(5) = 47."
            },
            {
                id: 2,
                name: "Linear Trajectory",
                concept: "Comparing Numbers",
                gridX: 2,
                gridZ: 11,
                type: "algebra",
                problem: "Class 10 Linear Equations: Solve 2x + 3y = 11 and 2x - 4y = -24. Find the value of variable y.",
                label: "Value of y",
                min: 1,
                max: 10,
                defaultVal: 3,
                ans: 5,
                formula: "Subtracting: 7y = 35 => y = 5."
            }
        ]
    },
    {
        name: "Level 2: Cyberpunk City",
        theme: "cyberpunk_city",
        openWorld: true,
        modelPath: "/cyberpunk_city.glb",
        floorColor: 0x09090b, // Deep black
        wallColor: 0x1e293b,  // Dark slate
        lightColorLeft: 0xff007a, // Neon hot pink
        lightColorRight: 0x00f0ff, // Cyber cyan
        fogColor: 0x09090b,
        fogDensity: 0.015,
        grid: [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        ],
        spawn: { x: 7, z: 13 },
        exit: { x: 7, z: 1 },
        enemies: [
            { x: -18, z: -10, hp: 80, name: "QUADRATIC SENTINEL" },
            { x: 18, z: -10, hp: 80, name: "COORDINATE SENTINEL" },
            { x: 0, z: 6, hp: 100, name: "TRIG SENTRY" }
        ],
        vaults: [
            {
                id: 0,
                name: "Ground Roots",
                concept: "Quadratic Equations",
                gridX: 3,
                gridZ: 1,
                type: "quadratics",
                problem: "Class 10 Quadratic Equations: Find the positive root of the equation x² - 5x - 6 = 0.",
                options: [-1, 6],
                ans: 6,
                formula: "(x - 6)(x + 1) = 0 => Positive root is 6."
            },
            {
                id: 1,
                name: "Storage Core",
                concept: "Coordinate Geometry",
                gridX: 11,
                gridZ: 1,
                type: "geometry",
                problem: "Class 10 Coordinate Geometry: Find the distance between the coordinates (2, 3) and (6, 6).",
                geomType: "cube",
                options: [4, 5, 7],
                ans: 5,
                formula: "d = sqrt((6-2)² + (6-3)²) = sqrt(16 + 9) = 5."
            },
            {
                id: 2,
                name: "Wall Support",
                concept: "Trigonometry",
                gridX: 7,
                gridZ: 9,
                type: "trig",
                problem: "Class 10 Trigonometry: If sin(A) = 3/5, find the value of (tan(A) * 12).",
                options: [9, 12, 15],
                ans: 9,
                formula: "sin(A)=3/5 => cos(A)=4/5 => tan(A)=3/4. tan(A)*12 = 9."
            }
        ]
    },
    {
        name: "Level 3: Neighborhood City",
        theme: "neighbourhood_city",
        openWorld: true,
        modelPath: "/neighbourhood_city.glb",
        floorColor: 0x27272a, // zinc-800 dark pavement
        wallColor: 0x52525b,  // zinc-600 building facades
        lightColorLeft: 0x3b82f6, // cyber blue
        lightColorRight: 0xa855f7, // neon purple
        fogColor: 0x09090b, // dark city fog
        fogDensity: 0.015,
        grid: [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        ],
        spawn: { x: 7, z: 7 },
        exit: { x: 7, z: 2 },
        enemies: [
            { x: -16, z: -16, hp: 90, name: "VOLUME NEIGHBOR GUARD" },
            { x: 16, z: -12, hp: 90, name: "PROBABILITY NEIGHBOR GUARD" },
            { x: -8, z: 20, hp: 100, name: "POLYNOMIAL NEIGHBOR GUARD" }
        ],
        vaults: [
            {
                id: 0,
                name: "Reactor Shell",
                concept: "Surface Area & Volume",
                gridX: 3,
                gridZ: 2,
                type: "geometry",
                problem: "Class 10 Surface Areas & Volumes: Calculate the volume of a spherical core shield of radius 3m (use pi = 3.14, nearest integer).",
                geomType: "sphere",
                options: [36, 113, 150],
                ans: 113,
                formula: "V = (4/3) * pi * r³ = 4/3 * 3.14 * 27 = 113.04 ≈ 113."
            },
            {
                id: 1,
                name: "Logic Circuit OR",
                concept: "Probability",
                gridX: 11,
                gridZ: 2,
                type: "algebra",
                problem: "Class 10 Probability: A box has 3 red and 5 black balls. If a ball is drawn, find the probability (as % to nearest integer) of getting a red ball.",
                label: "Probability (%)",
                min: 10,
                max: 75,
                defaultVal: 20,
                ans: 38,
                formula: "P(Red) = 3/8 = 0.375 = 38%."
            },
            {
                id: 2,
                name: "Rooftop Projectile",
                concept: "Polynomials",
                gridX: 7,
                gridZ: 12,
                type: "algebra",
                problem: "Class 10 Polynomials: Find the sum of zeroes of the quadratic polynomial p(x) = 3x² - 15x + 12.",
                label: "Sum of Zeroes",
                min: 1,
                max: 10,
                defaultVal: 3,
                ans: 5,
                formula: "Sum of zeroes = -b/a = -(-15)/3 = 5."
            }
        ]
    }
];

export function getAssetUrl(path) {
    if (!path) return path;
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const cleanPath = path.startsWith('/') ? path : '/' + path;
        return `https://media.githubusercontent.com/media/peooozz/Math-Treasure-hunt/main/public${cleanPath}`;
    }
    return path;
}
