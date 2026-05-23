"use client";

import { useState } from "react";
import { Alert, Form, Input, Select, InputNumber, DatePicker, Button, message, Card } from "antd";
import { useAuthStore } from "@/lib/store";
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

interface CreatedData {
  short_url: string;
  code: string;
}

export default function FormPage() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CreatedData | null>(null);
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [form] = Form.useForm();

  const handleSubmit = async (values: Record<string, unknown>) => {
    if (fields.length === 0) {
      message.error("请至少添加一个字段");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: values.title,
        fields,
        expires_in: values.expires_in,
      };
      if (values.max_submissions) payload.max_submissions = values.max_submissions;
      if (values.deadline) {
        // dayjs object from DatePicker
        const d = values.deadline as { toISOString?: () => string };
        payload.deadline = typeof d.toISOString === "function" ? d.toISOString() : String(values.deadline);
      }

      const res = await api.post("/form", payload);
      setResult(res.data.data);
      message.success("创建成功");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "创建失败";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!user && (
        <Alert
          type="info"
          showIcon
          title="登录后可创建活码并修改目标链接"
          action={
            <a href="/login" style={{ whiteSpace: "nowrap" }}>
              去登录
            </a>
          }
          style={{ marginBottom: 16 }}
        />
      )}
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 24, color: "#141414" }}>创建表单</h3>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 500px", minWidth: 300 }}>
          <FormBuilder value={fields} onChange={setFields} />
        </div>
        <div style={{ flex: "1 1 300px", minWidth: 260 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>表单设置</h3>
          <Form form={form} layout="vertical" onFinish={handleSubmit} size="middle" initialValues={{ expires_in: 30 }} autoComplete="off">
            <Form.Item name="title" rules={[{ required: true, max: 200, message: "请输入表单标题" }]}>
              <Input autoComplete="off" placeholder="表单标题" />
            </Form.Item>
            <Form.Item name="expires_in" label="有效期">
              <Select options={expiryOptions} />
            </Form.Item>
            <Form.Item name="max_submissions" label="提交数量上限（留空不限）">
              <InputNumber min={1} style={{ width: "100%" }} placeholder="不限" />
            </Form.Item>
            <Form.Item name="deadline" label="截止时间（留空不限）">
              <DatePicker showTime style={{ width: "100%" }} onChange={(d) => d?.toISOString()} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                生成二维码并创建
              </Button>
            </Form.Item>
          </Form>

          {result && (
            <Card variant="outlined" style={{ borderRadius: 8 }}>
              <QRPreview value={result.short_url} copyText={result.short_url} />
              <p style={{ marginTop: 12, textAlign: "center", fontSize: 14, color: "#434343" }}>
                短链接：<strong style={{ color: "#1677FF" }}>{result.short_url}</strong>
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
