"use client";

import { useState } from "react";
import { Form, Input, Select, Button, message } from "antd";
import ArticleEditor from "@/components/ArticleEditor";
import AttachmentUpload from "@/components/AttachmentUpload";
import QRPreview from "@/components/QRPreview";
import api from "@/lib/api";

const expiryOptions = [
  { value: 1, label: "1 天" },
  { value: 7, label: "7 天" },
  { value: 15, label: "15 天" },
  { value: 30, label: "30 天（默认）" },
  { value: 45, label: "45 天" },
  { value: 60, label: "60 天" },
];

interface CreatedData {
  short_url: string;
  code: string;
}

export default function ArticlePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreatedData | null>(null);
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<{ key: string; type: string; name: string; size: number }[]>([]);
  const [form] = Form.useForm();

  const handleSubmit = async (values: { title: string; expires_in: number }) => {
    if (!content.trim()) {
      message.error("请输入文章内容");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/article", {
        title: values.title,
        content,
        attachments,
        expires_in: values.expires_in,
      });
      setResult(res.data.data);
      message.success("发布成功");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "发布失败";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const charCount = content.replace(/<[^>]*>/g, "").length;

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414" }}>创建文章</h3>

      <Form form={form} layout="vertical" onFinish={handleSubmit} size="middle" initialValues={{ expires_in: 30 }}>
        <Form.Item name="title" rules={[{ required: true, max: 200, message: "请输入标题（最多200字符）" }]}>
          <Input placeholder="文章标题" />
        </Form.Item>

        <ArticleEditor content={content} onChange={setContent} />

        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: "#8c8c8c",
          }}
        >
          <span>{charCount} / 50,000 字</span>
        </div>

        <div style={{ marginTop: 16 }}>
          <AttachmentUpload value={attachments} onChange={setAttachments} />
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 16,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <Form.Item name="expires_in" label="有效期" style={{ marginBottom: 0, minWidth: 180 }}>
            <Select options={expiryOptions} />
          </Form.Item>
          <Button type="primary" loading={loading} onClick={() => form.submit()} style={{ minHeight: 32 }}>
            生成二维码并发布
          </Button>
        </div>
      </Form>

      {result && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414" }}>文章已发布</h3>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <div>
              <QRPreview value={result.short_url} copyText={result.short_url} />
            </div>
            <div>
              <p style={{ color: "#434343", fontSize: 14 }}>
                短链接：<strong style={{ color: "#1677FF" }}>{result.short_url}</strong>
              </p>
              <p style={{ color: "#8c8c8c", fontSize: 13 }}>扫描二维码或分享链接即可查看文章</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
