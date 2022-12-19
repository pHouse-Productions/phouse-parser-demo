import {
  alt,
  anyChar,
  chars,
  not,
  ParserContext,
  ParserWithAction,
  plus,
  PStream,
  repeat,
  seq1,
  StringPStream,
  substring,
  sym,
} from "phouse-parser";

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
