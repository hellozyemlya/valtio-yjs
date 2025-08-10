import { subscribe } from 'valtio/vanilla';
type Op = Parameters<Parameters<typeof subscribe>[1]>[0][number];
type ArrayOp = [
    op: 'insert' | 'set' | 'delete',
    index: number,
    value1: unknown,
    value2: unknown
];
export declare const parseProxyOps: (ops: Op[]) => ArrayOp[];
export {};
