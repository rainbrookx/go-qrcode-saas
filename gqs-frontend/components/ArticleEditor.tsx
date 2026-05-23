"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import { Button, Input, Modal, Space, Upload, message } from "antd";
import {
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  LinkOutlined,
  PictureOutlined,
  HighlightOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { useCallback, useRef, useState } from "react";
import api from "@/lib/api";

const ToolbarButton = ({
  icon,
  active,
  onClick,
  title,
}: {
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
  title?: string;
}) => (
  <Button
    type={active ? "primary" : "text"}
    size="small"
    icon={icon}
    onClick={onClick}
    title={title}
    style={{ minWidth: 28, height: 28 }}
  />
);

export default function ArticleEditor({
  content,
  onChange,
}: {
  content?: string;
  onChange?: (html: string) => void;
}) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const linkSelectionRef = useRef<{ from: number; to: number } | null>(null);

  const editor = useEditor({
    content: content || "",
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "开始书写文章..." }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Underline,
      Highlight,
    ],
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  const addLink = useCallback(() => {
    if (!editor) return;

    linkSelectionRef.current = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    setLinkUrl(editor.getAttributes("link").href || "");
    setLinkModalOpen(true);
  }, [editor]);

  const closeLinkModal = useCallback(() => {
    setLinkModalOpen(false);
    setLinkUrl("");
    linkSelectionRef.current = null;
  }, []);

  const confirmLink = useCallback(() => {
    const selection = linkSelectionRef.current;
    const url = linkUrl.trim();

    if (url && editor && selection) {
      editor
        .chain()
        .focus()
        .setTextSelection(selection)
        .setLink({ href: url })
        .setTextSelection(selection.to)
        .unsetMark("link")
        .run();
    }

    closeLinkModal();
  }, [closeLinkModal, editor, linkUrl]);

  const removeLink = useCallback(() => {
    const selection = linkSelectionRef.current;

    if (editor && selection) {
      editor.chain().focus().setTextSelection(selection).unsetLink().run();
    }

    closeLinkModal();
  }, [closeLinkModal, editor]);

  const addImage = useCallback(() => {
    setImageUrl("");
    setImageModalOpen(true);
  }, []);

  const confirmImage = useCallback(() => {
    if (imageUrl.trim() && editor) {
      editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    }
    setImageModalOpen(false);
    setImageUrl("");
  }, [editor, imageUrl]);

  const handleFileUpload = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "article");
      try {
        const res = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const data = res.data.data;
        if (data.type === "image" && editor) {
          editor.chain().focus().setImage({ src: data.url }).run();
        }
        message.success("上传成功");
        return false; // prevent default upload
      } catch (err: unknown) {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "上传失败";
        message.error(msg);
        return false;
      }
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div
      style={{
        border: "1px solid #d9d9d9",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid #d9d9d9",
          padding: "8px 12px",
          background: "#fafafa",
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Space size={2} wrap>
          <ToolbarButton
            icon={<BoldOutlined />}
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="加粗"
          />
          <ToolbarButton
            icon={<ItalicOutlined />}
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="斜体"
          />
          <ToolbarButton
            icon={<UnderlineOutlined />}
            active={editor.isActive("underline")}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="下划线"
          />
          <ToolbarButton
            icon={<StrikethroughOutlined />}
            active={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="删除线"
          />
          <div style={{ width: 1, background: "#d9d9d9", margin: "0 4px" }} />
          <ToolbarButton
            icon={<AlignLeftOutlined />}
            active={editor.isActive({ textAlign: "left" })}
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
          />
          <ToolbarButton
            icon={<AlignCenterOutlined />}
            active={editor.isActive({ textAlign: "center" })}
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
          />
          <ToolbarButton
            icon={<AlignRightOutlined />}
            active={editor.isActive({ textAlign: "right" })}
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
          />
          <div style={{ width: 1, background: "#d9d9d9", margin: "0 4px" }} />
          <ToolbarButton
            icon={<OrderedListOutlined />}
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            icon={<UnorderedListOutlined />}
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <div style={{ width: 1, background: "#d9d9d9", margin: "0 4px" }} />
          <ToolbarButton icon={<LinkOutlined />} onClick={addLink} title="插入链接" />
          <ToolbarButton icon={<PictureOutlined />} onClick={addImage} title="插入图片URL" />
          <Upload showUploadList={false} beforeUpload={handleFileUpload} accept="image/*">
            <Button type="text" size="small" icon={<UploadOutlined />} title="上传图片" style={{ minWidth: 28, height: 28 }} />
          </Upload>
          <ToolbarButton
            icon={<HighlightOutlined />}
            active={editor.isActive("highlight")}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            title="高亮"
          />
        </Space>
      </div>
      <div
        style={{
          height: 400,
          overflowY: "auto",
          background: "#fff",
          padding: "8px 12px",
          fontSize: 14,
          lineHeight: 1.8,
          color: "#434343",
        }}
      >
        <EditorContent editor={editor} />
      </div>
      <Modal
        title="插入链接"
        open={linkModalOpen}
        okText="确定"
        cancelText="取消"
        onOk={confirmLink}
        onCancel={closeLinkModal}
        footer={(_, { OkBtn, CancelBtn }) => (
          <>
            <Button danger onClick={removeLink} disabled={!linkUrl}>
              移除链接
            </Button>
            <CancelBtn />
            <OkBtn />
          </>
        )}
      >
        <Input
          autoFocus
          placeholder="请输入链接地址"
          value={linkUrl}
          onChange={(event) => setLinkUrl(event.target.value)}
          onPressEnter={confirmLink}
        />
      </Modal>
      <Modal
        title="插入图片URL"
        open={imageModalOpen}
        okText="确定"
        cancelText="取消"
        onOk={confirmImage}
        onCancel={() => setImageModalOpen(false)}
      >
        <Input
          autoFocus
          placeholder="请输入图片 URL"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          onPressEnter={confirmImage}
        />
      </Modal>
    </div>
  );
}
