"use client";

import { useState, useCallback } from "react";
import { Upload, Button, Input, message } from "antd";
import { InboxOutlined, CopyOutlined } from "@ant-design/icons";
import jsQR from "jsqr";

const { Dragger } = Upload;
const { TextArea } = Input;

export default function QRDecoder() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback((file: File): false => {
    if (file.size > 5 * 1024 * 1024) {
      message.error("文件大小不能超过 5 MB");
      return false;
    }
    setLoading(true);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        message.error("图片解析失败");
        setLoading(false);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const decoded = jsQR(imageData.data, imageData.width, imageData.height);
      if (decoded) {
        setResult(decoded.data);
        message.success("解码成功");
      } else {
        message.error("未识别到二维码");
        setResult("");
      }
      setLoading(false);
    };
    img.onerror = () => {
      message.error("图片加载失败，请确认是有效图片");
      setLoading(false);
    };
    img.src = URL.createObjectURL(file);
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
