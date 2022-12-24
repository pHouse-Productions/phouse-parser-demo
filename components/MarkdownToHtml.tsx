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
} from "phouse-parser";
import React, { FC, ReactNode, useMemo } from "react";
import { uuid } from "../utils/parsers";

const symbols = {
  eol: alt(["\n", eof()]),

  plain: not(sym("eol"), anyChar()),

  text: alt([
    sym("bold"),
    sym("italics"),
    sym("code"),
    sym("mention"),
    sym("plain"),
  ]),

  bold: seq1(1, ["**", plus(not("**", sym("text"))), "**"]),
  italics: seq1(1, ["*", plus(not("*", sym("text"))), "*"]),
  code: seq1(1, [
    "`",
    plus(not(alt(["`", sym("mention")]), sym("plain"))),
    "`",
  ]),

  mention: alt([sym("userMention")]),
  userMention: seq1(1, ["@USER-", uuid]),

  text_line: seq1(0, [repeat(sym("text")), sym("eol")]),

  line: alt([sym("text_line")]),

  block: alt([sym("code_block"), sym("line")]),

  code_block: seq1(1, [
    "```",
    plus(not(alt(["```", sym("mention")]), anyChar())),
    "```",
  ]),

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
  userMention: (x, ps) => {
    const userId = ps.value() as string;
    return (
      <a
        href="https://google.com"
        contentEditable={false}
        data-user-id={userId}
      >
        @Joe
      </a>
    );
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

export type MarkdownTypes = keyof Actions;

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

export const MarkdownToHtml: FC<{ value: string }> = ({ value }) => {
  const node = useMemo(() => {
    return parseMarkdown(value);
  }, [value]);
  return <>{node}</>;
};
