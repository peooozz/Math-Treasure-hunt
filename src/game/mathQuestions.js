/**
 * mathQuestions.js — Dynamic random math question generator
 * Generates 10 unique, randomized questions per treasure vault for all 3 levels.
 * Every playthrough gets fresh questions.
 */

// ─── Utility Helpers ────────────────────────────────────────────────

/** Returns a random integer in [min, max] inclusive */
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Shuffles an array in-place (Fisher-Yates) and returns it */
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/** Generate `count` unique wrong-answer distractors near `correct`, avoiding duplicates */
function generateDistractors(correct, count, minOffset = 1, maxOffset = 5, minVal = 0) {
    const distractors = new Set();
    let attempts = 0;
    while (distractors.size < count && attempts < 200) {
        const offset = randInt(minOffset, maxOffset) * (Math.random() < 0.5 ? -1 : 1);
        const d = correct + offset;
        if (d !== correct && d >= minVal && !distractors.has(d)) {
            distractors.add(d);
        }
        attempts++;
    }
    // Fallback: fill with sequential numbers if not enough unique distractors
    let fallback = correct + 1;
    while (distractors.size < count) {
        if (fallback !== correct && fallback >= minVal && !distractors.has(fallback)) {
            distractors.add(fallback);
        }
        fallback++;
    }
    return [...distractors];
}

// ─── Level 1 Generators ─────────────────────────────────────────────

/** Generate a sorting question (ascending or descending) */
function generateSortQuestion(ascending) {
    // Generate 4 unique random numbers
    const nums = new Set();
    while (nums.size < 4) {
        nums.add(randInt(2, 99));
    }
    const numbers = [...nums];
    const correct = ascending
        ? [...numbers].sort((a, b) => a - b)
        : [...numbers].sort((a, b) => b - a);

    const direction = ascending ? "ASCENDING" : "DESCENDING";
    const arrow = ascending ? "📈" : "📉";
    const sizeHint = ascending ? "smallest to biggest" : "biggest to smallest";

    const instructions = [
        `Arrange the numbers in ${direction} order (from ${sizeHint}! ${arrow})`,
        `Sort these numbers from ${sizeHint}! ${arrow}`,
        `Put these numbers in ${direction} order! ${arrow}`,
        `Can you order these from ${sizeHint}? ${arrow}`,
        `Line up these numbers ${ascending ? 'low to high' : 'high to low'}! ${arrow}`
    ];

    return {
        type: "sort",
        numbers: shuffle([...numbers]),
        correct,
        instruction: instructions[randInt(0, instructions.length - 1)]
    };
}

/** Generate a comparison question (pick <, >, or =) */
function generateCompareQuestion() {
    // Decide which comparison to create
    const compType = randInt(0, 2); // 0=less, 1=greater, 2=equal
    let a, b, correct;
    if (compType === 0) {
        a = randInt(1, 90);
        b = randInt(a + 1, 99);
        correct = "<";
    } else if (compType === 1) {
        b = randInt(1, 90);
        a = randInt(b + 1, 99);
        correct = ">";
    } else {
        a = randInt(1, 99);
        b = a;
        correct = "=";
    }

    const instructions = [
        `Which symbol fits? Is ${a} smaller than, larger than, or equal to ${b}? 🤔`,
        `Compare these numbers! How does ${a} relate to ${b}? 🤔`,
        `Pick the right symbol between ${a} and ${b}! 🤔`,
        `What goes between ${a} __ ${b}? Choose wisely! 🤔`
    ];

    return {
        type: "equation",
        template: [String(a), "SLOT", String(b)],
        options: ["<", ">", "="],
        correct,
        instruction: instructions[randInt(0, instructions.length - 1)]
    };
}

// ─── Level 2 Generators ─────────────────────────────────────────────

/** Generate an addition fill-in-the-blank equation */
function generateAdditionQuestion() {
    const a = randInt(2, 25);
    const b = randInt(2, 25);
    const sum = a + b;
    const slotPos = randInt(0, 2); // 0=first, 1=second, 2=result

    let template, correct, instruction;
    if (slotPos === 0) {
        template = ["SLOT", "+", String(b), "=", String(sum)];
        correct = String(a);
        instruction = `Find the missing number! ? + ${b} = ${sum} ➕`;
    } else if (slotPos === 1) {
        template = [String(a), "+", "SLOT", "=", String(sum)];
        correct = String(b);
        instruction = `Complete the equation: ${a} + ? = ${sum} ➕`;
    } else {
        template = [String(a), "+", String(b), "=", "SLOT"];
        correct = String(sum);
        instruction = `What is ${a} + ${b}? ➕`;
    }

    const distractors = generateDistractors(parseInt(correct), 3, 1, 4, 0);
    const options = shuffle([correct, ...distractors.map(String)]);

    return { type: "equation", template, options, correct, instruction };
}

/** Generate a subtraction fill-in-the-blank equation */
function generateSubtractionQuestion() {
    const b = randInt(2, 20);
    const result = randInt(1, 20);
    const a = b + result; // ensures positive result
    const slotPos = randInt(0, 2);

    let template, correct, instruction;
    if (slotPos === 0) {
        template = ["SLOT", "-", String(b), "=", String(result)];
        correct = String(a);
        instruction = `What number minus ${b} equals ${result}? ➖`;
    } else if (slotPos === 1) {
        template = [String(a), "-", "SLOT", "=", String(result)];
        correct = String(b);
        instruction = `Fill in the blank: ${a} - ? = ${result} ➖`;
    } else {
        template = [String(a), "-", String(b), "=", "SLOT"];
        correct = String(result);
        instruction = `What is ${a} - ${b}? ➖`;
    }

    const distractors = generateDistractors(parseInt(correct), 3, 1, 4, 0);
    const options = shuffle([correct, ...distractors.map(String)]);

    return { type: "equation", template, options, correct, instruction };
}

/** Generate a multiplication fill-in-the-blank equation */
function generateMultiplicationQuestion() {
    const a = randInt(2, 12);
    const b = randInt(2, 12);
    const product = a * b;
    const slotPos = randInt(0, 2);

    let template, correct, instruction;
    if (slotPos === 0) {
        template = ["SLOT", "×", String(b), "=", String(product)];
        correct = String(a);
        instruction = `What number times ${b} is ${product}? ✖️`;
    } else if (slotPos === 1) {
        template = [String(a), "×", "SLOT", "=", String(product)];
        correct = String(b);
        instruction = `Complete: ${a} × ? = ${product} ✖️`;
    } else {
        template = [String(a), "×", String(b), "=", "SLOT"];
        correct = String(product);
        instruction = `What is ${a} × ${b}? ✖️`;
    }

    const distractors = generateDistractors(parseInt(correct), 3, 1, 5, 1);
    const options = shuffle([correct, ...distractors.map(String)]);

    return { type: "equation", template, options, correct, instruction };
}

/** Generate a division fill-in-the-blank equation (clean division only) */
function generateDivisionQuestion() {
    const divisor = randInt(2, 10);
    const quotient = randInt(2, 10);
    const dividend = divisor * quotient; // ensures clean division
    const slotPos = randInt(0, 2);

    let template, correct, instruction;
    if (slotPos === 0) {
        template = ["SLOT", "÷", String(divisor), "=", String(quotient)];
        correct = String(dividend);
        instruction = `What number divided by ${divisor} is ${quotient}? ➗`;
    } else if (slotPos === 1) {
        template = [String(dividend), "÷", "SLOT", "=", String(quotient)];
        correct = String(divisor);
        instruction = `Find the divisor: ${dividend} ÷ ? = ${quotient} ➗`;
    } else {
        template = [String(dividend), "÷", String(divisor), "=", "SLOT"];
        correct = String(quotient);
        instruction = `What is ${dividend} ÷ ${divisor}? ➗`;
    }

    const distractors = generateDistractors(parseInt(correct), 3, 1, 4, 1);
    const options = shuffle([correct, ...distractors.map(String)]);

    return { type: "equation", template, options, correct, instruction };
}

// ─── Level 3 Generators ─────────────────────────────────────────────

/** Generate a sphere/cylinder volume question */
function generateVolumeQuestion() {
    const shapeType = randInt(0, 1); // 0=sphere, 1=cylinder
    if (shapeType === 0) {
        const r = randInt(2, 8);
        const volume = Math.round((4 / 3) * 3.14 * r * r * r);
        const instructions = [
            `Calculate the volume of a sphere with radius ${r}m (π = 3.14, nearest integer) 🔵`,
            `Find V for a spherical object, r = ${r}m. Use π = 3.14. Round to nearest integer. 🔵`,
            `What is the volume of a ball with radius ${r}m? (π ≈ 3.14) 🔵`
        ];
        const distractors = generateDistractors(volume, 3, 5, 30, 1);
        const options = shuffle([String(volume), ...distractors.map(String)]);
        return {
            type: "equation",
            template: ["V = 4/3 × π × " + r + "³", "=", "SLOT"],
            options,
            correct: String(volume),
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    } else {
        const r = randInt(2, 7);
        const h = randInt(3, 12);
        const volume = Math.round(3.14 * r * r * h);
        const instructions = [
            `Find the volume of a cylinder with radius ${r}m and height ${h}m (π = 3.14) 🛢️`,
            `Calculate V = πr²h for r = ${r}m, h = ${h}m. Use π = 3.14, round to nearest integer. 🛢️`,
            `What is the volume of a cylindrical tank (r = ${r}m, h = ${h}m)? π ≈ 3.14 🛢️`
        ];
        const distractors = generateDistractors(volume, 3, 10, 50, 1);
        const options = shuffle([String(volume), ...distractors.map(String)]);
        return {
            type: "equation",
            template: ["V = π × " + r + "² × " + h, "=", "SLOT"],
            options,
            correct: String(volume),
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    }
}

/** Generate a probability question */
function generateProbabilityQuestion() {
    const red = randInt(1, 6);
    const black = randInt(1, 8);
    const total = red + black;
    const askRed = Math.random() < 0.5;
    const favorable = askRed ? red : black;
    const color = askRed ? "red" : "black";
    const prob = Math.round((favorable / total) * 100);

    const instructions = [
        `A box has ${red} red and ${black} black balls. What is the probability (%) of drawing a ${color} ball? 🎲`,
        `If there are ${red} red + ${black} black balls, find P(${color}) as a percentage (nearest integer). 🎲`,
        `From ${total} balls (${red} red, ${black} black), what % chance to pick ${color}? 🎲`
    ];

    const distractors = generateDistractors(prob, 3, 3, 15, 1);
    const options = shuffle([String(prob), ...distractors.map(d => String(Math.max(1, Math.min(99, d))))]);
    // Ensure no duplicate option strings
    const uniqueOptions = [...new Set(options)];
    while (uniqueOptions.length < 4) {
        uniqueOptions.push(String(randInt(5, 95)));
    }

    return {
        type: "equation",
        template: ["P(" + color + ")", "=", "SLOT", "%"],
        options: uniqueOptions.slice(0, 4),
        correct: String(prob),
        instruction: instructions[randInt(0, instructions.length - 1)]
    };
}

/** Generate a polynomial (sum/product of zeroes) question */
function generatePolynomialQuestion() {
    const askSum = Math.random() < 0.5;
    // Generate ax² + bx + c with integer coefficients
    const a = randInt(1, 5);
    const b = randInt(-15, 15);
    const c = randInt(-12, 12);

    // Avoid trivial cases
    if (a === 0) return generatePolynomialQuestion();

    const bSign = b >= 0 ? "+" : "-";
    const cSign = c >= 0 ? "+" : "-";
    const polyStr = `${a}x² ${bSign} ${Math.abs(b)}x ${cSign} ${Math.abs(c)}`;

    if (askSum) {
        // Sum of zeroes = -b/a
        const sumNumerator = -b;
        const sumDenominator = a;
        // Use integer answer if possible
        let correct;
        if (sumNumerator % sumDenominator === 0) {
            correct = String(sumNumerator / sumDenominator);
        } else {
            // Round to 1 decimal
            correct = String(Math.round((sumNumerator / sumDenominator) * 10) / 10);
        }

        const instructions = [
            `Find the sum of zeroes of p(x) = ${polyStr}. 📐`,
            `For the polynomial ${polyStr}, calculate -b/a (sum of roots). 📐`,
            `What is the sum of roots of ${polyStr}? 📐`
        ];

        const numCorrect = parseFloat(correct);
        const distractors = generateDistractors(Math.round(numCorrect), 3, 1, 5);
        const options = shuffle([correct, ...distractors.map(String)]);
        const uniqueOpts = [...new Set(options)].slice(0, 4);
        while (uniqueOpts.length < 4) uniqueOpts.push(String(randInt(-10, 10)));

        return {
            type: "equation",
            template: ["Sum of zeroes", "=", "SLOT"],
            options: uniqueOpts,
            correct,
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    } else {
        // Product of zeroes = c/a
        const prodNumerator = c;
        const prodDenominator = a;
        let correct;
        if (prodNumerator % prodDenominator === 0) {
            correct = String(prodNumerator / prodDenominator);
        } else {
            correct = String(Math.round((prodNumerator / prodDenominator) * 10) / 10);
        }

        const instructions = [
            `Find the product of zeroes of p(x) = ${polyStr}. 📐`,
            `For the polynomial ${polyStr}, calculate c/a (product of roots). 📐`,
            `What is the product of roots of ${polyStr}? 📐`
        ];

        const numCorrect = parseFloat(correct);
        const distractors = generateDistractors(Math.round(numCorrect), 3, 1, 5);
        const options = shuffle([correct, ...distractors.map(String)]);
        const uniqueOpts = [...new Set(options)].slice(0, 4);
        while (uniqueOpts.length < 4) uniqueOpts.push(String(randInt(-10, 10)));

        return {
            type: "equation",
            template: ["Product of zeroes", "=", "SLOT"],
            options: uniqueOpts,
            correct,
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    }
}

// ─── Level 3 NEW: Fraction Generator ────────────────────────────────

/** Helper: Greatest Common Divisor */
function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { [a, b] = [b, a % b]; }
    return a;
}

/** Helper: format a fraction as string "a/b" or whole number */
function fmtFrac(n, d) {
    const g = gcd(n, d);
    n = n / g; d = d / g;
    if (d === 1) return String(n);
    return `${n}/${d}`;
}

/** Generate a fraction question (add, subtract, simplify, compare) */
function generateFractionQuestion() {
    const subType = randInt(0, 3);

    if (subType === 0) {
        // Addition of fractions with same denominator
        const den = randInt(3, 12);
        const n1 = randInt(1, den - 2);
        const n2 = randInt(1, den - n1);
        const sumN = n1 + n2;
        const g = gcd(sumN, den);
        const correct = fmtFrac(sumN, den);

        const instructions = [
            `Add the fractions: ${n1}/${den} + ${n2}/${den} = ? 🍕`,
            `What is ${n1}/${den} + ${n2}/${den}? Simplify if needed! 🍕`,
            `Combine these fractions: ${n1}/${den} + ${n2}/${den} 🍕`
        ];

        const distractorSet = new Set([correct]);
        distractorSet.add(fmtFrac(sumN + 1, den));
        distractorSet.add(fmtFrac(Math.max(1, sumN - 1), den));
        distractorSet.add(fmtFrac(n1 + n2, den + 1));
        const opts = [...distractorSet].slice(0, 4);
        while (opts.length < 4) opts.push(fmtFrac(randInt(1, 8), den));

        return {
            type: "equation",
            template: [`${n1}/${den}`, "+", `${n2}/${den}`, "=", "SLOT"],
            options: shuffle(opts),
            correct,
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    } else if (subType === 1) {
        // Subtraction of fractions with same denominator
        const den = randInt(3, 10);
        const n1 = randInt(2, den - 1);
        const n2 = randInt(1, n1 - 1);
        const diffN = n1 - n2;
        const correct = fmtFrac(diffN, den);

        const instructions = [
            `Subtract: ${n1}/${den} - ${n2}/${den} = ? 🧩`,
            `What is ${n1}/${den} minus ${n2}/${den}? 🧩`,
            `Find the difference: ${n1}/${den} - ${n2}/${den} 🧩`
        ];

        const distractorSet = new Set([correct]);
        distractorSet.add(fmtFrac(diffN + 1, den));
        distractorSet.add(fmtFrac(Math.max(1, diffN - 1), den));
        distractorSet.add(fmtFrac(n1, den));
        const opts = [...distractorSet].slice(0, 4);
        while (opts.length < 4) opts.push(fmtFrac(randInt(1, 6), den));

        return {
            type: "equation",
            template: [`${n1}/${den}`, "−", `${n2}/${den}`, "=", "SLOT"],
            options: shuffle(opts),
            correct,
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    } else if (subType === 2) {
        // Simplify a fraction
        const factor = randInt(2, 6);
        const simpN = randInt(1, 8);
        const simpD = randInt(simpN + 1, 12);
        const bigN = simpN * factor;
        const bigD = simpD * factor;
        const correct = fmtFrac(simpN, simpD);

        const instructions = [
            `Simplify the fraction ${bigN}/${bigD} to its lowest terms ✂️`,
            `Reduce ${bigN}/${bigD} to simplest form! ✂️`,
            `What is ${bigN}/${bigD} in its simplest form? ✂️`
        ];

        const distractorSet = new Set([correct]);
        distractorSet.add(fmtFrac(simpN + 1, simpD));
        distractorSet.add(fmtFrac(simpN, simpD + 1));
        distractorSet.add(`${bigN}/${bigD}`);
        const opts = [...distractorSet].slice(0, 4);
        while (opts.length < 4) opts.push(fmtFrac(randInt(1, 6), randInt(3, 10)));

        return {
            type: "equation",
            template: [`${bigN}/${bigD}`, "=", "SLOT"],
            options: shuffle(opts),
            correct,
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    } else {
        // Compare two fractions (same denominator)
        const den = randInt(3, 10);
        const n1 = randInt(1, den - 1);
        let n2 = randInt(1, den - 1);
        const compChoice = randInt(0, 2);
        if (compChoice === 0) { n2 = n1 > 1 ? n1 - randInt(1, n1 - 1) : n1; }
        else if (compChoice === 1) { n2 = n1 < den - 1 ? n1 + randInt(1, den - 1 - n1) : n1; }
        else { n2 = n1; }

        const correct = n1 < n2 ? "<" : n1 > n2 ? ">" : "=";

        const instructions = [
            `Compare: Is ${n1}/${den} less than, greater than, or equal to ${n2}/${den}? 🤔`,
            `Which symbol goes between ${n1}/${den} __ ${n2}/${den}? 🤔`,
            `Compare these fractions: ${n1}/${den} vs ${n2}/${den} 🤔`
        ];

        return {
            type: "equation",
            template: [`${n1}/${den}`, "SLOT", `${n2}/${den}`],
            options: ["<", ">", "="],
            correct,
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    }
}

// ─── Level 3 NEW: Mixed Number Generator ────────────────────────────

/** Generate a mixed number question */
function generateMixedNumberQuestion() {
    const subType = randInt(0, 2);

    if (subType === 0) {
        // Convert improper fraction to mixed number
        const den = randInt(2, 8);
        const whole = randInt(1, 6);
        const remainder = randInt(1, den - 1);
        const numerator = whole * den + remainder;
        const correct = `${whole} ${remainder}/${den}`;

        const instructions = [
            `Convert ${numerator}/${den} to a mixed number 🔄`,
            `Write ${numerator}/${den} as a whole number and fraction 🔄`,
            `What is ${numerator}/${den} as a mixed number? 🔄`
        ];

        const distractorSet = new Set([correct]);
        distractorSet.add(`${whole + 1} ${remainder}/${den}`);
        distractorSet.add(`${whole} ${Math.min(remainder + 1, den - 1)}/${den}`);
        distractorSet.add(`${Math.max(1, whole - 1)} ${remainder}/${den}`);
        const opts = [...distractorSet].slice(0, 4);
        while (opts.length < 4) opts.push(`${randInt(1, 5)} ${randInt(1, 4)}/${den}`);

        return {
            type: "equation",
            template: [`${numerator}/${den}`, "=", "SLOT"],
            options: shuffle(opts),
            correct,
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    } else if (subType === 1) {
        // Convert mixed number to improper fraction
        const den = randInt(2, 7);
        const whole = randInt(1, 5);
        const remainder = randInt(1, den - 1);
        const numerator = whole * den + remainder;
        const correct = `${numerator}/${den}`;

        const instructions = [
            `Convert ${whole} ${remainder}/${den} to an improper fraction 🔄`,
            `Write ${whole} ${remainder}/${den} as a single fraction 🔄`,
            `What is ${whole} ${remainder}/${den} as an improper fraction? 🔄`
        ];

        const distractorSet = new Set([correct]);
        distractorSet.add(`${numerator + 1}/${den}`);
        distractorSet.add(`${numerator - 1}/${den}`);
        distractorSet.add(`${whole * den}/${den}`);
        const opts = [...distractorSet].slice(0, 4);
        while (opts.length < 4) opts.push(`${randInt(5, 30)}/${den}`);

        return {
            type: "equation",
            template: [`${whole} ${remainder}/${den}`, "=", "SLOT"],
            options: shuffle(opts),
            correct,
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    } else {
        // Add two mixed numbers (same denominator, result simplified)
        const den = randInt(3, 6);
        const w1 = randInt(1, 4);
        const r1 = randInt(1, den - 1);
        const w2 = randInt(1, 3);
        const r2 = randInt(1, den - 1);

        const totalR = r1 + r2;
        const carryWhole = Math.floor(totalR / den);
        const finalR = totalR % den;
        const finalW = w1 + w2 + carryWhole;

        let correct;
        if (finalR === 0) {
            correct = String(finalW);
        } else {
            correct = `${finalW} ${finalR}/${den}`;
        }

        const instructions = [
            `Add: ${w1} ${r1}/${den} + ${w2} ${r2}/${den} = ? ➕🔄`,
            `What is ${w1} ${r1}/${den} plus ${w2} ${r2}/${den}? ➕🔄`,
            `Combine these mixed numbers: ${w1} ${r1}/${den} + ${w2} ${r2}/${den} ➕🔄`
        ];

        const distractorSet = new Set([correct]);
        if (finalR === 0) {
            distractorSet.add(String(finalW + 1));
            distractorSet.add(String(Math.max(1, finalW - 1)));
            distractorSet.add(`${finalW} 1/${den}`);
        } else {
            distractorSet.add(`${finalW + 1} ${finalR}/${den}`);
            distractorSet.add(`${Math.max(1, finalW - 1)} ${finalR}/${den}`);
            distractorSet.add(`${finalW} ${Math.min(finalR + 1, den - 1)}/${den}`);
        }
        const opts = [...distractorSet].slice(0, 4);
        while (opts.length < 4) opts.push(`${randInt(2, 8)} ${randInt(1, 3)}/${den}`);

        return {
            type: "equation",
            template: [`${w1} ${r1}/${den}`, "+", `${w2} ${r2}/${den}`, "=", "SLOT"],
            options: shuffle(opts),
            correct,
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    }
}

// ─── Level 3 NEW: Measurement Generator ─────────────────────────────

/** Generate a measurement conversion question */
function generateMeasurementQuestion() {
    const subType = randInt(0, 3);

    if (subType === 0) {
        // cm ↔ m
        const direction = Math.random() < 0.5; // true = cm→m, false = m→cm
        if (direction) {
            const cm = randInt(1, 9) * 100 + randInt(0, 9) * 10;
            const m = cm / 100;
            const correct = String(m);

            const scenarios = [
                `A ribbon is ${cm} cm long. How many meters is that? 📏`,
                `Convert ${cm} cm to meters 📏`,
                `A desk is ${cm} cm wide. Express in meters 📏`
            ];

            const distractors = generateDistractors(m * 10, 3, 1, 5, 1).map(d => String(d / 10));
            const opts = shuffle([correct, ...distractors]);
            const uniqueOpts = [...new Set(opts)].slice(0, 4);
            while (uniqueOpts.length < 4) uniqueOpts.push(String((randInt(1, 20) / 10).toFixed(1)));

            return {
                type: "equation",
                template: [`${cm} cm`, "=", "SLOT", "m"],
                options: uniqueOpts,
                correct,
                instruction: scenarios[randInt(0, scenarios.length - 1)]
            };
        } else {
            const m = randInt(1, 15);
            const cm = m * 100;
            const correct = String(cm);

            const scenarios = [
                `A rope is ${m} meters long. How many centimeters? 📏`,
                `Convert ${m} m to centimeters 📏`,
                `A hallway is ${m} m long. Express in cm 📏`
            ];

            const distractors = generateDistractors(cm, 3, 50, 200, 10);
            const opts = shuffle([correct, ...distractors.map(String)]);
            const uniqueOpts = [...new Set(opts)].slice(0, 4);
            while (uniqueOpts.length < 4) uniqueOpts.push(String(randInt(100, 2000)));

            return {
                type: "equation",
                template: [`${m} m`, "=", "SLOT", "cm"],
                options: uniqueOpts,
                correct,
                instruction: scenarios[randInt(0, scenarios.length - 1)]
            };
        }
    } else if (subType === 1) {
        // kg ↔ g
        const direction = Math.random() < 0.5;
        if (direction) {
            const g = randInt(1, 9) * 1000;
            const kg = g / 1000;
            const correct = String(kg);

            const scenarios = [
                `A watermelon weighs ${g} grams. How many kilograms? ⚖️`,
                `Convert ${g} g to kilograms ⚖️`,
                `A bag of flour is ${g} g. Express in kg ⚖️`
            ];

            const distractors = generateDistractors(kg, 3, 1, 3, 1);
            const opts = shuffle([correct, ...distractors.map(String)]);
            const uniqueOpts = [...new Set(opts)].slice(0, 4);
            while (uniqueOpts.length < 4) uniqueOpts.push(String(randInt(1, 10)));

            return {
                type: "equation",
                template: [`${g} g`, "=", "SLOT", "kg"],
                options: uniqueOpts,
                correct,
                instruction: scenarios[randInt(0, scenarios.length - 1)]
            };
        } else {
            const kg = randInt(1, 8);
            const g = kg * 1000;
            const correct = String(g);

            const scenarios = [
                `A suitcase weighs ${kg} kg. How many grams? ⚖️`,
                `Convert ${kg} kg to grams ⚖️`,
                `A puppy weighs ${kg} kg. Express in grams ⚖️`
            ];

            const distractors = generateDistractors(g, 3, 500, 2000, 500);
            const opts = shuffle([correct, ...distractors.map(String)]);
            const uniqueOpts = [...new Set(opts)].slice(0, 4);
            while (uniqueOpts.length < 4) uniqueOpts.push(String(randInt(1, 10) * 1000));

            return {
                type: "equation",
                template: [`${kg} kg`, "=", "SLOT", "g"],
                options: uniqueOpts,
                correct,
                instruction: scenarios[randInt(0, scenarios.length - 1)]
            };
        }
    } else if (subType === 2) {
        // L ↔ mL
        const direction = Math.random() < 0.5;
        if (direction) {
            const mL = randInt(1, 5) * 1000;
            const L = mL / 1000;
            const correct = String(L);

            const scenarios = [
                `A bottle contains ${mL} mL of water. How many liters? 🧪`,
                `Convert ${mL} mL to liters 🧪`,
                `A jug holds ${mL} mL of juice. Express in liters 🧪`
            ];

            const distractors = generateDistractors(L, 3, 1, 3, 1);
            const opts = shuffle([correct, ...distractors.map(String)]);
            const uniqueOpts = [...new Set(opts)].slice(0, 4);
            while (uniqueOpts.length < 4) uniqueOpts.push(String(randInt(1, 8)));

            return {
                type: "equation",
                template: [`${mL} mL`, "=", "SLOT", "L"],
                options: uniqueOpts,
                correct,
                instruction: scenarios[randInt(0, scenarios.length - 1)]
            };
        } else {
            const L = randInt(1, 6);
            const mL = L * 1000;
            const correct = String(mL);

            const scenarios = [
                `A tank holds ${L} liters. How many milliliters? 🧪`,
                `Convert ${L} L to milliliters 🧪`,
                `A fish tank has ${L} L of water. Express in mL 🧪`
            ];

            const distractors = generateDistractors(mL, 3, 500, 2000, 500);
            const opts = shuffle([correct, ...distractors.map(String)]);
            const uniqueOpts = [...new Set(opts)].slice(0, 4);
            while (uniqueOpts.length < 4) uniqueOpts.push(String(randInt(1, 8) * 1000));

            return {
                type: "equation",
                template: [`${L} L`, "=", "SLOT", "mL"],
                options: uniqueOpts,
                correct,
                instruction: scenarios[randInt(0, scenarios.length - 1)]
            };
        }
    } else {
        // km ↔ m
        const direction = Math.random() < 0.5;
        if (direction) {
            const m = randInt(1, 9) * 1000;
            const km = m / 1000;
            const correct = String(km);

            const scenarios = [
                `A running track is ${m} m long. How many kilometers? 🏃`,
                `Convert ${m} m to kilometers 🏃`,
                `A road stretches ${m} m. Express in km 🏃`
            ];

            const distractors = generateDistractors(km, 3, 1, 4, 1);
            const opts = shuffle([correct, ...distractors.map(String)]);
            const uniqueOpts = [...new Set(opts)].slice(0, 4);
            while (uniqueOpts.length < 4) uniqueOpts.push(String(randInt(1, 12)));

            return {
                type: "equation",
                template: [`${m} m`, "=", "SLOT", "km"],
                options: uniqueOpts,
                correct,
                instruction: scenarios[randInt(0, scenarios.length - 1)]
            };
        } else {
            const km = randInt(1, 8);
            const m = km * 1000;
            const correct = String(m);

            const scenarios = [
                `A marathon section is ${km} km. How many meters? 🏃`,
                `Convert ${km} km to meters 🏃`,
                `A bike path is ${km} km long. Express in m 🏃`
            ];

            const distractors = generateDistractors(m, 3, 500, 2000, 500);
            const opts = shuffle([correct, ...distractors.map(String)]);
            const uniqueOpts = [...new Set(opts)].slice(0, 4);
            while (uniqueOpts.length < 4) uniqueOpts.push(String(randInt(1, 10) * 1000));

            return {
                type: "equation",
                template: [`${km} km`, "=", "SLOT", "m"],
                options: uniqueOpts,
                correct,
                instruction: scenarios[randInt(0, scenarios.length - 1)]
            };
        }
    }
}

// ─── Level 3 NEW: Money Generator ───────────────────────────────────

/** Generate a money math question */
function generateMoneyQuestion() {
    const subType = randInt(0, 3);

    if (subType === 0) {
        // Calculate total cost
        const items = [
            { name: "pencil", emoji: "✏️" },
            { name: "notebook", emoji: "📓" },
            { name: "eraser", emoji: "🧹" },
            { name: "ruler", emoji: "📏" },
            { name: "pen", emoji: "🖊️" },
            { name: "crayon", emoji: "🖍️" },
            { name: "glue stick", emoji: "🧴" },
            { name: "sticker pack", emoji: "⭐" }
        ];
        const item1 = items[randInt(0, items.length - 1)];
        let item2 = items[randInt(0, items.length - 1)];
        while (item2.name === item1.name) item2 = items[randInt(0, items.length - 1)];

        const price1 = randInt(5, 45);
        const price2 = randInt(5, 45);
        const total = price1 + price2;
        const correct = String(total);

        const instructions = [
            `A ${item1.name} ${item1.emoji} costs ₹${price1} and a ${item2.name} ${item2.emoji} costs ₹${price2}. What is the total? 💰`,
            `You buy a ${item1.name} for ₹${price1} and a ${item2.name} for ₹${price2}. Total cost? 💰`,
            `${item1.emoji} ₹${price1} + ${item2.emoji} ₹${price2} = ? Find the total! 💰`
        ];

        const distractors = generateDistractors(total, 3, 2, 8, 5);
        const opts = shuffle([correct, ...distractors.map(String)]);

        return {
            type: "equation",
            template: [`₹${price1}`, "+", `₹${price2}`, "=", "SLOT"],
            options: opts,
            correct,
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    } else if (subType === 1) {
        // Calculate change
        const paid = [50, 100, 200, 500][randInt(0, 3)];
        const cost = randInt(10, paid - 5);
        const change = paid - cost;
        const correct = String(change);

        const instructions = [
            `You pay ₹${paid} for an item costing ₹${cost}. How much change do you get back? 💵`,
            `An item costs ₹${cost}. You give ₹${paid}. What is the change? 💵`,
            `Change from ₹${paid} after spending ₹${cost}? 💵`
        ];

        const distractors = generateDistractors(change, 3, 3, 15, 1);
        const opts = shuffle([correct, ...distractors.map(String)]);

        return {
            type: "equation",
            template: [`₹${paid}`, "−", `₹${cost}`, "=", "SLOT"],
            options: opts,
            correct,
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    } else if (subType === 2) {
        // Multiple items same price
        const qty = randInt(2, 6);
        const price = randInt(5, 30);
        const total = qty * price;
        const correct = String(total);

        const itemNames = ["candy bars", "juice boxes", "cookies", "toy cars", "stamps", "marbles"];
        const item = itemNames[randInt(0, itemNames.length - 1)];

        const instructions = [
            `${qty} ${item} cost ₹${price} each. What is the total cost? 🛒`,
            `If each item costs ₹${price}, how much for ${qty} ${item}? 🛒`,
            `You buy ${qty} ${item} at ₹${price} each. Total = ? 🛒`
        ];

        const distractors = generateDistractors(total, 3, 5, 20, 5);
        const opts = shuffle([correct, ...distractors.map(String)]);

        return {
            type: "equation",
            template: [`${qty}`, "×", `₹${price}`, "=", "SLOT"],
            options: opts,
            correct,
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    } else {
        // Discount / sale price
        const original = randInt(2, 20) * 10; // 20, 30, ... 200
        const discountPct = [10, 20, 25, 50][randInt(0, 3)];
        const discount = Math.round(original * discountPct / 100);
        const salePrice = original - discount;
        const correct = String(salePrice);

        const instructions = [
            `A toy costs ₹${original}. It's on ${discountPct}% off sale. What is the sale price? 🏷️`,
            `${discountPct}% discount on ₹${original}. How much do you pay? 🏷️`,
            `Original price: ₹${original}, Discount: ${discountPct}%. Final price = ? 🏷️`
        ];

        const distractors = generateDistractors(salePrice, 3, 5, 25, 5);
        const opts = shuffle([correct, ...distractors.map(String)]);

        return {
            type: "equation",
            template: [`₹${original}`, "−", `${discountPct}%`, "=", "SLOT"],
            options: opts,
            correct,
            instruction: instructions[randInt(0, instructions.length - 1)]
        };
    }
}

// ─── Main Generator ─────────────────────────────────────────────────

/** Map of level → vaultId → generator function */
const GENERATORS = {
    1: {
        0: () => generateSortQuestion(true),    // Ascending sort
        1: () => generateSortQuestion(false),   // Descending sort
        2: () => generateCompareQuestion()      // Comparing numbers
    },
    2: {
        0: () => generateAdditionQuestion(),
        1: () => generateSubtractionQuestion(),
        2: () => generateMultiplicationQuestion(),
        3: () => generateDivisionQuestion()
    },
    3: {
        0: () => generateVolumeQuestion(),
        1: () => generateProbabilityQuestion(),
        2: () => generatePolynomialQuestion(),
        3: () => generateFractionQuestion(),
        4: () => generateMixedNumberQuestion(),
        5: () => generateMeasurementQuestion(),
        6: () => generateMoneyQuestion()
    }
};

/**
 * Generate `count` unique random math questions for a given level and vault.
 * @param {number} level - 1, 2, or 3
 * @param {number} vaultId - vault index (0-based)
 * @param {number} count - number of questions (default 10)
 * @returns {Array} Array of question objects compatible with the comic puzzle UI
 */
export function generateQuestions(level, vaultId, count = 10) {
    const generator = GENERATORS[level]?.[vaultId];
    if (!generator) {
        console.warn(`No question generator for level ${level}, vault ${vaultId}`);
        return [];
    }

    const questions = [];
    const seen = new Set();

    let attempts = 0;
    while (questions.length < count && attempts < count * 20) {
        const q = generator();
        // Create a fingerprint to detect duplicates
        const fingerprint = q.type === "sort"
            ? q.numbers.join(',')
            : (q.template.join('|') + '|' + q.correct);

        if (!seen.has(fingerprint)) {
            seen.add(fingerprint);
            questions.push(q);
        }
        attempts++;
    }

    return questions;
}
