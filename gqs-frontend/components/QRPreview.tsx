"use client";

import { useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button, Card, Space, message } from "antd";
import { CopyOutlined, DownloadOutlined } from "@ant-design/icons";

interface Props {
  value: string;
  size?: number;
  showActions?: boolean;
  copyText?: string;
}

export default function QRPreview({ value, size = 200, showActions = true, copyText }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrcode.png";
    a.click();
  }, []);

  const handleCopy = useCallback(async () => {
    const text = copyText || value;
    try {
      await navigator.clipboard.writeText(text);
      message.success("已复制");
    } catch {
      message.error("复制失败");
    }
  }, [value, copyText]);

  return (
    <Card
      bordered
      style={{ borderRadius: 8, textAlign: "center" }}
      styles={{ body: { padding: 24 } }}
    >
      <div ref={canvasRef} style={{ display: "inline-block" }}>
        <QRCodeCanvas value={value} size={size} level="M" includeMargin />
      </div>
      {showActions && (
        <Space style={{ marginTop: 16 }}>
          {copyText && (
            <Button icon={<CopyOutlined />} onClick={handleCopy}>
              复制链接
            </Button>
          )}
          <Button icon={<DownloadOutlined />} onClick={handleDownload}>
            下载 PNG
          </Button>
        </Space>
      )}
    </Card>
  );
}
