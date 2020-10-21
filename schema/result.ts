import { absurd } from './common';


export function Ok<A, E> (a: A): Result<A, E> {
    return {
        asTuple: () => [a, null],
        unwrap: (msg: string = "") => a,
        unwrapErr: (msg: string = `Ok(${a})`) => {
            throw new Error(msg);
            return absurd<E>();
        },
        isOk: () => true,
        isErr: () => false,
        map: <B>(fn: (a: A) => B) => Ok<B, E>(fn(a)),
        flatMap: <B>(fn: (a: A) => Result<B, E>) => fn(a),
    };
}


export function Err<A, E> (e: E): Result<A, E> {
    return {
        asTuple: () => [null, e],
        unwrap: (msg: string = `Err(${e})`) => {
            throw new Error(msg);
            return absurd<A>();
        },
        unwrapErr: (msg: string = "") => e,
        isOk: () => false,
        isErr: () => true,
        map: <B>(fn: (a: A) => B) => Err<B, E>(e),
        flatMap: <B>(fn: (a: A) => Result<B, E>) => Err<B, E>(e),
    };
}



export interface Result<A, E>{
    asTuple: () => [A?, E?];
    unwrap: (msg?: string) => A;
    unwrapErr: (msg?: string) => E;
    isOk: () => boolean;
    isErr: () => boolean;
    map: <B>(fn: (a: A) => B) => Result<B, E>;
    flatMap: <B>(fn: (a: A) => Result<B, E>) => Result<B, E>;
};
