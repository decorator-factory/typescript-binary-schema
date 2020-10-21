import { expect } from 'chai';
import * as Lib from '../lib';
import 'mocha';

describe("Hello, world!", () => {

    it("2 + 2 = 4", () => {
        const result = 2 + 2;
        expect(result).to.equal(4);
    });

});