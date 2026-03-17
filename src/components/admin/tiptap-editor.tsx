"use client";

import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  MoreHorizontal,
} from "lucide-react";
import type { ChangeEvent, MouseEvent } from "react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const handleToolbarMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

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

  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border border-input bg-background p-1">
        <div className="flex min-w-max items-center gap-1">
          <Button
            type="button"
            size="xs"
            variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
            className="shrink-0"
            aria-label="글머리 기호 목록"
            onMouseDown={handleToolbarMouseDown}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="xs"
            variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
            className="shrink-0"
            aria-label="번호 목록"
            onMouseDown={handleToolbarMouseDown}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="xs"
            variant={editor.isActive("link") ? "secondary" : "ghost"}
            className="shrink-0 md:hidden"
            aria-label="링크"
            onMouseDown={handleToolbarMouseDown}
            onClick={setLink}
          >
            <Link2 className="size-3.5" />
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
                size="xs"
                variant="ghost"
                className="shrink-0"
                aria-label="이미지 추가"
                onMouseDown={handleToolbarMouseDown}
                onClick={triggerImageUpload}
              >
                <ImagePlus className="size-3.5" />
              </Button>
            </>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="shrink-0"
                aria-label="서식 더보기"
                onMouseDown={handleToolbarMouseDown}
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem onSelect={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
                <Heading1 className="size-4" />
                제목 1
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
                <Heading2 className="size-4" />
                제목 2
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
                <Heading3 className="size-4" />
                제목 3
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor.chain().focus().toggleTaskList().run()}>
                <ListTodo className="size-4" />
                체크리스트
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => editor.chain().focus().setHorizontalRule().run()}>
                <Minus className="size-4" />
                구분선
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden items-center gap-1 md:flex md:pl-1">
            <Button
              type="button"
              size="xs"
              variant={editor.isActive("bold") ? "secondary" : "ghost"}
              className="shrink-0"
              aria-label="굵게"
              onMouseDown={handleToolbarMouseDown}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="xs"
              variant={editor.isActive("italic") ? "secondary" : "ghost"}
              className="shrink-0"
              aria-label="기울임"
              onMouseDown={handleToolbarMouseDown}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="xs"
              variant={editor.isActive("highlight") ? "secondary" : "ghost"}
              className="shrink-0"
              aria-label="형광펜"
              onMouseDown={handleToolbarMouseDown}
              onClick={() => editor.chain().focus().toggleHighlight().run()}
            >
              <Highlighter className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="xs"
              variant={editor.isActive("link") ? "secondary" : "ghost"}
              className="shrink-0"
              aria-label="링크"
              onMouseDown={handleToolbarMouseDown}
              onClick={setLink}
            >
              <Link2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
      <BubbleMenu
        editor={editor}
        options={{ placement: "top", offset: 8 }}
        shouldShow={({ editor: currentEditor, from, to }) => from !== to && !currentEditor.isActive("image")}
      >
        <div className="flex items-center gap-1 rounded-md border border-input bg-background p-1 shadow-md">
          <Button
            type="button"
            size="xs"
            variant={editor.isActive("bold") ? "secondary" : "ghost"}
            aria-label="굵게"
            onMouseDown={handleToolbarMouseDown}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="xs"
            variant={editor.isActive("italic") ? "secondary" : "ghost"}
            aria-label="기울임"
            onMouseDown={handleToolbarMouseDown}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="xs"
            variant={editor.isActive("highlight") ? "secondary" : "ghost"}
            aria-label="형광펜"
            onMouseDown={handleToolbarMouseDown}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
          >
            <Highlighter className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="xs"
            variant={editor.isActive("link") ? "secondary" : "ghost"}
            aria-label="링크"
            onMouseDown={handleToolbarMouseDown}
            onClick={setLink}
          >
            <Link2 className="size-3.5" />
          </Button>
        </div>
      </BubbleMenu>
      <EditorContent editor={editor} className={cn("tiptap-editor")} />
    </div>
  );
}
