import { useMemo, useState } from "react";
import { ReactEditor, Slate } from "slate-react";
import {
  editorDataToMarkdown,
  MarkdownEditable,
  markdownToEditorData,
  useMarkdownEditable,
} from "../components/MarkdownEditor";
import { MarkdownToHtml } from "../components/MarkdownToHtml";
import styles from "./index.module.css";

export default function Home() {
  const [editorData, setEditorData] = useState(() =>
    markdownToEditorData(
      `
Hello *world* @USER-daa968aa-e7ad-4d99-98a6-c5d8a468b0e5

@USER-daa968aa-e7ad-4d99-98a6-c5d8a468b0e5

Nice!
      `.trim()
    )
  );

  const markdown = useMemo(
    () => editorDataToMarkdown(editorData),
    [editorData]
  );

  const editor = useMarkdownEditable();

  return (
    <>
      <h1>Rich Text Editor</h1>
      <div className={styles.compare_pane}>
        <h3>Editor</h3>
        <Slate
          editor={editor}
          value={editorData}
          onChange={(v) => {
            setEditorData(v);
          }}
        >
          <MarkdownEditable autoFocus className={styles.editor} />
        </Slate>
      </div>
      <button
        onClick={() => {
          editor.insertFragment(
            markdownToEditorData("@USER-daa968aa-e7ad-4d99-98a6-c5d8a468b0e5")
          );
          ReactEditor.focus(editor);
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
          <MarkdownToHtml value={markdown} />
        </div>
      </div>
    </>
  );
}
