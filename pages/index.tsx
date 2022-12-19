import { useEffect, useState } from "react";
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

  // const markdownFromHtml = useMemo(() => {
  //   return htmlToMarkdown(ceHtml);
  // }, [ceHtml]);

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
          onFocus={(e) => setCeHtml(e.currentTarget.innerHTML)}
          dangerouslySetInnerHTML={ceHtml ? { __html: ceHtml } : undefined}
        >
          {ceHtml ? null : <FromMarkdown mde={markdownInput} />}
        </div>
      </div>

      <div className={styles.compare_container}>
        <div className={styles.compare_pane}>{ceHtml}</div>
      </div>
    </>
  );
}
