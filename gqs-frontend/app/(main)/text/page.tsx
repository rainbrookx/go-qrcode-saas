"use client";

import { useState } from "react";
import { Input, Button } from "antd";
import QRPreview from "@/components/QRPreview";

const { TextArea } = Input;

export default function TextPage() {
  const [text, setText] = useState("");
  const [qrValue, setQrValue] = useState("");

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 300px", minWidth: 280 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414" }}>文本生成二维码</h3>
        <TextArea
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="输入文本内容..."
          maxLength={500}
          showCount
        />
        <Button
          type="primary"
          block
          disabled={!text.trim()}
          onClick={() => setQrValue(text)}
          style={{ marginTop: 12, minHeight: 32 }}
        >
          生成二维码
        </Button>
      </div>
      <div style={{ flex: "1 1 300px", minWidth: 280 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414" }}>预览</h3>
        {qrValue ? (
          <QRPreview value={qrValue} copyText={qrValue} />
        ) : (
          <div style={{
            height: 280, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#8c8c8c", border: "1px dashed #d9d9d9", borderRadius: 8, fontSize: 14,
          }}>
            输入文本并点击生成
          </div>
        )}
      </div>
    </div>
  );
}
