"use client";

import { useEffect, useState } from "react";
import { Table, Tag, Button, Space, Input, Select, message, Popconfirm, Modal } from "antd";
import { DeleteOutlined, EditOutlined, SearchOutlined, QrcodeOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import QRPreview from "@/components/QRPreview";

const typeColors: Record<string, string> = { urldyn: "blue", article: "green", form: "orange" };
const typeLabels: Record<string, string> = { urldyn: "网址跳转", article: "文章", form: "表单" };
const statusColors: Record<string, string> = { active: "green", expiring_soon: "orange", expired: "red" };
const statusLabels: Record<string, string> = { active: "活跃", expiring_soon: "即将过期", expired: "已过期" };

export default function CodeList() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrModalValue, setQrModalValue] = useState("");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const router = useRouter();

  const triggerSearch = () => {
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page, page_size: 20 };
        if (typeFilter) params.type = typeFilter;
        if (keyword) params.keyword = keyword;
        const res = await api.get("/codes", { params });
        if (!cancelled) {
          setData(res.data.data.list);
          setTotal(res.data.data.total);
        }
      } catch {
        if (!cancelled) message.error("加载失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [page, typeFilter, keyword, refreshKey]);

  const handleDelete = async (type: string, id: number) => {
    try {
      await api.delete(`/${type}/${id}`);
      message.success("已删除");
      // Refresh current page
      const params: Record<string, unknown> = { page, page_size: 20 };
      if (typeFilter) params.type = typeFilter;
      if (keyword) params.keyword = keyword;
      const res = await api.get("/codes", { params });
      setData(res.data.data.list);
      setTotal(res.data.data.total);
    } catch {
      message.error("删除失败");
    }
  };

  const handleBatchDelete = async () => {
    const results = await Promise.allSettled(
      selectedRowKeys.map((key) => {
        const keyStr = key as string;
        const lastUnderscore = keyStr.lastIndexOf("_");
        const type = keyStr.slice(0, lastUnderscore);
        const id = keyStr.slice(lastUnderscore + 1);
        return api.delete(`/${type}/${id}`);
      })
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed === 0) {
      message.success(`成功删除 ${succeeded} 个活码`);
    } else {
      message.warning(`删除完成：${succeeded} 成功，${failed} 失败`);
    }
    setSelectedRowKeys([]);
    setRefreshKey((k) => k + 1);
  };

  const columns = [
    {
      title: "类型",
      dataIndex: "type",
      width: 100,
      render: (t: string) => <Tag color={typeColors[t] || "default"}>{typeLabels[t] || t}</Tag>,
    },
    {
      title: "短链接",
      dataIndex: "short_url",
      ellipsis: true,
      render: (url: string) => (
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#1677FF", fontWeight: 500 }}>
          {url}
        </a>
      ),
    },
    {
      title: "标题/目标",
      key: "desc",
      ellipsis: true,
      render: (_: unknown, r: Record<string, unknown>) =>
        r.title || r.target_url || "-",
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s] || s}</Tag>,
    },
    {
      title: "访问",
      dataIndex: "access_count",
      width: 70,
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      width: 120,
      render: (t: string) => new Date(t).toLocaleDateString("zh-CN"),
    },
    {
      title: "操作",
      key: "actions",
      width: 160,
      render: (_: unknown, r: Record<string, unknown>) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<QrcodeOutlined />}
            onClick={() => {
              setQrModalValue(r.short_url as string);
              setQrModalVisible(true);
            }}
          />
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => router.push(`/${r.type}/${r.id}`)}
          />
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(r.type as string, r.id as number)}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索标题/URL"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onPressEnter={triggerSearch}
          style={{ width: 240 }}
        />
        <Select
          placeholder="类型筛选"
          allowClear
          style={{ width: 140 }}
          value={typeFilter}
          onChange={(v) => { setTypeFilter(v); setPage(1); }}
          options={[
            { value: "urldyn", label: "网址跳转" },
            { value: "article", label: "文章" },
            { value: "form", label: "表单" },
          ]}
        />
        <Button
          type="primary"
          onClick={triggerSearch}
        >
          搜索
        </Button>
        {selectedRowKeys.length > 0 && (
          <Popconfirm
            title={`确定删除选中的 ${selectedRowKeys.length} 个活码？此操作不可恢复。`}
            onConfirm={handleBatchDelete}
          >
            <Button danger icon={<DeleteOutlined />}>
              批量删除 ({selectedRowKeys.length})
            </Button>
          </Popconfirm>
        )}
      </div>
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(r) => `${r.type}_${r.id}`}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        loading={loading}
        size="middle"
        bordered
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: setPage,
          showSizeChanger: false,
          showTotal: (t) => `共 ${t} 条`,
        }}
        locale={{ emptyText: "还没有创建活码" }}
      />

      <Modal
        title="二维码"
        open={qrModalVisible}
        footer={null}
        onCancel={() => setQrModalVisible(false)}
        width={320}
        centered
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
          <QRPreview value={qrModalValue} showActions copyText={qrModalValue} />
        </div>
      </Modal>
    </div>
  );
}
