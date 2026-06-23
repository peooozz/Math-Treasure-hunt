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
        name: "Level 3: Magma Reactor Core",
        theme: "magma_core",
        floorColor: 0xfff7ed, // Pale orange
        wallColor: 0xffedd5,  // Light orange
        lightColorLeft: 0xff4500, // Orange-red
        lightColorRight: 0xd97706, // Golden amber
        fogColor: 0xfff7ed,
        fogDensity: 0.022,
        grid: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
            [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
            [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,1,0,1,1,2,0,2,1,1,0,1,0,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
            [1,1,1,0,1,0,1,1,1,0,1,0,1,1,1],
            [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
            [1,1,1,0,1,0,1,1,1,0,1,0,1,1,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
            [1,0,1,0,1,1,2,0,2,1,1,0,1,0,1],
            [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
            [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawn: { x: 7, z: 1 },
        exit: { x: 7, z: 13 },
        enemies: [
            { x: -14, z: 0, hp: 90, name: "VOLUME FIREGUARD" },
            { x: 14, z: 0, hp: 90, name: "PROBABILITY FIREGUARD" },
            { x: 0, z: -10, hp: 100, name: "POLYNOMIAL EXTERMINATOR" }
        ],
        vaults: [
            {
                id: 0,
                name: "Reactor Shell",
                gridX: 2,
                gridZ: 5,
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
                gridX: 12,
                gridZ: 5,
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
                gridX: 7,
                gridZ: 7,
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
    },
    {
        name: "Level 4: Crossroads Terminal",
        theme: "crossroads",
        floorColor: 0xfef2f2, // Soft red
        wallColor: 0xfecaca,  // Lighter red
        lightColorLeft: 0xec4899, // Hot pink
        lightColorRight: 0xef4444, // Red
        fogColor: 0xfef2f2,
        fogDensity: 0.016,
        grid: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
            [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
            [1,0,1,0,0,0,1,0,1,0,0,0,1,0,1],
            [1,1,1,1,1,0,1,0,1,0,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,0,2,0,2,0,1,1,1,0,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
            [1,0,1,1,1,0,2,0,2,0,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,0,1,0,1,0,1,1,1,1,1],
            [1,0,1,0,0,0,1,0,1,0,0,0,1,0,1],
            [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawn: { x: 1, z: 13 },
        exit: { x: 13, z: 1 },
        enemies: [
            { x: -16, z: -16, hp: 90, name: "EQUATION SENTINEL" },
            { x: 14, z: 14, hp: 90, name: "SERIES SENTINEL" },
            { x: 0, z: 0, hp: 110, name: "ELEVATION WARDEN" }
        ],
        vaults: [
            {
                id: 0,
                name: "Balance Scales",
                gridX: 7,
                gridZ: 3,
                type: "algebra",
                problem: "Class 10 Linear Equations: The sum of two numbers is 27 and their difference is 3. Find the larger number.",
                label: "Larger Number",
                min: 5,
                max: 25,
                defaultVal: 10,
                ans: 15,
                formula: "x+y = 27, x-y = 3 => 2x = 30 => x = 15."
            },
            {
                id: 1,
                name: "Step Sequence",
                gridX: 1,
                gridZ: 7,
                type: "algebra",
                problem: "Class 10 AP: In an Arithmetic Progression, if a = 3, d = 4, calculate the sum of the first 5 terms.",
                label: "Sum (S_5)",
                min: 30,
                max: 80,
                defaultVal: 40,
                ans: 55,
                formula: "S_5 = (5/2) * [2(3) + 4(4)] = 2.5 * [6 + 16] = 2.5 * 22 = 55."
            },
            {
                id: 2,
                name: "Solar Shadows",
                gridX: 13,
                gridZ: 7,
                type: "trig",
                problem: "Class 10 Trig Heights: A tower is 30m high. The angle of elevation of the sun is 45°. Find shadow length s.",
                min: 10,
                max: 50,
                defaultVal: 20,
                ans: 30,
                ratio: "tan",
                formula: "tan(45°) = 30 / s => 1 = 30 / s => s = 30m."
            }
        ]
    },
    {
        name: "Level 5: Obsidian Abyss",
        theme: "obsidian_abyss",
        floorColor: 0xf5f3ff, // Light purple
        wallColor: 0xddd6fe,  // Pale purple
        lightColorLeft: 0x8b5cf6, // Violet
        lightColorRight: 0xbd00ff, // Intense purple
        fogColor: 0xf5f3ff,
        fogDensity: 0.02,
        grid: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
            [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
            [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
            [1,1,1,0,1,0,2,2,2,0,1,0,1,1,1],
            [1,0,0,0,0,0,2,0,2,0,0,0,0,0,1],
            [1,1,1,0,1,0,2,2,2,0,1,0,1,1,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
            [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1],
            [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
            [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawn: { x: 7, z: 1 },
        exit: { x: 7, z: 7 },
        enemies: [
            { x: -16, z: -8, hp: 100, name: "MIDPOINT DEMON" },
            { x: 14, z: 10, hp: 100, name: "DISCRIMINANT SLAYER" },
            { x: 0, z: -16, hp: 105, name: "DICE ARCHMAGE" }
        ],
        vaults: [
            {
                id: 0,
                name: "Vector Midpoint",
                gridX: 2,
                gridZ: 5,
                type: "algebra",
                problem: "Class 10 Coordinate Geometry: Find midpoint of line segment joining (4,6) and (10,12). Find x-coord.",
                label: "Midpoint x",
                min: 1,
                max: 12,
                defaultVal: 4,
                ans: 7,
                formula: "x_mid = (4 + 10)/2 = 7."
            },
            {
                id: 1,
                name: "Ground Roots",
                gridX: 12,
                gridZ: 5,
                type: "quadratics",
                problem: "Class 10 Quadratic Equations: Find the discriminant of equation 2x² - 7x + 3 = 0.",
                options: [25, 49],
                ans: 25,
                formula: "D = b² - 4ac = (-7)² - 4(2)(3) = 49 - 24 = 25."
            },
            {
                id: 2,
                name: "Logic Circuit XOR",
                gridX: 7,
                gridZ: 13,
                type: "algebra",
                problem: "Class 10 Probability: Two dice are thrown. Find numerator of probability that sum is 10 (out of 36).",
                label: "Numerator Value",
                min: 1,
                max: 10,
                defaultVal: 1,
                ans: 3,
                formula: "Favorable: (4,6), (5,5), (6,4) => 3 outcomes. Numerator is 3."
            }
        ]
    },
    {
        name: "Level 6: Hydro Station Vault",
        theme: "hydro_station",
        floorColor: 0xf0fdf4, // Very pale green-blue
        wallColor: 0xdcfce7,  // Light mint
        lightColorLeft: 0x06b6d4, // Bright cyan
        lightColorRight: 0x10b981, // Green
        fogColor: 0xf0fdf4,
        fogDensity: 0.017,
        grid: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,0,1,0,1,1,1,1,1,0,1],
            [1,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
            [1,0,1,0,1,1,1,1,1,0,1,0,1,1,1],
            [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
            [1,1,1,0,1,0,2,0,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,1,1,1,1,2,1,1,1,1,0,1,0,1],
            [1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
            [1,1,1,0,1,0,1,0,1,0,1,1,1,0,1],
            [1,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,0,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawn: { x: 1, z: 1 },
        exit: { x: 13, z: 13 },
        enemies: [
            { x: -16, z: -10, hp: 100, name: "CYLINDER CONSTRUCTOR" },
            { x: 16, z: 8, hp: 100, name: "TANGENT CONSTRUCTOR" },
            { x: 0, z: -16, hp: 110, name: "SIMILAR TRIANGLE BEAST" }
        ],
        vaults: [
            {
                id: 0,
                name: "Core Cylinder Area",
                gridX: 13,
                gridZ: 1,
                type: "geometry",
                problem: "Class 10 Surface Areas: A solid cylinder has r = 3m and h = 7m. Calculate its total surface area (use pi = 3.14, nearest integer).",
                geomType: "cylinder_area",
                min: 100,
                max: 300,
                defaultVal: 150,
                ans: 188,
                r: 3,
                h: 7,
                formula: "TSA = 2*pi*r(r + h) = 2 * 3.14 * 3 * 10 = 188.4 ≈ 188."
            },
            {
                id: 1,
                name: "Reactor Shell",
                gridX: 7,
                gridZ: 7,
                type: "geometry",
                problem: "Class 10 Circles: A point P is 13cm from center. The radius is 5cm. Find length of tangent to circle.",
                geomType: "cylinder",
                options: [8, 12, 13],
                ans: 12,
                r: 5,
                h: 12,
                formula: "L = sqrt(13² - 5²) = sqrt(169 - 25) = 12cm."
            },
            {
                id: 2,
                name: "Grid Triangulation",
                gridX: 1,
                gridZ: 13,
                type: "trig",
                problem: "Class 10 Triangles: Similar triangles side ratio is 4:9. Find numerator of area ratio (16:81).",
                options: [4, 16, 81],
                ans: 16,
                formula: "Area ratio = (Side ratio)² = (4/9)² = 16/81. Numerator is 16."
            }
        ]
    },
    {
        name: "Level 7: Radiant Sanctum",
        theme: "radiant_sanctum",
        floorColor: 0xfff1f2, // Pale rose
        wallColor: 0xffe4e6,  // Light rose
        lightColorLeft: 0xf43f5e, // Rose pink
        lightColorRight: 0xfb7185, // Soft rose
        fogColor: 0xfff1f2,
        fogDensity: 0.015,
        grid: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
            [1,0,2,0,1,0,2,2,2,0,1,0,2,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,0,1,1,1,0,1,1,1,0,1,1,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
            [1,0,2,0,0,0,2,0,2,0,0,0,2,0,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
            [1,1,1,0,1,1,1,0,1,1,1,0,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,0,2,0,1,0,2,2,2,0,1,0,2,0,1],
            [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
            [1,1,1,1,1,1,1,0,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawn: { x: 7, z: 1 },
        exit: { x: 7, z: 13 },
        enemies: [
            { x: -16, z: 0, hp: 100, name: "TRIG VALUE DEMON" },
            { x: 14, z: 0, hp: 100, name: "FACTOR SENTRY" },
            { x: 0, z: 8, hp: 110, name: "LINEAR DESTRUCTOR" }
        ],
        vaults: [
            {
                id: 0,
                name: "Grid Triangulation",
                gridX: 2,
                gridZ: 5,
                type: "trig",
                problem: "Class 10 Trigonometry: Evaluate: 2 * tan²(45°) + cos²(30°) - sin²(60°).",
                options: [2, 3, 4],
                ans: 2,
                formula: "2(1)² + (3/4) - (3/4) = 2."
            },
            {
                id: 1,
                name: "Step Sequence",
                gridX: 12,
                gridZ: 5,
                type: "algebra",
                problem: "Class 10 Real Numbers: Find exponent of 2 in prime factorization of 96.",
                label: "Exponent of 2",
                min: 1,
                max: 10,
                defaultVal: 2,
                ans: 5,
                formula: "96 = 2^5 * 3. Exponent of 2 is 5."
            },
            {
                id: 2,
                name: "Balance Scales",
                gridX: 7,
                gridZ: 9,
                type: "algebra",
                problem: "Class 10 Linear Equations: Solve 3x + 2y = 12 and x - y = 4. Find value of x.",
                label: "Value of x",
                min: 1,
                max: 10,
                defaultVal: 2,
                ans: 4,
                formula: "y = x-4 => 3x + 2(x-4) = 12 => 5x - 8 = 12 => 5x = 20 => x = 4."
            }
        ]
    },
    {
        name: "Level 8: Neon Necropolis",
        theme: "neon_necropolis",
        floorColor: 0xf0fdfa, // Pale teal
        wallColor: 0xccfbf1,  // Light teal
        lightColorLeft: 0x0d9488, // Deep teal
        lightColorRight: 0x14b8a6, // Bright teal
        fogColor: 0xf0fdfa,
        fogDensity: 0.016,
        grid: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
            [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
            [1,0,1,0,1,0,0,0,0,0,1,0,1,0,1],
            [1,0,1,0,1,1,1,0,1,1,1,0,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,0,1,1,2,0,2,1,1,0,1,1,1],
            [1,0,1,0,1,0,0,0,0,0,1,0,1,0,1],
            [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,0,1,1,1,0,1,1,1,1,1],
            [1,0,0,0,1,0,1,0,1,0,1,0,0,0,1],
            [1,0,2,0,1,0,0,0,0,0,1,0,2,0,1],
            [1,0,0,0,0,0,1,0,1,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawn: { x: 1, z: 1 },
        exit: { x: 13, z: 13 },
        enemies: [
            { x: -16, z: -10, hp: 110, name: "AP MASTER SENTRY" },
            { x: 16, z: 8, hp: 110, name: "CIRCLE AREA SENTRY" },
            { x: 0, z: -14, hp: 120, name: "ROOT MASTER GUARD" }
        ],
        vaults: [
            {
                id: 0,
                name: "Step Sequence",
                gridX: 7,
                gridZ: 3,
                type: "algebra",
                problem: "Class 10 AP: 3rd term of an AP is 4, 9th term is -8. Find which term is 0.",
                label: "Term Number n",
                min: 1,
                max: 10,
                defaultVal: 3,
                ans: 5,
                formula: "a+2d=4, a+8d=-8 => 6d=-12 => d=-2, a=8. a+(n-1)d = 0 => 8 - 2(n-1) = 0 => n = 5."
            },
            {
                id: 1,
                name: "Storage Core",
                gridX: 3,
                gridZ: 12,
                type: "geometry",
                problem: "Class 10 Areas: The perimeter and area of circle are numerically equal. Find radius r.",
                geomType: "cylinder",
                options: [2, 4, 7],
                ans: 2,
                r: 2,
                h: 2,
                formula: "2*pi*r = pi*r² => r = 2."
            },
            {
                id: 2,
                name: "Balance Scales",
                gridX: 11,
                gridZ: 12,
                type: "algebra",
                problem: "Class 10 Polynomials: If roots of x² - 7x + 12 are alpha, beta, find product alpha * beta.",
                label: "Product of Roots",
                min: 2,
                max: 20,
                defaultVal: 6,
                ans: 12,
                formula: "Product = c/a = 12/1 = 12."
            }
        ]
    },
    {
        name: "Level 9: The Vault Central Core",
        theme: "vault_core",
        floorColor: 0xfbfbfe, // Pure white
        wallColor: 0xf1f1f6,  // White slate
        lightColorLeft: 0xff007a, // Radiant Pink
        lightColorRight: 0x00f0ff, // Cyber Blue
        fogColor: 0xfbfbfe,
        fogDensity: 0.018,
        grid: [
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
            [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
            [1,0,1,1,1,0,1,0,1,1,1,1,1,0,1],
            [1,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
            [1,0,1,0,1,1,1,1,1,0,1,0,1,1,1],
            [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
            [1,1,1,0,1,0,2,0,1,1,1,1,1,0,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
            [1,0,1,1,1,1,2,1,1,1,1,0,1,0,1],
            [1,0,0,0,1,0,0,0,1,0,0,0,1,0,1],
            [1,1,1,0,1,0,1,0,1,0,1,1,1,0,1],
            [1,0,1,0,0,0,1,0,0,0,1,0,0,0,1],
            [1,0,1,1,1,1,1,1,1,1,1,0,1,1,1],
            [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
            [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
        ],
        spawn: { x: 7, z: 13 },
        exit: { x: 7, z: 7 }, // Central boss portal cell
        enemies: [
            { x: -16, z: -10, hp: 120, name: "MASTER COORDINATE GUARD" },
            { x: 16, z: 8, hp: 120, name: "MASTER EQUAL ROOT GUARD" },
            { x: 0, z: -16, hp: 150, name: "MASTER DEPRESSION GUARD" }
        ],
        vaults: [
            {
                id: 0,
                name: "Reactor Shell",
                gridX: 3,
                gridZ: 3,
                type: "geometry",
                problem: "Class 10 Coordinate Geometry: Find the distance of point (3, 4) from the origin.",
                geomType: "sphere",
                options: [3, 4, 5],
                ans: 5,
                r: 5,
                formula: "d = sqrt(3² + 4²) = sqrt(9 + 16) = 5."
            },
            {
                id: 1,
                name: "Ground Roots",
                gridX: 11,
                gridZ: 3,
                type: "quadratics",
                problem: "Class 10 Quadratic Equations: Find positive k if x² - kx + 9 = 0 has equal roots.",
                options: [3, 6, 9],
                ans: 6,
                formula: "Equal roots => D = b²-4ac = 0 => k² - 4(1)(9) = 0 => k² = 36 => positive k = 6."
            },
            {
                id: 2,
                name: "Lighthouse Range",
                gridX: 7,
                gridZ: 1,
                type: "trig",
                problem: "Class 10 Trig heights: Depression angle to car from 60m high tower is 30°. Find distance (nearest integer).",
                min: 50,
                max: 150,
                defaultVal: 80,
                ans: 104,
                formula: "tan(30°) = 60 / d => 1/sqrt(3) = 60/d => d = 60*sqrt(3) ≈ 103.92 ≈ 104m."
            }
        ]
    }
];
