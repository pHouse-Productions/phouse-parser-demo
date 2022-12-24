import isEqual from "fast-deep-equal";
import {
  alt,
  anyChar,
  eof,
  join,
  not,
  ParserContext,
  ParserWithAction,
  PStream,
  range,
  repeat,
  seq,
  seq1,
  StringPStream,
  sym,
} from "phouse-parser";
import { FC, useMemo } from "react";
import { BaseElement, createEditor, Descendant } from "slate";
import { withHistory } from "slate-history";
import {
  DefaultElement,
  Editable,
  ReactEditor,
  RenderElementProps,
  withReact,
} from "slate-react";
import { EditableProps } from "slate-react/dist/components/editable";

const editorMdSymbols = {
  eol: alt(["\n", eof()]),
  plain: not(sym("eol"), anyChar()),
  text: alt([sym("mention"), sym("plain")]),

  hex: alt([range("0", "9"), range("a", "f"), range("A", "F")]),
  uuid: join(
    seq([
      join(repeat(sym("hex"), undefined, 8, 8)),
      "-",
      join(repeat(sym("hex"), undefined, 4, 4)),
      "-",
      join(repeat(sym("hex"), undefined, 4, 4)),
      "-",
      join(repeat(sym("hex"), undefined, 4, 4)),
      "-",
      join(repeat(sym("hex"), undefined, 12, 12)),
    ])
  ),

  mention: alt([sym("userMention")]),
  userMention: seq1(1, ["@USER-", sym("uuid")]),

  text_line: seq1(0, [repeat(sym("text")), sym("eol")]),
  START: repeat(alt([sym("text_line")])),
};

type Symbol = keyof typeof editorMdSymbols;
type MarkdownToEditorActions = Partial<{
  [k in Symbol]: (x: ParserContext, ps: PStream) => unknown;
}>;
const markdownToEditorActions: MarkdownToEditorActions = {
  START: (x, ps) => {
    let v = ps.value();
    if (!Array.isArray(v)) throw "Why is START not an array?";
    return v.flat();
  },
  text_line: (x, ps) => {
    const v = ps.value();
    if (!Array.isArray(v)) throw "Why is text_line not an array?";
    return [{ type: "paragraph", children: collapseChildren(v.flat()) }];
  },
  userMention: (x, ps) => {
    return [
      { text: "" },
      {
        type: "userMention",
        userId: ps.value(),
        name: "Joe",
        children: [{ text: "" }],
      },
      { text: "" },
    ];
  },
  plain: (x, ps) => {
    return { type: "text", text: ps.value() };
  },
};

const collapseChildren = (a: any[]) => {
  // At least one element is required for slate to be happy.
  if (!a.length) return [{ text: "" }];
  return a.reduce<any[]>((r, o) => {
    if (!r.length) return [o];
    const { text: lastText, ...lastRest } = r[r.length - 1];
    const { text, ...rest } = o;
    if (
      text !== undefined &&
      lastText !== undefined &&
      isEqual(lastRest, rest)
    ) {
      r[r.length - 1].text += text;
      return r;
    }
    return r.concat(o);
  }, []);
};

export const markdownToEditorData = (str: string): Descendant[] => {
  const keys = Object.keys(editorMdSymbols) as (keyof typeof editorMdSymbols)[];
  const parsersWithAction = new Map(
    keys.map((name) => [
      name,
      markdownToEditorActions[name]
        ? new ParserWithAction(
            editorMdSymbols[name],
            markdownToEditorActions[name]!
          )
        : editorMdSymbols[name],
    ])
  );

  const ps = new StringPStream({ pos: 0, str, value: null });
  const start = parsersWithAction.get("START");
  const x = new ParserContext();
  x.set("grammarMap", parsersWithAction);
  const result = start?.parse(x, ps);
  return result?.value() as Descendant[];
};

type MentionElement = BaseElement & {
  type: "userMention";
  userId: string;
  name: string;
};

const Mention = ({ attributes, children, element }: RenderElementProps) => {
  const mentionElement = element as MentionElement;
  return (
    <span
      {...attributes}
      contentEditable={false}
      data-user-id={mentionElement.userId}
    >
      {children}@{mentionElement.name}
    </span>
  );
};

const withMentions = (editor: ReactEditor) => {
  const { isInline, isVoid, markableVoid } = editor;

  editor.isInline = (element: any) => {
    return element.type === "userMention" ? true : isInline(element);
  };

  editor.isVoid = (element: any) => {
    return element.type === "userMention" ? true : isVoid(element);
  };

  editor.markableVoid = (element: any) => {
    return element.type === "userMention" || markableVoid(element);
  };

  return editor;
};

export const useMarkdownEditable = () => {
  return useMemo(
    () => withMentions(withReact(withHistory(createEditor()))),
    []
  );
};

// eslint-disable-next-line react/display-name
export const MarkdownEditable: FC<Omit<EditableProps, "renderElement">> = ({
  ...props
}) => {
  return (
    <Editable
      renderElement={(props) => {
        const e = props.element as any;
        switch (e.type) {
          case "userMention":
            return <Mention {...props} />;
          default:
            return <DefaultElement {...props} />;
        }
      }}
      {...props}
    />
  );
};

export const editorDataToMarkdown = (a: any[]) => {
  let str = "";
  for (const p of a) {
    if (str.length) str += "\n";
    for (const c of p.children) {
      if (c.type === "userMention") {
        str += `@USER-${c.userId}`;
      } else {
        str += c.text;
      }
    }
  }
  return str;
};
