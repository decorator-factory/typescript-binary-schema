import { absurd } from './common';
import { Option, Some, None } from './option';
import { Result, Ok, Err } from './result';


export type ByteStream = () => Option<number>;


export class Message<T> {
    read: (r: ByteStream) => Result<T, string>;
    write: (t: T) => (w: (byte: number) => void) => void;

    constructor(
        read: (r: ByteStream) => Result<T, string>,
        write: (t: T) => (w: (byte: number) => void) => void,
    ){
        this.read = read;
        this.write = write;
    }

    public map<U>(fn: (t: T) => U, inv: (u: U) => T): Message<U> {
        return new Message(
            r => this.read(r).map(fn),
            u => this.write(inv(u))
        );
    }

    public then<U>(
        fn: (t: T) => Message<U>,
        inv: (u: U) => T
    ): Message<U> {
        return new Message(
            r => {
                const rt = this.read(r);
                if (rt.isErr())
                    return Err(rt.unwrapErr());
                else
                    return fn(rt.unwrap()).read(r);
            },
            u => w => {
                const t = inv(u);
                this.write(t)(w);
                fn(t).write(u)(w);
            },
        );
    }

    public ensure(
        predicate: (t: T) => boolean,
        errorMessage: (t: T) => string = (t: T) => `Invariant broken by ${t}`
    ): Message<T>{
        return new Message(
            r => {
                const rt = this.read(r);
                if (rt.isErr())
                    return rt;
                const t = rt.unwrap();
                if (!predicate(t))
                    return Err(errorMessage(t));
                return Ok(t);
            },
            t => {
                if (!predicate(t))
                    throw new Error(errorMessage(t));
                return this.write(t);
            }
        );
    }
}


export const ByteArray = (length: number) =>
    new Message<Uint8Array> (
        r => {
            const result = new Uint8Array(length);
            for (let i = 0; i < length; i++){
                const byte = r().toNullable();
                if (byte === null)
                    return Err(`Message ended prematurely: ByteArray(${length})`);
                result[i] = byte;
            }
            return Ok(result);
        },
        u => w => u.forEach(w),
    );


// Integers are assumed to be little-endian
export const UnsignedInt = (bytes: number) =>
    new Message<number> (
        r => {
            let result = 0;
            let k = 1;
            for (let i = 0; i < bytes; i++){
                const byte = r().toNullable();
                if (byte === null)
                    return Err(`Message ended prematurely: UnsignedInt(${bytes})`);
                result += byte * k;
                k *= 2;
            }
            return Ok(result);
        },
        u => w => {
            for (let i = 0; i < bytes; i++) {
                w(u % 256);
                u = u >> 8;
            }
        }
    );

export const UnsignedBigInt = (bytes: number) =>
    new Message<bigint> (
        r => {
            let result = 0n;
            let k = 1n;
            for (let i = 0; i < bytes; i++){
                const byte = r().toNullable();
                if (byte === null)
                    return Err(`Message ended prematurely: UnsignedBigInt(${bytes})`);
                result += BigInt(byte) * k;
                k *= 2n;
            }
            return Ok(result);
        },
        u => w => {
            for (let i = 0; i < bytes; i++) {
                w(Number(u % 256n));
                u = u >> 8n;
            }
        }
    );

export const U8 = UnsignedInt(1);
export const U16 = UnsignedInt(2);
export const U24 = UnsignedInt(3);
export const U32 = UnsignedInt(4);
export const U64 = UnsignedBigInt(8);

export const Value = <T>(fn: () => T) => new Message<T>( r => Ok(fn()), u => w => {} );
export const Pure = <T>(t: T) => new Message<T>( r => Ok(t), u => w => {} );


/**
 * Reads a string in the format [length; ...bytes]
 * where `n` is the number of bytes in `length`.
 *
 * @n number of bytes in `length`
 */
export const PascalString = (n: number): Message<string> =>
    UnsignedInt(n)
    .then(
        length =>
            ByteArray(length)
            .then(
                byteArray =>
                    Pure(new TextDecoder().decode(byteArray)),
                s => new TextEncoder().encode(s),
            ),
        s => new TextEncoder().encode(s).length,
    );


/**
 * Reads
 *
 * @param name
 * @param record
 */
export const RecordMessage = <T, K extends keyof T>(
    name: string,
    record: { [P in K]: Message<T[P]> }
) => new Message<{ [P in K]: T[P] }> (
    r => {
        let result = <{ [P in K]: T[P] }>{};
        for (const [key, message] of Object.entries(record)) {
            const v = (<Message<T[K]>>message).read(r);
            if (v.isErr())
                return Err(`(${v.unwrapErr()}) at ${name}.${key}`);
            result[<K>key] = v.unwrap();
        }
        return Ok(result);
    },
    u => w => {
        for (const key of Object.keys(u)){
            const value = u[<K>key];
            const messageForKey = record[<K>key];
            messageForKey.write(value)(w);
        }
    }
);



export const arrayByteStream = (array: Uint8Array): ByteStream => {
    let position = 0;
    return () => {
        if (position >= array.length) {
            return None();
        } else {
            position++;
            return Some(array[position - 1]);
        }
    };
};