"use client";

import { useEffect, useState } from "react";
import { Spin, Alert } from "antd";
import { useParams } from "next/navigation";
import UrlDynForm from "@/components/UrlDynForm";
import QRPreview from "@/components/QRPreview";
import api from "@/lib/api";

export default function UrldynEditPage() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [remainingDays, setRemainingDays] = useState(30);

  useEffect(() => {
    api
      .get(`/urldyn/${numId}`)
      .then((res) => {
        const d = res.data.data;
        setData(d);
        const expiresAt = new Date(d.expires_at as string).getTime();
        setRemainingDays(Math.max(1, Math.ceil((expiresAt - Date.now()) / 86400000)));
        setLoading(false);
      })
      .catch(() => {
        setError("加载失败");
        setLoading(false);
      });
  }, [numId]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "48px 16px" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) return <Alert type="error" title={error} showIcon />;
  if (!data) return <Alert type="warning" title="数据不存在" showIcon />;

  const shortUrl = (result?.short_url || data.short_url) as string;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-6">
      <div className="w-full min-w-0 flex-1">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414" }}>
          编辑网址跳转码
        </h3>
        <UrlDynForm
          key={numId}
          editId={numId}
          initialValues={{ target_url: data.target_url as string, expires_in: remainingDays }}
          onCreated={(d) => setResult(d as unknown as Record<string, unknown>)}
        />
      </div>
      <div className="w-full min-w-0 flex-1">
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414" }}>预览</h3>
        <QRPreview value={shortUrl} copyText={shortUrl} />
      </div>
    </div>
  );
}
