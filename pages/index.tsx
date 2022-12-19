import { KeyboardEvent, useCallback, useEffect, useState } from "react";
import { htmlToMarkdown } from "../components/HtmlToMarkdown";
import { FromMarkdown } from "../components/MarkdownToHtml";
import styles from "./index.module.css";

export default function Home() {
  const [markdownInput, setMarkdownInput] = useState("Hello *world*");

  const [ceHtml, setCeHtml] = useState("");
  useEffect(() => {
    markdownInput;
    setCeHtml("");
  }, [markdownInput]);

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
      console.log(el.nodeName);
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

      // This moves cursor to end of content.
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      if (!selection) return;
      selection.removeAllRanges();
      selection.addRange(range);

      updateIcons(el);
    },
    [updateIcons]
  );

  return (
    <>
      <h2>MDE Example</h2>
      <div className={styles.compare_container}>
        <textarea
          className={styles.compare_pane}
          onChange={(e) => {
            setMarkdownInput(e.target.value);
          }}
          value={markdownInput}
        />
        <div
          className={[styles.mde_container, styles.compare_pane].join(" ")}
          contentEditable
          suppressContentEditableWarning
          onBlur={(e) =>
            setMarkdownInput(htmlToMarkdown(e.currentTarget.innerHTML))
          }
          onFocus={(e) => {
            setCeHtml(e.currentTarget.innerHTML);
          }}
          onSelect={(e) => {
            updateIcons(e.currentTarget);
          }}
          dangerouslySetInnerHTML={ceHtml ? { __html: ceHtml } : undefined}
          onKeyDown={maybeEscapeFromContentType}
          onKeyUp={(e) => {
            updateIcons(e.currentTarget);
          }}
        >
          {ceHtml ? null : <FromMarkdown mde={markdownInput} />}
        </div>
      </div>

      <div className={styles.compare_container}>
        <div className={styles.compare_pane}>{ceHtml}</div>
        <pre>{JSON.stringify(inputStyle, null, 2)}</pre>
      </div>
    </>
  );
}
