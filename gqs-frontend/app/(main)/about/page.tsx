"use client";

import { Typography, Card, Alert, Tag } from "antd";
import {
  GithubOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

const { Title, Paragraph, Text, Link } = Typography;

const features = [
  { label: "文本", desc: "普通文本生成二维码，纯前端，不存储" },
  { label: "网址静态码", desc: "网址生成二维码，纯前端，不存储" },
  {
    label: "网址跳转码",
    desc: "后端生成短链接 /u/<code>，扫码后跳转到目标网址，可编辑，记录访问统计",
  },
  {
    label: "文章",
    desc: "后端生成文章短链接 /a/<code>，TipTap 富文本编辑器，支持图片/视频/音频/文件附件（MinIO 存储）",
  },
  {
    label: "表单",
    desc: "后端生成表单短链接 /f/<code>，拖拽设计器（x-render），匿名提交，支持 CSV/Excel 导出",
  },
  {
    label: "解码",
    desc: "上传图片解析二维码内容，纯前端，不存储",
  },
];

const backendTech = [
  "Go 1.26",
  "Gin",
  "GORM + MySQL",
  "MinIO",
  "JWT (golang-jwt)",
  "bcrypt",
  "Viper",
  "go-qrcode",
  "excelize",
  "bluemonday",
];

const frontendTech = [
  "Next.js 16 (App Router)",
  "React 19",
  "TypeScript 5",
  "Tailwind CSS 4",
  "Ant Design 6",
  "TipTap",
  "x-render (FormRender + FormBuilder)",
  "qrcode.react + jsQR",
  "Zustand + Axios",
];

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <Title level={3} style={{ marginBottom: 24 }}>
        关于本项目
      </Title>

      <Alert
        type="warning"
        showIcon
        icon={<InfoCircleOutlined />}
        title="演示项目说明"
        description="当前项目为演示项目，数据库将于每天凌晨 2:00 自动重置，所有数据将恢复至初始状态。"
        style={{ marginBottom: 24 }}
      />

      <Card style={{ marginBottom: 24 }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
        >
          <GithubOutlined style={{ fontSize: 18 }} />
          <Text strong>GitHub</Text>
        </div>
        <Link href="https://github.com/rainbrookx/go-qrcode-saas" target="_blank">
          https://github.com/rainbrookx/go-qrcode-saas
        </Link>
        <Paragraph style={{ marginTop: 16, marginBottom: 0 }}>
          <ClockCircleOutlined style={{ marginRight: 6 }} />
          作者：fan yu xin
        </Paragraph>
      </Card>

      <Card title="主要功能" style={{ marginBottom: 24 }}>
        {features.map((f) => (
          <Paragraph key={f.label} style={{ marginBottom: 12 }}>
            <Tag color="blue">{f.label}</Tag>
            {f.desc}
          </Paragraph>
        ))}
      </Card>

      <Card title="技术栈" style={{ marginBottom: 24 }}>
        <Title level={5} style={{ marginTop: 0 }}>
          后端
        </Title>
        <Paragraph>
          {backendTech.map((t) => (
            <Tag key={t} style={{ marginBottom: 6 }}>
              {t}
            </Tag>
          ))}
        </Paragraph>

        <Title level={5}>前端</Title>
        <Paragraph>
          {frontendTech.map((t) => (
            <Tag key={t} style={{ marginBottom: 6 }}>
              {t}
            </Tag>
          ))}
        </Paragraph>

        <Title level={5}>基础设施</Title>
        <Paragraph>
          <Tag style={{ marginBottom: 6 }}>MySQL</Tag>
          <Tag style={{ marginBottom: 6 }}>MinIO</Tag>
        </Paragraph>
      </Card>
    </div>
  );
}
