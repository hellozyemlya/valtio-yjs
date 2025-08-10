import * as Y from 'yjs';
type Options = {
    transactionOrigin?: any;
};
export declare const UNDEFINED_YJS_PLACEHOLDER = "__valtio-yjs-undefined__";
export declare function bind<T>(p: Record<string, T> | T[], y: Y.Map<T> | Y.Array<T>, opts?: Options): () => void;
export {};
