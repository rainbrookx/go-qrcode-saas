"use client";

import { useState } from "react";
import { Button, Card, Input, Switch, InputNumber, Space, Popconfirm } from "antd";
import {
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  FontSizeOutlined,
  CheckSquareOutlined,
  DownOutlined,
  CalendarOutlined,
  StarOutlined,
  UploadOutlined,
  AlignLeftOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";

const fieldTypes = [
  { value: "text", label: "单行文本", icon: <FontSizeOutlined /> },
  { value: "textarea", label: "多行文本", icon: <AlignLeftOutlined /> },
  { value: "radio", label: "单选", icon: <CheckSquareOutlined /> },
  { value: "checkbox", label: "多选", icon: <UnorderedListOutlined /> },
  { value: "select", label: "下拉", icon: <DownOutlined /> },
  { value: "date", label: "日期", icon: <CalendarOutlined /> },
  { value: "file", label: "文件上传", icon: <UploadOutlined /> },
  { value: "rating", label: "评分", icon: <StarOutlined /> },
];

interface FieldConfig {
  id: string;
  type: string;
  label: string;
  required: boolean;
  props: Record<string, unknown>;
}

interface Props {
  value?: FieldConfig[];
  onChange?: (fields: FieldConfig[]) => void;
}

let fieldCounter = 0;

export default function FormBuilder({ value = [], onChange }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const notify = (fields: FieldConfig[]) => onChange?.(fields);

  const addField = (type: string) => {
    const id = `f${++fieldCounter}_${new Date().getTime()}`;
    const props: Record<string, unknown> = {};
    if (["radio", "checkbox", "select"].includes(type)) {
      props.options = ["选项1", "选项2"];
    }
    if (type === "rating") props.max = 5;
    const newFields = [...value, { id, type, label: "", required: false, props }];
    notify(newFields);
    setSelectedIdx(newFields.length - 1);
  };

  const removeField = (idx: number) => {
    const newFields = value.filter((_, i) => i !== idx);
    notify(newFields);
    setSelectedIdx(null);
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= value.length) return;
    const newFields = [...value];
    [newFields[idx], newFields[newIdx]] = [newFields[newIdx], newFields[idx]];
    notify(newFields);
    setSelectedIdx(newIdx);
  };

  const updateField = (idx: number, updates: Partial<FieldConfig>) => {
    const newFields = value.map((f, i) => (i === idx ? { ...f, ...updates } : f));
    notify(newFields);
  };

  const selected = selectedIdx !== null ? value[selectedIdx] : null;

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <div style={{ flex: "1 1 280px", minWidth: 250 }}>
        <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 14 }}>字段列表</div>
        <div style={{ minHeight: 200, border: "1px solid #d9d9d9", borderRadius: 8, padding: 8 }}>
          {value.length === 0 && (
            <div style={{ color: "#8c8c8c", fontSize: 13, textAlign: "center", padding: 40 }}>
              从右侧添加字段
            </div>
          )}
          {value.map((field, idx) => {
            const typeInfo = fieldTypes.find((t) => t.value === field.type);
            return (
              <Card
                key={field.id}
                size="small"
                hoverable
                onClick={() => setSelectedIdx(idx)}
                style={{
                  marginBottom: 4,
                  borderColor: selectedIdx === idx ? "#1677FF" : undefined,
                  cursor: "pointer",
                }}
                styles={{ body: { padding: "6px 10px" } }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <span>
                    {typeInfo?.icon} {field.label || "未命名"}{" "}
                    <span style={{ color: "#8c8c8c", fontSize: 11 }}>({typeInfo?.label})</span>
                    {field.required && <span style={{ color: "#ff4d4f", marginLeft: 4 }}>*</span>}
                  </span>
                  <Space size={2}>
                    <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={(e) => { e.stopPropagation(); moveField(idx, -1); }} />
                    <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={idx === value.length - 1} onClick={(e) => { e.stopPropagation(); moveField(idx, 1); }} />
                    <Popconfirm title="删除此字段？" onConfirm={(e) => { e?.stopPropagation(); removeField(idx); }}>
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>
                  </Space>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <div style={{ flex: "1 1 220px", minWidth: 200 }}>
        <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 14 }}>添加字段</div>
        <div style={{ border: "1px solid #d9d9d9", borderRadius: 8, padding: 8 }}>
          <Space size={4} wrap>
            {fieldTypes.map((ft) => (
              <Button
                key={ft.value}
                size="small"
                icon={ft.icon}
                onClick={() => addField(ft.value)}
                disabled={value.length >= 50}
              >
                {ft.label}
              </Button>
            ))}
          </Space>
        </div>

        {selected && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 14 }}>属性配置</div>
            <div style={{ border: "1px solid #d9d9d9", borderRadius: 8, padding: 12 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13 }}>标签</label>
                <Input
                  size="small"
                  value={selected.label}
                  onChange={(e) => updateField(selectedIdx!, { label: e.target.value })}
                  placeholder="字段标签"
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <Switch
                  size="small"
                  checked={selected.required}
                  onChange={(v) => updateField(selectedIdx!, { required: v })}
                />{" "}
                <span style={{ fontSize: 13 }}>必填</span>
              </div>
              {["radio", "checkbox", "select"].includes(selected.type) && (
                <div>
                  <label style={{ fontSize: 13 }}>选项（逗号分隔）</label>
                  <Input
                    size="small"
                    value={(selected.props.options as string[])?.join(",") || ""}
                    onChange={(e) =>
                      updateField(selectedIdx!, {
                        props: { ...selected.props, options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) },
                      })
                    }
                  />
                </div>
              )}
              {selected.type === "rating" && (
                <div>
                  <label style={{ fontSize: 13 }}>最大分值</label>
                  <InputNumber
                    size="small"
                    min={3}
                    max={10}
                    value={(selected.props.max as number) || 5}
                    onChange={(v) => updateField(selectedIdx!, { props: { ...selected.props, max: v } })}
                  />
                </div>
              )}
              {selected.type === "file" && (
                <div>
                  <label style={{ fontSize: 13 }}>文件大小限制 (MB)</label>
                  <InputNumber
                    size="small"
                    min={1}
                    max={10}
                    value={(selected.props.max_size as number) || 10}
                    onChange={(v) =>
                      updateField(selectedIdx!, {
                        props: { ...selected.props, max_size: v ? v * 1024 * 1024 : 10485760 },
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
