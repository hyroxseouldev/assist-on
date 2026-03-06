"use client";

import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { ImagePlus } from "lucide-react";
import type { ChangeEvent } from "react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { WYSIWYG_TYPOGRAPHY_CLASS } from "@/lib/content/wysiwyg-classes";
import { cn } from "@/lib/utils";

type TiptapEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onUploadImage?: (file: File) => Promise<string>;
};

export function TiptapEditor({
  value,
  onChange,
  placeholder = "세션 내용을 입력하세요.",
  onUploadImage,
}: TiptapEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      Highlight,
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          "min-h-56 rounded-md border border-input bg-background px-3 py-2 focus-visible:outline-none",
          WYSIWYG_TYPOGRAPHY_CLASS
        ),
      },
    },
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getHTML());
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
    return <div className="min-h-56 rounded-md border border-input bg-background" />;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("링크 URL을 입력하세요", previousUrl ?? "https://");

    if (url === null) {
      return;
    }

    if (!url) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().setLink({ href: url }).run();
  };

  const handleSelectImage = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!onUploadImage) {
      return;
    }

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const imageUrl = await onUploadImage(file);
      editor.chain().focus().setImage({ src: imageUrl }).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : "이미지 업로드에 실패했습니다.";
      toast.error(message);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 rounded-md border border-input bg-background p-1">
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("heading", { level: 4 }) ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        >
          H4
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("heading", { level: 5 }) ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 5 }).run()}
        >
          H5
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("heading", { level: 6 }) ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 6 }).run()}
        >
          H6
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          UL
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          OL
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          HR
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("highlight") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          HL
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("taskList") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          TASK
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive("link") ? "secondary" : "ghost"}
          onClick={setLink}
        >
          LINK
        </Button>
        {onUploadImage ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleSelectImage}
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="size-4" />
              IMG
            </Button>
          </>
        ) : null}
      </div>
      <EditorContent editor={editor} className={cn("tiptap-editor")} />
    </div>
  );
}
