import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BaseElement, createEditor, Descendant } from "slate";
import {
  DefaultElement,
  Editable,
  RenderElementProps,
  Slate,
  withReact,
} from "slate-react";
import { htmlToMarkdown } from "../components/HtmlToMarkdown";
import {
  FromMarkdown,
  MarkdownTypes,
  parseMarkdownToEditor,
} from "../components/MarkdownToHtml";
import styles from "./index.module.css";

const getDeepestUnstyledOnlyChild = (el: Element) => {
  while (el.tagName === "DIV" && el.children.length === 1) {
    el = el.children[0];
  }
  return el;
};

const getNodeAtCursorPositionInContainer = (parent: Element) => {
  const focusedNode = window.getSelection()?.focusNode;
  if (!focusedNode) return null;
  let n = focusedNode;
  while (n) {
    if (n === parent) return focusedNode;
    n = n.parentNode as Node;
  }
  return null;
};

// Assumes cursor is in the element given.
const insertAtCursor = (from: Element, to: Node) => {
  const start = window.getSelection()?.getRangeAt(0).startOffset || 0;
  const end = window.getSelection()?.getRangeAt(0).endOffset || start;

  const pre = document.createTextNode(
    to.textContent?.substring(0, start) || ""
  );
  const post = document.createTextNode(to.textContent?.substring(end) || "");

  to.parentNode?.insertBefore(post, to);
  to.parentNode?.insertBefore(from, post);
  to.parentNode?.insertBefore(pre, from);
  to.parentNode?.removeChild(to);
};

const isEmptyLine = (e: Element) => {
  return (
    e.tagName === "DIV" &&
    e.children.length === 1 &&
    e.children[0].tagName === "BR"
  );
};

const appendContent = (from: Element, to: Element) => {
  const lastChild = to.children[to.children.length - 1] || to;
  if (isEmptyLine(lastChild)) {
    lastChild.replaceChildren(from);
    return;
  }

  if (lastChild.tagName === "DIV") {
    lastChild.append(from);
    return;
  }

  to.append(from);
};

const isCursorAtEnd = (el: Node) => {
  let sel = window.getSelection();
  if (!sel?.rangeCount) return false;
  let selRange = sel.getRangeAt(0);
  let testRange = selRange.cloneRange();
  testRange.selectNodeContents(el);
  testRange.setStart(selRange.endContainer, selRange.endOffset);
  return testRange.toString() == "";
};

const focusCursorAtEnd = (el: Node) => {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
};

export default function Home() {
  type InputStyle = {
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    codeBlock?: boolean;
  };
  const [inputStyle, setInputStyle] = useState<InputStyle>({});
  const updateIcons = useCallback((ceDiv: HTMLDivElement) => {
    let el: Node | null =
      window.getSelection()?.getRangeAt(0).endContainer || null;
    const inputStyle: InputStyle = {};
    while (el && el !== ceDiv) {
      if (el.nodeName === "I") inputStyle.italic = true;
      if (el.nodeName === "B") inputStyle.bold = true;
      if (el.nodeName === "PRE") inputStyle.codeBlock = true;
      if (el.nodeName === "CODE") inputStyle.code = true;
      el = el.parentNode;
    }
    setInputStyle(inputStyle);
  }, []);

  const ceRef = useRef<HTMLDivElement>(null);
  const [ceInProgress, setCeInProgress] = useState("Hello *world*");
  const markdown = useMemo(() => htmlToMarkdown(ceInProgress), [ceInProgress]);
  const [markdownToAppend, setMarkdownToAppend] = useState("");

  useEffect(() => {
    if (!ceRef.current) return;
    if (ceRef.current.innerHTML === ceInProgress) return;
    ceRef.current.innerHTML = ceInProgress;
  }, [ceInProgress]);

  const editor = useMemo(() => withReact(createEditor()), []);
  const initialValue = useMemo(() => {
    return parseMarkdownToEditor(
      `
**yo** there

this \`*isCode*\`

*nice* man
    `.trim()
    ) as unknown as Descendant[];
  }, []);

  const renderElement = useCallback<(props: RenderElementProps) => JSX.Element>(
    (props) => {
      console.log(props.element);
      return <DefaultElement {...props} />;
      // switch (e.type) {
      //   case "text_line":
      //     return e.children.length ? (
      //       <div {...props.attributes}>{props.children}</div>
      //     ) : (
      //       <br {...props.attributes} />
      //     );
      //   case "bold":
      //     return <b {...props.attributes}>{props.children}</b>;
      //   default:
      //     return <DefaultElement {...props} />;
      // }
    },
    []
  );

  return (
    <>
      {markdownToAppend ? (
        <div
          style={{ display: "none" }}
          ref={(e) => {
            if (!e) return;
            const ce = ceRef.current;
            if (!ce) return;

            // If it's just a single line, use the contents of the one line so
            // a line break isn't inserted
            const el = getDeepestUnstyledOnlyChild(e);
            const focusedChild = getNodeAtCursorPositionInContainer(ce);
            if (!focusedChild || isCursorAtEnd(ce)) {
              appendContent(el, ce);
              focusCursorAtEnd(ce);
            } else {
              insertAtCursor(el, focusedChild);
              window.getSelection()?.setPosition(el.nextSibling, 0);
            }

            setCeInProgress(ce.innerHTML);
            setMarkdownToAppend("");
          }}
        >
          <FromMarkdown mde={markdownToAppend} />
        </div>
      ) : null}
      <h1>Rich Text Editor</h1>
      <div className={styles.compare_pane}>
        <h3>Editor</h3>
        <div
          className={styles.editor}
          ref={ceRef}
          contentEditable
          suppressContentEditableWarning
          onPaste={(e) => {
            e.preventDefault();
            var text = e.clipboardData.getData("text/plain");
            document.execCommand("insertHTML", false, text);
          }}
          onSelect={(e) => {
            updateIcons(e.currentTarget);
          }}
          // onKeyDown={maybeEscapeFromContentType}
          onKeyUp={(e) => {
            updateIcons(e.currentTarget);
            setCeInProgress(e.currentTarget.innerHTML);
          }}
        ></div>
      </div>
      <pre>{JSON.stringify(inputStyle, null, 2)}</pre>
      <button
        onClick={() => {
          setMarkdownToAppend("@USER-daa968aa-e7ad-4d99-98a6-c5d8a468b0e5");
        }}
      >
        Add @
      </button>

      <div className={styles.compare_container}>
        <div className={styles.compare_pane}>
          <h2>Markdown</h2>
          <pre style={{ whiteSpace: "break-spaces" }}>{markdown}</pre>
        </div>
        <div className={styles.compare_pane}>
          <h2>HTML</h2>
          <FromMarkdown mde={markdown} />
        </div>
      </div>

      <Slate editor={editor} value={initialValue}>
        <Editable
          renderElement={renderElement}
          renderLeaf={({ attributes, children, leaf: leaf_ }) => {
            const leaf = leaf_ as any;
            return leaf.type === "code" ? (
              <code contentEditable={false} {...attributes}>
                {children}
              </code>
            ) : (
              <span
                {...attributes}
                style={{
                  fontWeight: leaf.isBold ? "bold" : "normal",
                  fontStyle: leaf.isItalic ? "italic" : "normal",
                }}
              >
                {children}
              </span>
            );
          }}
          placeholder="Enter some plain text..."
          onKeyDown={(event) => {
            console.log(editor.getFragment());
            if (event.key === "*") {
              event.preventDefault();
              // editor.insertFragment([
              //   { children: [{ text: "**" }], type: "code" },
              // ]);
              // Transform.move(editor, { distance: 1, reverse: true });
              return;
            }
          }}
        />
      </Slate>
    </>
  );
}

type MdElement = BaseElement & { type?: MarkdownTypes };

const CodeElement = (props: RenderElementProps) => {
  props.element;
  return (
    <pre {...props.attributes}>
      <code>{props.children}</code>
    </pre>
  );
};

const MdeElement = (props: RenderElementProps) => {
  console.log("here");
  return (
    <div {...props.attributes}>
      <FromMarkdown mde={(props as any).text} />
    </div>
  );
};

// markdown -> editor
// editor -> markdown
// markdown -> html
