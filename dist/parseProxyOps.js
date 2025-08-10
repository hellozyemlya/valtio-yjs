import { subscribe } from 'valtio/vanilla';
export const parseProxyOps = (ops) => {
    const indexed = new Set();
    let deleteCount = 0;
    const arrayOps = ops.flatMap((op) => {
        if (op[0] === 'resolve' || op[0] === 'reject') {
            return [];
        }
        const key = op[1][op[1].length - 1];
        if (op[0] === 'delete') {
            deleteCount += 1;
        }
        if (key === 'length' && op[0] === 'set') {
            const newLength = Number(op[2]);
            const oldLength = Number(op[3]);
            if (Number.isFinite(newLength) && Number.isFinite(oldLength)) {
                // Standard deletions emit a 'delete' operation, followed at the end by a 'set'
                // operation with the new length (which should not be kept, as the delete op
                // will already take care of changing the length). But direct length mutations
                // don't emit 'delete' ops and must converted to yjs ops. We simply count how
                // many deletions are indirectly taken care of by the 'delete' ops, and emit
                // the remaining if necessary.
                const toDelete = oldLength - newLength - deleteCount;
                if (toDelete > 0) {
                    return Array.from({ length: toDelete }, () => ['delete', newLength, undefined, undefined]);
                }
                else if (newLength > oldLength) {
                    return Array.from({ length: newLength - oldLength }, () => ['insert', oldLength, null, undefined]);
                }
            }
            return [];
        }
        const index = Number(key);
        if (!Number.isFinite(index))
            return [];
        indexed.add(index);
        return [[op[0], index, op[2], op[3]]];
    });
    const findCorrespondingInsert = (startOpIndex, startArrayIndex) => {
        let s = 0;
        let noInsert = null;
        while (startOpIndex + s + 1 < arrayOps.length) {
            if ((arrayOps[startOpIndex + s + 1][0] === 'set' ||
                arrayOps[startOpIndex + s + 1][0] === 'insert') &&
                arrayOps[startOpIndex + s + 1][1] < startArrayIndex &&
                arrayOps[startOpIndex + s + 1][3] === arrayOps[startOpIndex][2]) {
                return s + 1;
            }
            if (noInsert === null &&
                (arrayOps[startOpIndex + s + 1][0] === 'set' ||
                    arrayOps[startOpIndex + s + 1][0] === 'insert') &&
                arrayOps[startOpIndex + s + 1][1] === startArrayIndex - (s + 1) &&
                arrayOps[startOpIndex + s + 1][3] === undefined) {
                s += 1;
            }
            else if (noInsert === null &&
                startOpIndex + s + 1 < arrayOps.length &&
                arrayOps[startOpIndex + s + 1][0] === 'set' &&
                arrayOps[startOpIndex + s + 1][3] !== undefined) {
                noInsert = [startOpIndex + s + 1, arrayOps[startOpIndex + s + 1][1]];
                s += 1;
            }
            else if (noInsert !== null &&
                arrayOps[startOpIndex + s + 1][0] === 'set' &&
                arrayOps[startOpIndex + s + 1][1] ===
                    noInsert[1] + (s + 1 - noInsert[0]) &&
                arrayOps[startOpIndex + s + 1][3] !== undefined) {
                s += 1;
            }
            else {
                return null;
            }
        }
        return null;
    };
    const findContinuousDelete = (startOpIndex, startArrayIndex) => {
        let d = 0;
        while (startOpIndex + d + 1 < arrayOps.length &&
            arrayOps[startOpIndex + d + 1][0] === 'delete' &&
            arrayOps[startOpIndex + d + 1][1] === startArrayIndex - (d + 1)) {
            d += 1;
        }
        return d;
    };
    let i = 0;
    while (i < arrayOps.length) {
        if ((arrayOps[i][0] === 'set' || arrayOps[i][0] === 'insert') &&
            arrayOps[i][3] === undefined) {
            const startArrayIndex = arrayOps[i][1];
            const s = findCorrespondingInsert(i, startArrayIndex);
            if (s !== null) {
                const newArrayOp = [
                    'insert',
                    arrayOps[i + s][1],
                    arrayOps[i + s][2],
                    undefined,
                ];
                arrayOps.splice(i + s, 1, newArrayOp);
                arrayOps.splice(i, 1);
            }
            else {
                i += 1;
            }
        }
        else if (i > 0 && arrayOps[i][0] === 'delete') {
            const startArrayIndex = arrayOps[i][1];
            const d = findContinuousDelete(i, startArrayIndex);
            if (arrayOps[i - 1][0] === 'set' &&
                arrayOps[i - 1][1] === startArrayIndex - (d + 1) &&
                arrayOps[i - 1][2] === arrayOps[i][2]) {
                const newArrayOp = [
                    'delete',
                    startArrayIndex - (d + 1),
                    arrayOps[i - 1][3],
                    undefined,
                ];
                arrayOps.splice(i - 1, 2);
                arrayOps.splice(i - 1 + d, 0, newArrayOp);
                i -= 1;
            }
            else {
                i += 1;
            }
        }
        else {
            i += 1;
        }
    }
    return arrayOps;
};
