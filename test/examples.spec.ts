import { expect } from 'chai';
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