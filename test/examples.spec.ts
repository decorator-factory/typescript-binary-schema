import { expect } from 'chai';
import { Ok, Err, Result } from '../schema/result';
import { Some, None, Option } from '../schema/option';
import * as Lib from '../schema';
import 'mocha';


describe("ByteStream", () => {
    it("can be created from a Uint8Array", () => {
        const array = new Uint8Array([1, 2, 3]);
        const bs = Lib.arrayByteStream(array);
        expect(bs().toNullable()).to.equal(1);
        expect(bs().toNullable()).to.equal(2);
        expect(bs().toNullable()).to.equal(3);
        expect(bs().toNullable()).to.equal(null);
    });

    it("is just a function `() => Option<number>`", () => {

        let counter = 0;
        const bs = (): Option<number> => {
            counter++;
            if (counter < 4)
                return Some(counter);
            else
                return None();
        };
        <Lib.ByteStream>bs;

        expect(bs().toNullable()).to.equal(1);
        expect(bs().toNullable()).to.equal(2);
        expect(bs().toNullable()).to.equal(3);
        expect(bs().toNullable()).to.equal(null);
    });
});


describe("Message schema", () => {
    it("can read data from a ByteStream", () => {
        // a schema is represented by the Message<T> class
        const schema: Lib.Message<number> = Lib.U8; // unsigned 8-bit integer

        const stream = Lib.arrayByteStream(new Uint8Array([42, 57]));

        // Message<T>.read() returns Result<T, string> --
        // a type for either a T or an error message (as a string)
        const result1: Result<number, string> = Lib.U8.read(stream);
        const result2: Result<number, string> = Lib.U8.read(stream);
        const result3: Result<number, string> = Lib.U8.read(stream);

        expect(result1.isOk()).to.equal(true);
        expect(result2.isOk()).to.equal(true);
        expect(result3.isOk()).to.equal(false);
        expect(result3.isErr()).to.equal(true);

        expect(result1.unwrap()).to.equal(42);
        expect(result2.unwrap()).to.equal(57);
        expect(result3.unwrapErr()).to.include("Message ended prematurely");
    });

    it("can write data into a stream", () => {
        const store: Array<number> = [];
        const push = (byte: number) => store.push(byte);

        Lib.U16.write(42)(push);
        Lib.U16.write(257)(push);

        expect(store).to.deep.equal([42, 0, 1, 1]);
    });
});


describe("Length-encoded strings", () => {
    it("can be used to read and write a string of given length", () => {
        // the `2` is for how many bytes the string length itself occupies
        // (in this case a string can be from 0 to 65535 bytes long)
        const schema = Lib.PascalString(2);

        const buffer: Array<number> = [];
        const push = (byte: number) => buffer.push(byte);

        schema.write("hello")(push);
        expect(buffer).to.deep.equal([5, 0, 104, 101, 108, 108, 111]);
        // (5, 0) is the length (0x0005 in little endian)
        // the rest is the bytes in a string.


        const stream = Lib.arrayByteStream(new Uint8Array([5, 0, 104, 101, 108, 108, 111]));
        expect(schema.read(stream).unwrap()).to.equal("hello");
    });
});


describe("Record messages", () => {
    // Record messages is probably the feature that you will use the most
    it("can be used to read and write heterogenous data structures", () => {
        const Player = Lib.RecordMessage("Player", {
            x: Lib.U16,
            y: Lib.U16,
            name: Lib.PascalString(1)
        });
        <Lib.Message<{x: number, y: number, name: string}>> Player;

        const buffer: Array<number> = [];
        const push = (byte: number) => buffer.push(byte);

        Player.write({x: 42, y: 150, name: "admin"})(push);
        expect(buffer).to.deep.equal([42, 0, 150, 0, 5, 97, 100, 109, 105, 110]);
        // x: 42 0
        // y: 150 0
        // name: (length=5) 97 100 109 105 110

        const stream = Lib.arrayByteStream(new Uint8Array([42, 0, 150, 0, 5, 97, 100, 109, 105, 110]));
        expect(Player.read(stream).unwrap())
        .to.deep.equal({x: 42, y: 150, name: "admin"});

    })
});


describe("Predicate checks", () => {
    it("can be used to ensure that some invariant is maintaned", () => {
        const LessThan100 = Lib.U8.ensure(n => n < 100);

        expect(LessThan100.read(() => Some(35)).unwrap()).to.equal(35);
        expect(LessThan100.read(() => Some(103)).unwrapErr()).to.equal("Invariant broken by 103");
    });

    it("can have a custom error message", () => {
        const LessThan100 =
            Lib.U8.ensure(
                n => n < 100,
                n => `${n} is too large!!1`
            );
        expect(LessThan100.read(() => Some(103)).unwrapErr()).to.equal("103 is too large!!1");
    });

    it("works on any message type", () => {
        // It's not possible that more seats are reserved than available
        const CafeState = Lib.RecordMessage("CafeState", {
            totalSeats: Lib.U8,
            reservedSeats: Lib.U8,
        }).ensure(({totalSeats, reservedSeats}) => totalSeats >= reservedSeats);

        const stream = Lib.arrayByteStream(new Uint8Array([100, 200]));
        expect(CafeState.read(stream).isErr()).to.equal(true);
    });

    it("works with nested messages", () => {
        const LessThan100 = Lib.U8.ensure(n => n < 100);

        const CafeState = Lib.RecordMessage("CafeState", {
            totalSeats: LessThan100,
            reservedSeats: LessThan100,
        }).ensure(({totalSeats, reservedSeats}) => totalSeats >= reservedSeats);

        const stream1 = Lib.arrayByteStream(new Uint8Array([5, 10]));
        expect(CafeState.read(stream1).isErr()).to.equal(true);

        const stream2 = Lib.arrayByteStream(new Uint8Array([4, 3]));
        expect(CafeState.read(stream2).isErr()).to.equal(false);

        const stream3 = Lib.arrayByteStream(new Uint8Array([400, 300]));
        expect(CafeState.read(stream3).isErr()).to.equal(true);
    })
});