import { Option, None, Some } from './option';
import { U16, RecordMessage, ByteStream, PascalString } from './lib';

////////// TESTING

const Point = RecordMessage('Point', {
    x: U16,
    y: U16,
});


const Rectangle = RecordMessage('Rectangle', {
    a: Point,
    b: Point,
});

/**
 *
 * @param array
 */
const arrayByteStream = (array: Uint8Array): ByteStream => {
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

////////

const bytes = new Uint8Array([10, 20,  30, 40,  35, 0,  0, 5]);
const stream = arrayByteStream(bytes);

const result = Rectangle.read(stream);  // Result<{...}, stream>;
console.log(result.unwrap())

Rectangle.write(
    {a: {x: 10, y: 20}, b: {x: 270, y: 40}}
)( byte => console.log(byte) );