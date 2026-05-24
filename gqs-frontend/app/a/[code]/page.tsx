"use client";

import { useEffect, useState, use } from "react";
import api from "@/lib/api";
import DOMPurify from "dompurify";
import { Spin, Typography } from "antd";
import { FileOutlined, VideoCameraOutlined, AudioOutlined, PictureOutlined } from "@ant-design/icons";

const { Title } = Typography;

interface ArticleData {
  title: string;
  content: string;
  attachments: { type: string; name: string; url: string }[];
}

const typeIcons: Record<string, React.ReactNode> = {
  image: <PictureOutlined />,
  video: <VideoCameraOutlined />,
  audio: <AudioOutlined />,
  file: <FileOutlined />,
};

export default function PublicArticlePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [data, setData] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/public/article/${code}`)
      .then((res) => setData(res.data.data))
      .catch((err) => {
        if (err.response?.status === 410) setError("文章已过期");
        else setError("文章不存在");
      })
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) return <div style={{ textAlign: "center", padding: "48px 16px" }}><Spin size="large" /></div>;
  if (error) return <div style={{ textAlign: "center", padding: "48px 16px", color: "#8c8c8c", fontSize: 16 }}>{error}</div>;
  if (!data) return null;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px" }}>
      <Title level={2} style={{ fontSize: 24, fontWeight: 600, color: "#141414", marginBottom: 24 }}>
        {data.title}
      </Title>
      <div
        className="tiptap"
        style={{ fontSize: 14, lineHeight: 1.8, color: "#434343", overflowWrap: "anywhere" }}
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(data.content) }}
      />
      {data.attachments.length > 0 && (
        <div style={{ marginTop: 32, borderTop: "1px solid #f0f0f0", paddingTop: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>附件</h3>
          {data.attachments.map((att, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13 }} className="break-all">
                {typeIcons[att.type]} {att.name}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
