"use client";

import { useEffect, useState } from "react";
import { Table, Button, Space, message, Spin, Alert } from "antd";
import { DownloadOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";

interface FieldDef {
  id: string;
  type: string;
  label: string;
  required: boolean;
}

interface Submission {
  id: number;
  values: Record<string, unknown>;
  submitted_at: string;
}

export default function FormSubmissionsPage() {
  const params = useParams();
  const router = useRouter();
  const formId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [formRes, submissionsRes] = await Promise.all([
          api.get(`/form/${formId}`),
          api.get(`/form/${formId}/submissions`, { params: { page, page_size: 20 } }),
        ]);
        if (!cancelled) {
          setFormTitle(formRes.data.data.title as string);
          setFields((formRes.data.data.fields as FieldDef[]) || []);
          setSubmissions(submissionsRes.data.data.list);
          setTotal(submissionsRes.data.data.total);
        }
      } catch {
        if (!cancelled) setError("加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [formId, page]);

  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      const res = await api.get(`/form/${formId}/submissions/export`, {
        params: { format },
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `form_${formId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      message.success(`导出 ${format.toUpperCase()} 成功`);
    } catch {
      message.error("导出失败");
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" title={error} showIcon />;
  }

  const columns = [
    ...fields.map((field) => ({
      title: field.label,
      dataIndex: field.id,
      key: field.id,
      ellipsis: true,
      render: (val: unknown) => String(val ?? ""),
    })),
    {
      title: "提交时间",
      dataIndex: "submitted_at",
      key: "submitted_at",
      width: 170,
      render: (t: string) => new Date(t).toLocaleString("zh-CN"),
    },
  ];

  const dataSource = submissions.map((s) => ({
    ...s.values,
    submitted_at: s.submitted_at,
    _key: s.id,
  }));

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push(`/form/${formId}`)}
          />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#141414", margin: 0 }}>
            {formTitle} - 提交数据
          </h3>
        </div>
        <Space>
          <Button icon={<DownloadOutlined />} onClick={() => handleExport("csv")}>
            导出 CSV
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleExport("xlsx")}>
            导出 Excel
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="_key"
        loading={loading}
        size="middle"
        bordered
        scroll={{ x: "max-content" }}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (t) => `共 ${t} 条`,
        }}
        locale={{ emptyText: "暂无提交数据" }}
      />
    </div>
  );
}
