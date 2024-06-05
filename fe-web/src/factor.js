
class SolverResponse {
    constructor(finished, target, extractionMask, maxnum, equation, score) {
        this.finished = finished;
        this.target = target;
        this.extractionMask = extractionMask;
        this.maxnum = maxnum;
        this.equation = equation;
        this.score = score;
    }
}

function costForOperator(op) {
    switch (op) {
        case '+': return 1.5;
        case '*': return 1.8;
        case '-': return 2.7;
        case '^': return 3.2;
        default:
            throw "Unnown operator: " + op;
    }

}
function costForExtractor(num) {
    switch (num) {
        case 1: return 1.0;
        case 2: return 1.3;
        case 3: return 1.8;
        case 4: return 3;
        case 5: return 2.5;
        case 6: return 5;
        case 7: return 5.1;
        case 11: return 6.5;
        case 13: return 7;
        case 17: return 9;
        default:
            throw "Unnown extractor: " + num;
    }
}

function findOperatorCost(tree) {
    const treeLength = tree.length;

    switch (treeLength) {
        case 3:
            return tree.reduce((acc, leaf) => acc + findOperatorCost(leaf), 0);
        case 1:
            if (typeof (tree[0]) === "string") {
                return costForOperator(tree);
            }
            return 0;
        default:
            throw "Unnown tree type: " + tree;
    }
}

function findExtractorsUsedByTree(tree, extracts) {
    if (tree.length === 1) {
        extracts[+tree[0]] = true;
        return;
    }
    for (const leaf of tree) {
        findExtractorsUsedByTree(leaf, extracts);
    }
}

function costOfTree(tree) {
    var extracts = [
        false, false, false, false, false, false, false, false, false, false,
        false, false, false, false, false, false, false, false, false, false
    ];
    findExtractorsUsedByTree(tree, extracts);
    const opCost = findOperatorCost(tree);
    const fullExConst = extracts.reduce((acc, used, idx) => {
        if (used) {
            const exCost = costForExtractor(idx);
            return acc + exCost;
        }
        return acc;
    });
    return fullExConst + opCost
}

function evalTree(tree) {
    switch (tree.length) {
        case 3:
            switch (tree[0]) {
                case '+':
                    return evalTree(tree[1]) + evalTree(tree[2]);
                case '-':
                    return evalTree(tree[1]) - evalTree(tree[2]);
                case '*':
                    return evalTree(tree[1]) * evalTree(tree[2]);
                case '^':
                    return Math.pow(evalTree(tree[1]), evalTree(tree[2]));
                default:
                    throw "Unnown operator: " + tree[0];
            }
        case 1:
            return +tree;
        default:
            throw "Unnown tree type: " + tree;
    }
}
function printTree(tree) {
    switch (tree.length) {
        case 3:
            return "(" + printTree(tree[1]) + " " + tree[0] + " " + printTree(tree[2]) + ")";
        case 1:
            return '' + tree[0];
        default:
            throw "Unnown tree type: " + tree;
    }
}

class Solver {
    constructor() {
        this.state = {};
    }
    getScoreFor(tree) {
        const strTree = printTree(tree);
        if (this.state.scores[strTree] !== undefined) {
            return this.state.scores[strTree];
        }
        const score = costOfTree(tree);
        this.state.scores[strTree] = score;
        return score;
    }

    getScoreForPair(tree, stringTree) {
        if (this.state.scores[stringTree] !== undefined) {
            return this.state.scores[stringTree];
        }
        const score = costOfTree(tree);
        this.state.scores[stringTree] = score;
        return score;
    }

    requestResetAndTarget(extractionMask, target, maxnum) {
        this.config = { extractionMask, target, maxnum };
        this.state = { costBound: 10000 };
        return { success: true };
    }
    requestStep() {
        if (!this.config) {
            throw "Need config first"
        }
        const scores = this.state.scores || {};
        const bestTrees = this.state.bestTrees || {};
        var firstRound = !this.state.scores;
        this.state.scores = scores;
        this.state.bestTrees = bestTrees;
        if (firstRound) {
            for (var i = 0; i < 24; ++i) {
                var mask = 1 << i;
                if ((mask & this.config.extractionMask) === 0) {
                    continue;
                }
                const tree = [i + 1];
                bestTrees[i + 1] = [tree, printTree(tree), this.getScoreFor(tree)];
            }
        }

        const allTrees = this.state.allTrees || { ...bestTrees };
        this.state.allTrees = allTrees;
        const nextBestTrees = { ...allTrees };
        var didSomething = false;
        for (const tree1 of Object.values(allTrees)) {
            if (!tree1) { continue; }
            if (tree1[2] >= this.state.costBound) {
                continue;
            }
            for (const tree2 of Object.values(allTrees)) {
                if (!tree2) { continue; }
                if (tree2[2] >= this.state.costBound) {
                    continue;
                }
                for (const op of ['+', '-', '*', '^']) {
                    const newTree = [op, tree1[0], tree2[0]];
                    const val = evalTree(newTree);
                    if (Math.floor(val) != val) {
                        continue;
                    }
                    if (val === undefined) {
                        continue;
                    }
                    if (Math.abs(val) > this.config.maxnum && val != this.config.target) {
                        continue;
                    }
                    const stringTree = printTree(newTree);
                    const oldCost = (nextBestTrees[val] || allTrees[val]) ? (nextBestTrees[val] || allTrees[val])[2] : 1000000;
                    const score = this.getScoreForPair(newTree, stringTree);
                    if (score === undefined) {
                        continue;
                    }
                    if (score >= this.state.costBound) {
                        continue;
                    }
                    if (score < oldCost) {
                        nextBestTrees[val] = [newTree, stringTree, score];
                        didSomething = true;
                        if (val === this.config.target) {
                            this.state.costBound = score;
                        }
                    }
                }
            }
        }
        this.state.allTrees = nextBestTrees;
        this.state.bestTrees = { ...nextBestTrees }
        this.state.finished = !didSomething;
        return this.state;
    }
};

var factorCache = {};
function findAllFactors(num) {
    if (factorCache['' + num]) {
        return factorCache['' + num];
    }
    var result = [];
    var target = num;
    if (target <= 1) {
        return result;
    }
    var didSomething = false;
    do {
        didSomething = false;
        var j = 2;
        if (target % j == 0) {
            result.push(j);
            target /= j;
            didSomething = true;
            continue;
        }
        for (var j = 3; j * j < target + 10; j += 2) {
            if (target % j == 0) {
                result.push(j);
                target /= j;
                didSomething = true;
            }
        }
        if (target == 1) { break; }
    } while (didSomething);
    if (target > 1) {
        result.push(target);
    }
    result.sort((a, b) => a - b);
    factorCache['' + num] = result;
    return result;
}

function findLargestFactor(num) {
    var factors = findAllFactors(num);
    return factors[factors.length - 1];
}


function findBestTreeFor(target) {
    var s = new Solver();
    var extractionMask = 0;
    for (var i of smallExtractors()) {
        extractionMask = extractionMask | (1 << (i - 1));
    }
    var maxnum = target + 50;
    s.requestResetAndTarget(extractionMask, target, maxnum);
    var result;
    var done = false;
    do {
        result = s.requestStep();
        done = result.finished;
    } while (!done);
    const treerow = result.bestTrees['' + target];
    return treerow;
}
function findTopTreeFor(num) {
    if (num < 100) {
        return findBestTreeFor(num)[0];
    }
    var bestOffset = 0;
    var bestFactor = findLargestFactor(num);
    var target;
    for (var i = 0; i < 2; ++i) {
        var d = i * 2 - 1;
        for (var j = 0; j < smallExtractors().length; ++j) {
            var e = smallExtractors()[j];
            target = num + d * e;
            var f = findLargestFactor(target);
            if (f < bestFactor) {
                bestFactor = f;
                bestOffset = d * e;
            }
        }
    }
    target = num + bestOffset
    var ftree = findFactorTreeFor(target);
    if (bestOffset == 0) {
        return ftree;
    }
    if (bestOffset > 0) {
        return ['-', ftree, [bestOffset]];
    }
    return ['+', ftree, [-bestOffset]];
}

function findFactorTreeFor(target) {
    var factors = findAllFactors(target);
    var trees = [];
    var lastFactor = 1;
    var count = 0;
    for (var factor of factors) {
        while (trees.length > 1) {
            trees.push(['*', trees.pop(), trees.pop()]);
        }
        if (factor != lastFactor) {
            if (lastFactor == 1) {
                lastFactor = factor;
                count = 1;
                continue;
            }
            if (count == 1) {
                trees.push(findTopTreeFor(lastFactor))
                lastFactor = factor;
                continue;
            }
            trees.push(['^', findTopTreeFor(lastFactor), [count]]);
            lastFactor = factor;
            count = 1;
            continue;
        }
        count += 1;
    }
    if (lastFactor != 1) {
        if (count == 1) {
            trees.push(findTopTreeFor(lastFactor))
        }
        if (count > 1) {
            trees.push(['^', findTopTreeFor(lastFactor), [count]]);
        }
        lastFactor = 1;
    }
    while (trees.length > 1) {
        trees.push(['*', trees.pop(), trees.pop()]);
    }
    return trees[0];
}

function smallExtractors() {
    return [1, 2, 3, 4, 5, 6, 7, 11, 13, 17];
}
function doBeltTest(num) {
    console.log("Doing belt test for ", num);
    var topTree = findTopTreeFor(num);
    console.log(printTree(topTree));
}
/*
function main() {
    var args = process.argv;
    doBeltTest(+args[2]);
}
*/

// main()
