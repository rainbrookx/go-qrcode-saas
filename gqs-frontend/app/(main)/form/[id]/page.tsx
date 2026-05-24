"use client";

import { useEffect, useState } from "react";
import { Form, Input, Select, InputNumber, DatePicker, Button, message, Spin, Alert } from "antd";
import { useParams, useRouter } from "next/navigation";
import FormBuilder from "@/components/FormBuilder";
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

interface FieldConfig {
  id: string;
  type: string;
  label: string;
  required: boolean;
  props: Record<string, unknown>;
}

export default function FormEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const numId = Number(id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();
  const [formTitle, setFormTitle] = useState("");

  useEffect(() => {
    api
      .get(`/form/${numId}`)
      .then((res) => {
        const d = res.data.data;
        setFields((d.fields as FieldConfig[]) || []);
        setFormTitle((d.title as string) || "");
        const expiresAt = new Date(d.expires_at as string).getTime();
        const remainingDays = Math.max(1, Math.ceil((expiresAt - Date.now()) / 86400000));
        form.setFieldsValue({
          title: d.title,
          max_submissions: d.max_submissions ?? undefined,
          expires_in: remainingDays,
        });
        setLoading(false);
      })
      .catch(() => {
        setError("加载失败");
        setLoading(false);
      });
  }, [numId, form]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (fields.length === 0) {
      message.error("请至少添加一个字段");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: values.title,
        fields,
        expires_in: values.expires_in,
      };
      if (values.max_submissions) payload.max_submissions = values.max_submissions;
      if (values.deadline) {
        const d = values.deadline as { toISOString?: () => string };
        payload.deadline =
          typeof d.toISOString === "function" ? d.toISOString() : String(values.deadline);
      }
      const res = await api.put(`/form/${numId}`, payload);
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
      <div style={{ textAlign: "center", padding: "48px 16px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) return <Alert type="error" title={error} showIcon />;

  const shortUrl = (result?.short_url as string) || "";

  return (
    <div>
      <div
        className="flex flex-wrap gap-3"
        style={{
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h3 className="min-w-0" style={{ fontSize: 16, fontWeight: 600, color: "#141414", margin: 0, overflowWrap: "anywhere" }}>
          编辑表单 - {formTitle}
        </h3>
        <Button onClick={() => router.push(`/form/${numId}/submissions`)} className="w-full md:w-auto">
          查看提交数据
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <div className="w-full min-w-0 md:flex-[2_1_500px]">
          <FormBuilder key={numId} value={fields} onChange={setFields} />
        </div>
        <div className="w-full min-w-0 md:flex-[1_1_300px]">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>表单设置</h3>
          <Form form={form} layout="vertical" onFinish={handleSubmit} size="middle" autoComplete="off">
            <Form.Item
              name="title"
              rules={[{ required: true, max: 200, message: "请输入表单标题" }]}
            >
              <Input autoComplete="off" placeholder="表单标题" />
            </Form.Item>
            <Form.Item name="expires_in" label="有效期">
              <Select options={expiryOptions} />
            </Form.Item>
            <Form.Item name="max_submissions" label="提交数量上限（留空不限）">
              <InputNumber min={1} style={{ width: "100%" }} placeholder="不限" />
            </Form.Item>
            <Form.Item name="deadline" label="截止时间（留空不限）">
              <DatePicker showTime style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={saving}
                block
                style={{ minHeight: 32 }}
              >
                保存修改
              </Button>
            </Form.Item>
          </Form>

          {result && (
            <div style={{ marginTop: 16 }}>
              <QRPreview value={shortUrl} copyText={shortUrl} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
