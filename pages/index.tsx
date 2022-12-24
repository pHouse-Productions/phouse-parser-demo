import { useMemo, useState } from "react";
import NoSSR from "react-no-ssr";
import { BaseRange, Editor, Range, Transforms } from "slate";
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

  const [mentionQuery, setMentionQuery] = useState<{
    search: string;
    range: BaseRange;
  }>();
  const getMentionQueryFromEditor = () => {
    const { selection } = editor;
    if (!selection) return;
    if (!Range.isCollapsed(selection)) return;

    const [cursor] = Range.edges(selection);

    const startOfLine = Editor.before(editor, cursor, { unit: "line" });
    if (!startOfLine) return;

    const startOfLineToCursor = Editor.range(editor, startOfLine, cursor);
    const s = Editor.string(editor, startOfLineToCursor);
    if (!s) return;

    const atPos = s.lastIndexOf("@");
    if (atPos === -1) return;

    const search = s.substring(atPos + 1);

    const atLocation = Editor.before(editor, cursor, {
      unit: "offset",
      distance: search.length + 1,
    });
    if (!atLocation) return;

    return { search, range: Editor.range(editor, atLocation, cursor) };
  };

  return (
    <>
      <h1>Rich Text Editor</h1>
      <div className={styles.compare_pane}>
        <h3>Editor</h3>
        <NoSSR>
          <Slate
            editor={editor}
            value={editorData}
            onChange={(v) => {
              setEditorData(v);
              setMentionQuery(getMentionQueryFromEditor());
            }}
          >
            <MarkdownEditable className={styles.editor} />
          </Slate>
        </NoSSR>
      </div>
      <div>
        <button
          disabled={!mentionQuery}
          onClick={() => {
            if (!mentionQuery) return;
            Transforms.select(editor, mentionQuery.range);
            Transforms.insertFragment(
              editor,
              markdownToEditorData(
                "@USER-daa968aa-e7ad-4d99-98a6-c5d8a468b0e5 "
              )
            );
            ReactEditor.focus(editor);
          }}
        >
          Add @
        </button>
        {mentionQuery?.search}
      </div>

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
