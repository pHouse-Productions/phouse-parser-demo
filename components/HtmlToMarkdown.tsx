import {
  alt,
  anyChar,
  chars,
  join,
  not,
  notChars,
  ParserContext,
  ParserWithAction,
  plus,
  PStream,
  repeat,
  repeat0,
  seq1,
  seqN,
  StringPStream,
  substring,
  sym,
} from "phouse-parser";

const attributes = repeat(
  seqN(
    [0, 2],
    [
      join(seq1(1, [repeat0(" ", {}), plus(notChars("=>"))])),
      '="',
      join(repeat(notChars('"'))),
      '"',
    ]
  ),
  plus(" ")
);
const normalTag = (tag: string) =>
  seqN(
    [
      3, // attributes
      6, // content
    ],
    [
      "<",
      tag,
      plus(" "),
      attributes,
      repeat0(" ", {}),
      ">",
      sym("content"),
      "</",
      tag,
      ">",
    ]
  );
// const selfClosedTag = (tag: string) => seq1(2, ["<", tag, attributes, "/>"]);

const symbols = {
  entity: seq1(1, ["&", alt(["nbsp", "lt", "gt", "amp"]), ";"]),

  content: repeat(alt([sym("entity"), sym("tag"), sym("text")])),

  text: substring(plus(not(alt([sym("entity"), chars("<")]), anyChar()))),

  tag: alt([
    sym("br"),
    sym("bold"),
    sym("italic"),
    sym("div"),
    sym("code"),
    sym("pre"),
    sym("a"),
  ]),
  br: alt(["<br/>", "<br>"]),
  bold: seq1(1, ["<b>", sym("content"), "</b>"]),
  italic: seq1(1, ["<i>", sym("content"), "</i>"]),
  div: seq1(1, ["<div>", sym("content"), "</div>"]),
  code: seq1(1, [
    "<code>",
    repeat(alt([sym("text"), sym("entity"), sym("br")])),
    "</code>",
  ]),
  pre: seq1(1, [
    "<pre>",
    repeat(alt([sym("text"), sym("entity"), sym("br")])),
    "</pre>",
  ]),
  a: normalTag("a"),

  START: sym("content"),
};

type Actions = Partial<{
  [k in keyof typeof symbols]: (x: ParserContext, ps: PStream) => string;
}>;

const actions: Actions = {
  START: (x, ps) => {
    return toString(ps.value());
  },
  div: (x, ps) => {
    const str = toString(ps.value()).trim();
    return str + "\n";
  },
  entity: (x, ps) => {
    if (ps.value() === "nbsp") return " ";
    if (ps.value() === "gt") return ">";
    if (ps.value() === "lt") return "<";
    if (ps.value() === "amp") return "&";
    return "";
  },
  br: () => "\n",
  bold: (x, ps) => {
    const str = toString(ps.value()).trim();
    return str ? `**${str}**` : "";
  },
  text: (x, ps) => {
    return toString(ps.value());
  },
  italic: (x, ps) => {
    const str = toString(ps.value()).trim();
    return str ? `*${str}*` : "";
  },
  pre: (x, ps) => {
    const str = toString(ps.value());
    return str ? `\`\`\`${str}\`\`\`` : "";
  },
  code: (x, ps) => {
    const str = toString(ps.value()).trim();
    return str ? `\`${str}\`` : "";
  },
  a: (x, ps) => {
    const [attributes, content] = ps.value() as [[string, string][], unknown];

    const userId = attributes.find((a) => a[0] === "data-user-id")?.[1];
    if (userId) {
      return `@USER-${userId}`;
    }

    return "";
  },
};

const toString = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.join("");
  console.log(v);
  return "";
};

export const htmlToMarkdown = (str: string) => {
  const keys = Object.keys(symbols) as (keyof typeof symbols)[];
  const parsersWithAction = new Map(
    keys.map((name) => [
      name,
      actions[name]
        ? new ParserWithAction(symbols[name], actions[name]!)
        : symbols[name],
    ])
  );

  const ps = new StringPStream({ pos: 0, str, value: null });
  const start = parsersWithAction.get("START");
  const x = new ParserContext();
  x.set("grammarMap", parsersWithAction);
  const result = start?.parse(x, ps);
  return result?.value() as string;
};
