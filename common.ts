export function absurd<A>(): A {
    const f = (): any => null;
    return f();
}