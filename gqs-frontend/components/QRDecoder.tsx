"use client";

import { useState, useCallback } from "react";
import { Upload, Button, Input, message } from "antd";
import { InboxOutlined, CopyOutlined } from "@ant-design/icons";
import QrScanner from "qr-scanner";

const { Dragger } = Upload;
const { TextArea } = Input;

export default function QRDecoder() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(async (file: File): Promise<false> => {
    if (file.size > 5 * 1024 * 1024) {
      message.error("文件大小不能超过 5 MB");
      return false;
    }
    setLoading(true);
    try {
      const decoded = await QrScanner.scanImage(file);
      setResult(decoded);
      message.success("解码成功");
    } catch {
      message.error("未识别到二维码");
      setResult("");
    } finally {
      setLoading(false);
    }
    return false;
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result);
      message.success("已复制");
    } catch {
      message.error("复制失败");
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414", textAlign: "center" }}>
        上传二维码图片解码
      </h3>
      <Dragger
        accept="image/*"
        showUploadList={false}
        beforeUpload={(file) => handleFile(file)}
        disabled={loading}
        style={{ padding: 24 }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p style={{ fontSize: 14, color: "#434343" }}>点击或拖拽上传</p>
        <p style={{ fontSize: 12, color: "#8c8c8c" }}>支持 PNG / JPG / GIF，最大 5 MB</p>
      </Dragger>

      {result && (
        <div style={{ marginTop: 24 }}>
          <TextArea rows={4} value={result} readOnly style={{ fontSize: 14 }} />
          <Button
            icon={<CopyOutlined />}
            onClick={handleCopy}
            style={{ marginTop: 8 }}
          >
            复制结果
          </Button>
        </div>
      )}
    </div>
  );
}
