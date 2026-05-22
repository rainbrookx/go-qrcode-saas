"use client";

import { useState } from "react";
import { Input, Button } from "antd";
import { LinkOutlined } from "@ant-design/icons";
import QRPreview from "@/components/QRPreview";

export default function UrlPage() {
  const [url, setUrl] = useState("");
  const [qrValue, setQrValue] = useState("");

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 300px", minWidth: 280 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414" }}>网址生成二维码</h3>
        <Input
          prefix={<LinkOutlined />}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http(s)://"
          maxLength={2048}
        />
        <Button
          type="primary"
          block
          disabled={!url.trim()}
          onClick={() => setQrValue(url)}
          style={{ marginTop: 12, minHeight: 32 }}
        >
          生成二维码
        </Button>
      </div>
      <div style={{ flex: "1 1 300px", minWidth: 280 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414" }}>预览</h3>
        {qrValue ? (
          <QRPreview value={qrValue} />
        ) : (
          <div style={{
            height: 280, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#8c8c8c", border: "1px dashed #d9d9d9", borderRadius: 8, fontSize: 14,
          }}>
            输入网址并点击生成
          </div>
        )}
      </div>
    </div>
  );
}
