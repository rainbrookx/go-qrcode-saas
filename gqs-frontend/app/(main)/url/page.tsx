"use client";

import { useState } from "react";
import { Form, Input, Button } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import QRPreview from "@/components/QRPreview";

export default function UrlPage() {
  const [qrValue, setQrValue] = useState("");
  const [form] = Form.useForm();
  const watchedUrl: string = Form.useWatch("url", form) || "";

  const handleGenerate = async () => {
    try {
      await form.validateFields();
      setQrValue(watchedUrl);
    } catch {
      // validation failed
    }
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-6">
      <div className="w-full min-w-0 flex-1">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414" }}>网址生成二维码</h3>
        <Form form={form} layout="vertical" size="middle" autoComplete="off">
          <Form.Item
            name="url"
            rules={[
              { required: true, message: "请输入网址" },
              { type: "url", message: "请输入有效的 http/https 网址" },
            ]}
          >
            <Input
              autoComplete="off"
              prefix={<LinkOutlined />}
              placeholder="https://example.com"
              maxLength={2048}
            />
          </Form.Item>
          <Button
            type="primary"
            block
            disabled={!watchedUrl.trim()}
            onClick={handleGenerate}
            style={{ marginTop: 12, minHeight: 32 }}
          >
            生成二维码
          </Button>
        </Form>
      </div>
      <div className="w-full min-w-0 flex-1">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414" }}>预览</h3>
        {qrValue ? (
          <QRPreview value={qrValue} copyText={qrValue} />
        ) : (
          <div
            className="flex h-56 items-center justify-center rounded-lg border border-dashed md:h-[280px]"
            style={{ color: "#8c8c8c", borderColor: "#d9d9d9", fontSize: 14 }}
          >
            输入网址并点击生成
          </div>
        )}
      </div>
    </div>
  );
}
