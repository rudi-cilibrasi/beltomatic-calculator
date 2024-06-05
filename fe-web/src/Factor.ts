
export type BinaryOperator = '+' | '-' | '*' | '^';
export type TreeNode = [number] | [BinaryOperator, TreeNode, TreeNode];

export function costForOperator(op: BinaryOperator): number {
    switch (op) {
        case '+': return 1.5;
        case '*': return 1.8;
        case '-': return 2.7;
        case '^': return 3.2;
        default:
            throw "Unnown operator: " + op;
    }

}
export function costForExtractor(num: number): number {
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

export function findOperatorCost(tree: TreeNode): number {
    const treeLength = tree.length;
    if (treeLength !== 3) {
        return 0;
    }
    const op = tree[0] as BinaryOperator;
    const left = tree[1];
    const right = tree[2];
    return costForOperator(op) + findOperatorCost(left) + findOperatorCost(right);
}

export function findExtractorsUsedByTree(tree: TreeNode, extracts: boolean[]) {
    if (tree.length === 1) {
        extracts[+tree[0]] = true;
        return;
    }
    findExtractorsUsedByTree(tree[1], extracts);
    findExtractorsUsedByTree(tree[2], extracts);
}

export function costOfTree(tree: TreeNode) {
    var extracts = [
        false, false, false, false, false, false, false, false, false, false,
        false, false, false, false, false, false, false, false, false, false
    ];
    findExtractorsUsedByTree(tree, extracts);
    const opCost = findOperatorCost(tree);
    var acc = 0;
    for (var idx = 0; idx < extracts.length; idx++) {
        var used = extracts[idx];
        if (used) {
            const exCost = costForExtractor(idx);
            acc = acc + exCost;
        }
    };
    return acc + opCost
}

export function evalTree(tree: TreeNode): number {
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
export function printTree(tree: TreeNode): string {
    switch (tree.length) {
        case 3:
            return "(" + printTree(tree[1]) + " " + tree[0] + " " + printTree(tree[2]) + ")";
        case 1:
            return '' + tree[0];
        default:
            throw "Unnown tree type: " + tree;
    }
}
