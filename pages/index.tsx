import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { htmlToMarkdown } from "../components/HtmlToMarkdown";
import { FromMarkdown } from "../components/MarkdownToHtml";
import styles from "./index.module.css";

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

  const maybeEscapeFromContentType = useCallback(
    async (e: KeyboardEvent<HTMLDivElement>) => {
      // Need to handle a user being at the end of the input and getting
      // stuck in a formatted block.
      if (!["ArrowRight"].includes(e.key)) return;
      const el = e.currentTarget;

      const before = window.getSelection()?.getRangeAt(0);
      await new Promise((r) => setTimeout(r, 10));
      const after = window.getSelection()?.getRangeAt(0);
      if (before !== after) return;

      let html = el.innerHTML;
      if (html.endsWith("<br>")) {
        html = html.substring(0, html.length - "<br>".length);
        el.innerHTML = html + "&nbsp;";
      }
      if (html.endsWith("&nbsp;</div>")) {
        return;
      }
      if (html.endsWith("</div>")) {
        html = html.substring(0, html.length - "</div>".length);
        el.innerHTML = html + "&nbsp;</div>";
      }

      focusCursorAtEnd(el);
      updateIcons(el);
    },
    [updateIcons]
  );

  const ceRef = useRef<HTMLDivElement>(null);
  const [ceInProgress, setCeInProgress] = useState("Hello *world*");
  const markdown = useMemo(() => htmlToMarkdown(ceInProgress), [ceInProgress]);
  const [markdownToAppend, setMarkdownToAppend] = useState("");

  useEffect(() => {
    if (!ceRef.current) return;
    if (ceRef.current.innerHTML === ceInProgress) return;
    ceRef.current.innerHTML = ceInProgress;
  }, [ceInProgress]);

  return (
    <>
      {markdownToAppend ? (
        <div
          style={{ display: "none" }}
          ref={(e) => {
            if (!e) return;

            // If it's just a single line, use the contents of the one line so
            // a line break isn't inserted
            let el: Element = e;
            while (el.tagName === "DIV" && el.children.length === 1) {
              el = el.children[0];
            }

            setMarkdownToAppend("");

            // If focus is in the contenteditable then paste where the last
            // selection was. Otherwise append to the contenteditable.
            const parent = ceRef.current;
            if (!parent) return;
            let appendNode = window.getSelection()?.focusNode;
            while (appendNode) {
              if (appendNode === parent) {
                appendNode = window.getSelection()?.focusNode;
                break;
              }
              appendNode = appendNode.parentNode;
            }

            if (!isCursorAtEnd(parent) && appendNode && appendNode !== parent) {
              const start =
                window.getSelection()?.getRangeAt(0).startOffset || 0;
              const end =
                window.getSelection()?.getRangeAt(0).endOffset || start;

              const pre = document.createTextNode(
                appendNode.textContent?.substring(0, start) || ""
              );
              const post = document.createTextNode(
                " " + (appendNode.textContent?.substring(end) || "")
              );

              appendNode.parentNode?.insertBefore(post, appendNode);
              appendNode.parentNode?.insertBefore(el, post);
              appendNode.parentNode?.insertBefore(pre, el);
              appendNode.parentNode?.removeChild(appendNode);

              setCeInProgress(parent.innerHTML);
              window.getSelection()?.setPosition(post, 1);
              return;
            }

            const html = (() => {
              const emptyLine = "<div><br></div>";
              if (ceInProgress.endsWith(emptyLine)) {
                return (
                  ceInProgress.substring(
                    0,
                    ceInProgress.length - emptyLine.length
                  ) + `<div>${el.outerHTML}&nbsp;</div>`
                );
              }

              const close = "</div>";
              if (ceInProgress.endsWith(close)) {
                return (
                  ceInProgress.substring(
                    0,
                    ceInProgress.length - close.length
                  ) + `${el.outerHTML}&nbsp;</div>`
                );
              }

              return ceInProgress + el.outerHTML + "&nbsp;";
            })();

            parent.innerHTML = html;
            setCeInProgress(html);
            focusCursorAtEnd(parent);
          }}
        >
          {<FromMarkdown mde={markdownToAppend} />}
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
    </>
  );
}
