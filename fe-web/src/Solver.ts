import { TreeNode, costOfTree, evalTree, printTree } from './Factor.ts'
export class Solver {
    state: {
        scores: { [key: string]: number }, bestTrees: { [key: string]: [TreeNode, string, number] }, allTrees: { [key: string]: [TreeNode, string, number] }, costBound: number, finished: boolean;
    }
    config: { extractionMask: number; target: number; maxnum: number };
    constructor() {
        this.state = { scores: {}, bestTrees: {}, allTrees: {}, costBound: 1000000, finished: false };
        this.config = { extractionMask: 0, target: 0, maxnum: 0 };
    }
    getScoreFor(tree: TreeNode) {
        const strTree = printTree(tree);
        if (this.state.scores[strTree] !== undefined) {
            return this.state.scores[strTree];
        }
        const score = costOfTree(tree);
        this.state.scores[strTree] = score;
        return score;
    }
    getScoreForPair(tree: TreeNode, stringTree: string) {
        if (this.state.scores[stringTree] !== undefined) {
            return this.state.scores[stringTree];
        }
        const score = costOfTree(tree);
        this.state.scores[stringTree] = score;
        return score;
    }


    requestStep() {
        if (!this.config) {
            throw "Need config first"
        }
        const bestTrees = this.state.bestTrees;
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
                    const newTree = [op, tree1[0], tree2[0]] as TreeNode;
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


    factorCache: { [k: string]: number[] } = {};
    findAllFactors(num: number): number[] {
        if (this.factorCache['' + num]) {
            return this.factorCache['' + num];
        }
        var result = [] as number[];
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
        this.factorCache['' + num] = result;
        return result;
    }

    findLargestFactor(num: number) {
        var factors = this.findAllFactors(num);
        return factors[factors.length - 1];
    }
    requestResetAndTarget(extractionMask: number, target: number, maxnum: number) {
        this.config = { extractionMask, target, maxnum };
        this.state = { costBound: 10000, scores: {}, bestTrees: {}, allTrees: {}, finished: false };
        for (var i = 0; i < 24; ++i) {
            var mask = 1 << i;
            if ((mask & this.config.extractionMask) === 0) {
                continue;
            }
            const tree = [i + 1] as TreeNode;
            this.state.bestTrees[i + 1] = [tree, printTree(tree), this.getScoreFor(tree)];
        }
        this.state.allTrees = { ...this.state.bestTrees };
        return { success: true };
    }

    findFactorTreeFor(target: number): TreeNode {
        var factors = this.findAllFactors(target);
        var trees = [] as TreeNode[];
        var lastFactor = 1;
        var count = 0;
        for (var factor of factors) {
            while (trees.length > 1) {
                trees.push(['*', trees.pop(), trees.pop()] as TreeNode);
            }
            if (factor != lastFactor) {
                if (lastFactor == 1) {
                    lastFactor = factor;
                    count = 1;
                    continue;
                }
                if (count == 1) {
                    trees.push(this.findTopTreeFor(lastFactor))
                    lastFactor = factor;
                    continue;
                }
                trees.push(['^', this.findTopTreeFor(lastFactor), [count]]);
                lastFactor = factor;
                count = 1;
                continue;
            }
            count += 1;
        }
        if (lastFactor != 1) {
            if (count == 1) {
                trees.push(this.findTopTreeFor(lastFactor))
            }
            if (count > 1) {
                trees.push(['^', this.findTopTreeFor(lastFactor), [count]]);
            }
            lastFactor = 1;
        }
        while (trees.length > 1) {
            trees.push(['*', trees.pop(), trees.pop()] as TreeNode);
        }
        return trees[0];
    }

    findTopTreeFor(num: number): TreeNode {
        if (num < 100) {
            return this.findBestTreeFor(num)[0];
        }
        var bestOffset = 0;
        var bestFactor = this.findLargestFactor(num);
        var target;
        for (var i = 0; i < 2; ++i) {
            var d = i * 2 - 1;
            for (var j = 0; j < smallExtractors().length; ++j) {
                var e = smallExtractors()[j];
                target = num + d * e;
                var f = this.findLargestFactor(target);
                if (f < bestFactor) {
                    bestFactor = f;
                    bestOffset = d * e;
                }
            }
        }
        target = num + bestOffset
        var ftree = this.findFactorTreeFor(target);
        if (bestOffset == 0) {
            return ftree;
        }
        if (bestOffset > 0) {
            return ['-', ftree, [bestOffset]];
        }
        return ['+', ftree, [-bestOffset]];
    }
    findBestTreeFor(target: number) {
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
};


function smallExtractors() {
    return [1, 2, 3, 4, 5, 6, 7, 9, 11, 13, 17];
}
