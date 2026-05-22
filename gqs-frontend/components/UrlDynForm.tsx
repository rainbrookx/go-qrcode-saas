"use client";

import { useState } from "react";
import { Form, Input, Select, Button, message } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import api from "@/lib/api";

interface Props {
  onCreated: (data: { short_url: string; code: string; target_url: string; expires_at: string }) => void;
}

const expiryOptions = [
  { value: 1, label: "1 天" },
  { value: 7, label: "7 天" },
  { value: 15, label: "15 天" },
  { value: 30, label: "30 天（默认）" },
  { value: 45, label: "45 天" },
  { value: 60, label: "60 天" },
];

export default function UrlDynForm({ onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: { target_url: string; expires_in: number }) => {
    setLoading(true);
    try {
      const res = await api.post("/urldyn", values);
      onCreated(res.data.data);
      message.success("生成成功");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "创建失败";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={handleSubmit} size="middle" initialValues={{ expires_in: 30 }}>
      <Form.Item
        name="target_url"
        rules={[
          { required: true, message: "请输入目标网址" },
          { type: "url", message: "请输入有效的 http/https 网址" },
        ]}
      >
        <Input prefix={<LinkOutlined />} placeholder="https://example.com" />
      </Form.Item>
      <Form.Item name="expires_in" label="有效期" rules={[{ required: true, message: "请选择有效期" }]}>
        <Select options={expiryOptions} />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block style={{ minHeight: 32 }}>
          生成二维码
        </Button>
      </Form.Item>
    </Form>
  );
}
