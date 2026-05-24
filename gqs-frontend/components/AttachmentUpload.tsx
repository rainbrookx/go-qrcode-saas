"use client";

import { Upload, message } from "antd";
import api from "@/lib/api";

const maxSizes: Record<string, number> = {
  image: 5 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  audio: 20 * 1024 * 1024,
  file: 50 * 1024 * 1024,
};

const forbiddenExts = [".exe", ".bat", ".js", ".php", ".py"];

interface Attachment {
  key: string;
  type: string;
  name: string;
  size: number;
}

interface Props {
  value?: Attachment[];
  onChange?: (value: Attachment[]) => void;
}

function getType(ext: string): string {
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"];
  const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".webm"];
  const audioExts = [".mp3", ".wav", ".ogg", ".flac", ".aac"];
  ext = ext.toLowerCase();
  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  if (audioExts.includes(ext)) return "audio";
  return "file";
}

export default function AttachmentUpload({ value = [], onChange }: Props) {
  const handleUpload = async (file: File): Promise<false> => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (forbiddenExts.includes(ext)) {
      message.error("该文件类型被禁止上传");
      return false;
    }

    const type = getType(ext);
    const maxSize = maxSizes[type];
    if (file.size > maxSize) {
      message.error(`文件大小超限：${file.name}`);
      return false;
    }

    const videoFileCount = value.filter((a) => a.type === "video" || a.type === "file").length;
    const isVideoOrFile = type === "video" || type === "file";
    if (isVideoOrFile && videoFileCount >= 1) {
      message.error("视频与通用文件附件之和最多为 1");
      return false;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", "article");

    try {
      const res = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data.data;
      const newAtts = [...value, { key: data.key, type: data.type, name: data.name, size: data.size }];
      onChange?.(newAtts);
      message.success(`${file.name} 上传成功`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "上传失败";
      message.error(msg);
    }
    return false;
  };

  const handleRemove = (key: string) => {
    onChange?.(value.filter((a) => a.key !== key));
  };

  return (
    <div>
      <Upload
        showUploadList={false}
        beforeUpload={(file) => {
          handleUpload(file);
          return false;
        }}
        multiple
      >
        <a>+ 添加附件</a>
      </Upload>
      {value.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {value.map((att) => (
            <div
              key={att.key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                padding: "4px 8px",
                background: "#f5f5f5",
                borderRadius: 4,
                marginBottom: 4,
                fontSize: 13,
                minWidth: 0,
              }}
            >
              <span className="min-w-0 flex-1 break-all">
                [{att.type}] {att.name} ({(att.size / 1024 / 1024).toFixed(1)} MB)
              </span>
              <a onClick={() => handleRemove(att.key)} style={{ color: "#ff4d4f", flexShrink: 0 }}>删除</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
