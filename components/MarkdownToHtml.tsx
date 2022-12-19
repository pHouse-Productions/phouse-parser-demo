import {
  alt,
  anyChar,
  eof,
  not,
  ParserContext,
  ParserWithAction,
  plus,
  PStream,
  repeat,
  seq1,
  StringPStream,
  sym,
  until,
} from "phouse-parser";
import React, { FC, ReactNode, useMemo } from "react";

const symbols = {
  eol: alt(["\n", eof()]),

  plain: not(sym("eol"), anyChar()),

  text: alt([
    sym("bold"),
    sym("italics"),
    // sym("strike_through"),
    sym("code"),
    // sym("image"),
    // sym("link"),
    sym("plain"),
  ]),

  bold: seq1(1, ["**", plus(not("**", sym("text"))), "**"]),
  italics: seq1(1, ["*", plus(not("*", sym("text"))), "*"]),
  // strike_through: seq1(1, ["~~", plus(not("~~", sym("text"))), "~~"]),
  code: seq1(1, ["`", plus(not("`", sym("plain"))), "`"]),
  // image: seq(["![", until("]("), until(")")]),
  // link: seq([
  //   seq1(1, ["[", plus(not("]", sym("text"))), "]"]),
  //   seq1(1, ["(", until(")")]),
  // ]),

  text_line: seq1(0, [repeat(sym("text")), sym("eol")]),

  // tiny_header: seq1(1, ["#### ", sym("text_line")]),
  // small_header: seq1(1, ["### ", sym("text_line")]),
  // medium_header: seq1(1, ["## ", sym("text_line")]),
  // big_header: seq1(1, ["# ", sym("text_line")]),

  line: alt([
    // sym("tiny_header"),
    // sym("small_header"),
    // sym("medium_header"),
    // sym("big_header"),
    sym("text_line"),
  ]),

  block: alt([
    // sym("generic_list"),
    // sym("numbered_list"),
    // sym("quote"),
    // sym("table"),
    sym("code_block"),
    sym("line"),
  ]),

  // generic_list: plus(
  //   seq1(1, ["* ", repeat(not(alt([sym("eol"), "* "]), sym("line")))])
  // ),

  // numbered_list_symbol: seq([plus(range("0", "9")), ". "]),
  // numbered_list: plus(
  //   seq1(1, [
  //     sym("numbered_list_symbol"),
  //     repeat(not(alt([sym("eol"), sym("numbered_list_symbol")]), sym("line"))),
  //   ])
  // ),

  // quote: seq1(1, [">", repeat(not(alt([sym("eol"), ">"]), sym("line")))]),

  // table_row: seq1(1, [
  //   "|",
  //   plus(seq1(0, [repeat(not("|", sym("text"))), "|"])),
  //   repeat(" "),
  //   sym("eol"),
  // ]),
  // table: seq([
  //   sym("table_row"),
  //   seq([
  //     "|",
  //     plus(seq([plus(alt(["-", " "])), "|"])),
  //     repeat(" "),
  //     sym("eol"),
  //   ]),
  //   repeat(sym("table_row")),
  // ]),

  code_block: seq1(1, ["```", until("```")]),

  START: repeat(alt([sym("block"), sym("line")])),
};

type Actions = Partial<{
  [k in keyof typeof symbols]: (x: ParserContext, ps: PStream) => ReactNode;
}>;

const actions: Actions = {
  START: (x, ps) => {
    return <>{toReactNode(ps.value())}</>;
  },
  text_line: (x, ps) => {
    const node = toReactNode(ps.value());
    return !node ? <br /> : <div>{node}</div>;
  },
  bold: (x, ps) => {
    return <b>{toReactNode(ps.value())}</b>;
  },
  text: (x, ps) => {
    return toReactNode(ps.value());
  },
  italics: (x, ps) => {
    return <i>{toReactNode(ps.value())}</i>;
  },
  code_block: (x, ps) => {
    return <pre>{toReactNode(ps.value())}</pre>;
  },
  code: (x, ps) => {
    return <code>{toReactNode(ps.value())}</code>;
  },
};

const toReactNode = (v: unknown): ReactNode => {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const children: ReactNode[] = [];
    for (const c of v) {
      if (
        typeof c === "string" &&
        typeof children[children.length - 1] === "string"
      ) {
        children[children.length - 1] += c;
      } else {
        children.push(c);
      }
    }
    return children.length ? (
      <>
        {children.map((c, i) => (
          <React.Fragment key={i}>{c}</React.Fragment>
        ))}
      </>
    ) : null;
  }
  if (React.isValidElement(v)) return v;
  return null;
};

const parseMarkdown = (str: string) => {
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
  return result?.value() as ReactNode;
};

export const FromMarkdown: FC<{ mde: string }> = ({ mde }) => {
  const node = useMemo(() => {
    return parseMarkdown(mde);
  }, [mde]);
  return <>{node}</>;
};
