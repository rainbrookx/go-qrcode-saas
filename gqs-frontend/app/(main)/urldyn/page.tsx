"use client";

import { useState } from "react";
import { Alert } from "antd";
import { useAuthStore } from "@/lib/store";
import UrlDynForm from "@/components/UrlDynForm";
import QRPreview from "@/components/QRPreview";

interface CreatedData {
  short_url: string;
  code: string;
  target_url: string;
  expires_at: string;
}

export default function UrldynPage() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<CreatedData | null>(null);

  if (!user) {
    return (
      <div>
        <Alert
          type="info"
          showIcon
          title="登录后可创建活码并修改目标链接"
          action={
            <a href="/login" style={{ whiteSpace: "nowrap" }}>
              去登录
            </a>
          }
          style={{ marginBottom: 16 }}
        />
        <UrlDynForm onCreated={setData} />
        {data && <div style={{ marginTop: 24 }}><QRPreview value={data.short_url} copyText={data.short_url} /></div>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-6">
      <div className="w-full min-w-0 flex-1">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414" }}>创建网址跳转码</h3>
        <UrlDynForm onCreated={setData} />
      </div>
      <div className="w-full min-w-0 flex-1">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414" }}>预览</h3>
        {data ? (
          <div>
            <QRPreview value={data.short_url} copyText={data.short_url} />
            <p style={{ marginTop: 12, fontSize: 14, color: "#434343", textAlign: "center" }}>
              短链接：<strong style={{ color: "#1677FF" }}>{data.short_url}</strong>
            </p>
          </div>
        ) : (
          <div
            className="flex h-56 items-center justify-center rounded-lg border border-dashed md:h-[280px]"
            style={{ color: "#8c8c8c", borderColor: "#d9d9d9", fontSize: 14 }}
          >
            输入目标网址并点击生成
          </div>
        )}
      </div>
    </div>
  );
}
