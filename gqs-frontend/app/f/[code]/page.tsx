"use client";

import { useEffect, useState, use } from "react";
import { Form, Input, Button, Radio, Checkbox, Select, DatePicker, Rate, Upload, message, Spin, Typography } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import api from "@/lib/api";

const { Title } = Typography;

interface FieldConfig {
  id: string;
  type: string;
  label: string;
  required: boolean;
  props: Record<string, unknown>;
}

interface FormData {
  title: string;
  fields: FieldConfig[];
  max_submissions: number | null;
  submission_count: number;
  deadline: string | null;
}

export default function PublicFormPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [data, setData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form] = Form.useForm();

  useEffect(() => {
    api
      .get(`/public/form/${code}`)
      .then((res) => setData(res.data.data))
      .catch((err) => {
        if (err.response?.status === 410) setError("表单已过期");
        else setError("表单不存在或已停止收集");
      })
      .finally(() => setLoading(false));
  }, [code]);

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await api.post(`/public/form/${code}/submit`, { values });
      message.success("提交成功");
      form.resetFields();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "提交失败";
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 100 }}><Spin size="large" /></div>;
  if (error) return <div style={{ textAlign: "center", padding: 100, color: "#8c8c8c", fontSize: 16 }}>{error}</div>;
  if (!data) return null;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "32px 16px" }}>
      <Title level={2} style={{ fontSize: 20, fontWeight: 600, color: "#141414", marginBottom: 4 }}>
        {data.title}
      </Title>
      {data.max_submissions && (
        <p style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 24 }}>
          已提交 {data.submission_count}/{data.max_submissions}
        </p>
      )}

      <Form form={form} layout="vertical" onFinish={handleSubmit} size="middle">
        {data.fields.map((field) => (
          <Form.Item
            key={field.id}
            name={field.id}
            label={field.label}
            rules={field.required ? [{ required: true, message: `请填写${field.label}` }] : []}
          >
            {renderField(field)}
          </Form.Item>
        ))}
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting} block>
            提交
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

function renderField(field: FieldConfig) {
  const p = field.props;
  switch (field.type) {
    case "text":
      return <Input placeholder={(p.placeholder as string) || ""} />;
    case "textarea":
      return <Input.TextArea rows={4} maxLength={(p.max_length as number) || 500} placeholder={(p.placeholder as string) || ""} />;
    case "radio":
      return <Radio.Group options={(p.options as string[])?.map((o) => ({ label: o, value: o })) || []} />;
    case "checkbox":
      return <Checkbox.Group options={(p.options as string[])?.map((o) => ({ label: o, value: o })) || []} />;
    case "select":
      return <Select options={(p.options as string[])?.map((o) => ({ label: o, value: o })) || []} placeholder="请选择" />;
    case "date":
      return <DatePicker style={{ width: "100%" }} format={(p.format as string) || "YYYY-MM-DD"} />;
    case "file":
      return (
        <Upload beforeUpload={() => false} maxCount={1}>
          <Button icon={<UploadOutlined />}>上传文件</Button>
        </Upload>
      );
    case "rating":
      return <Rate count={(p.max as number) || 5} />;
    default:
      return <Input />;
  }
}
