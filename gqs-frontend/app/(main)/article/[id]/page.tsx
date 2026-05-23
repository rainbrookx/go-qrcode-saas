"use client";

import { useEffect, useState } from "react";
import { Form, Input, Select, Button, message, Spin, Alert } from "antd";
import { useParams } from "next/navigation";
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

export default function ArticleEditPage() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState<Record<string, unknown> | null>(null);
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<
    { key: string; type: string; name: string; size: number }[]
  >([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    api
      .get(`/article/${numId}`)
      .then((res) => {
        const d = res.data.data;
        setArticle(d);
        setContent((d.content as string) || "");
        setAttachments((d.attachments as []) || []);
        const expiresAt = new Date(d.expires_at as string).getTime();
        const remainingDays = Math.max(1, Math.ceil((expiresAt - Date.now()) / 86400000));
        form.setFieldsValue({ title: d.title, expires_in: remainingDays });
        setLoading(false);
      })
      .catch(() => {
        setError("加载失败");
        setLoading(false);
      });
  }, [numId, form]);

  const handleSubmit = async (values: { title: string; expires_in: number }) => {
    if (!content.trim()) {
      message.error("请输入文章内容");
      return;
    }
    setSaving(true);
    try {
      const res = await api.put(`/article/${numId}`, {
        title: values.title,
        content,
        attachments,
        expires_in: values.expires_in,
      });
      setResult(res.data.data);
      message.success("更新成功");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "更新失败";
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) return <Alert type="error" title={error} showIcon />;
  if (!article) return <Alert type="warning" title="数据不存在" showIcon />;

  const charCount = content.replace(/<[^>]*>/g, "").length;

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414" }}>
        编辑文章
      </h3>

      <Form form={form} layout="vertical" onFinish={handleSubmit} size="middle" autoComplete="off">
        <Form.Item
          name="title"
          rules={[{ required: true, max: 200, message: "请输入标题（最多200字符）" }]}
        >
          <Input autoComplete="off" placeholder="文章标题" />
        </Form.Item>

        <ArticleEditor key={article.id as number} content={content} onChange={setContent} />

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
          <Button
            type="primary"
            loading={saving}
            onClick={() => form.submit()}
            style={{ minHeight: 32 }}
          >
            保存修改
          </Button>
        </div>
      </Form>

      {result && (
        <div style={{ marginTop: 32 }}>
          <QRPreview
            value={result.short_url as string}
            copyText={result.short_url as string}
          />
        </div>
      )}
    </div>
  );
}
