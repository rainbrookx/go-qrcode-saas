"use client";

import { useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Button, Card, Grid, message } from "antd";
import { CopyOutlined, DownloadOutlined } from "@ant-design/icons";

interface Props {
  value: string;
  size?: number;
  showActions?: boolean;
  copyText?: string;
}

export default function QRPreview({ value, size = 200, showActions = true, copyText }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const screens = Grid.useBreakpoint();
  const actualSize = screens.md ? size : Math.min(size, 160);

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
      variant="outlined"
      style={{ borderRadius: 8 }}
      styles={{
        body: {
          padding: screens.md ? 24 : 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        },
      }}
    >
      <div ref={canvasRef}>
        <QRCodeCanvas value={value} size={actualSize} level="M" includeMargin />
      </div>
      {showActions && (
        <div
          className="mt-4 flex w-full flex-col gap-2 md:w-auto md:flex-row"
        >
          {copyText && (
            <Button icon={<CopyOutlined />} onClick={handleCopy} className="w-full md:w-auto">
              复制链接
            </Button>
          )}
          <Button icon={<DownloadOutlined />} onClick={handleDownload} className="w-full md:w-auto">
            下载 PNG
          </Button>
        </div>
      )}
    </Card>
  );
}
