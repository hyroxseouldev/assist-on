"use client";

import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect } from "react";

import { WYSIWYG_TYPOGRAPHY_CLASS } from "@/lib/content/wysiwyg-classes";
import { cn } from "@/lib/utils";

type TiptapContentProps = {
  value: string;
  className?: string;
};

export function TiptapContent({ value, className }: TiptapContentProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        defaultProtocol: "https",
      }),
      Highlight,
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(WYSIWYG_TYPOGRAPHY_CLASS, "focus:outline-none"),
      },
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const current = editor.getHTML();
    if (current !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return <div className={cn(WYSIWYG_TYPOGRAPHY_CLASS, className)} />;
  }

  return <EditorContent editor={editor} className={cn("tiptap-content", className)} />;
}
