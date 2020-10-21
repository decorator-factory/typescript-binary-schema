

export interface Option<A>{
    toNullable: () => A | null;
    isSome: () => boolean;
    isNone: () => boolean;
    map: <B>(fn: (a: A) => B) => Option<B>;
    flatMap: <B>(fn: (a: A) => Option<B>) => Option<B>
}


export function Some<A>(a: A): Option<A> {
    return {
        toNullable: () => a,
        isSome: () => true,
        isNone: () => false,
        map: <B>(fn: (a: A) => B) => Some<B>(fn(a)),
        flatMap: <B>(fn: (a: A) => Option<B>) => fn(a)
    };
}

export function None<A>(): Option<A> {
    return {
        toNullable: () => null,
        isSome: () => false,
        isNone: () => true,
        map: <B>(fn: (a: A) => B) => None<B>(),
        flatMap: <B>(fn: (a: A) => Option<B>) => None<B>()
    };
}