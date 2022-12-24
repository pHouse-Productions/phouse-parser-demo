import { alt, join, range, repeat, seq } from "phouse-parser";

export const hex = alt([range("0", "9"), range("a", "f"), range("A", "F")]);
export const uuid = join(
  seq([
    join(repeat(hex, undefined, 8, 8)),
    "-",
    join(repeat(hex, undefined, 4, 4)),
    "-",
    join(repeat(hex, undefined, 4, 4)),
    "-",
    join(repeat(hex, undefined, 4, 4)),
    "-",
    join(repeat(hex, undefined, 12, 12)),
  ])
);
