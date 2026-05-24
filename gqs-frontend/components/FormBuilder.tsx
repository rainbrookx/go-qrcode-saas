"use client";

import { useCallback, useState } from "react";
import { Button, Card, Input, Switch, InputNumber, Space, Popconfirm } from "antd";
import {
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  HolderOutlined,
  FontSizeOutlined,
  CheckSquareOutlined,
  DownOutlined,
  CalendarOutlined,
  StarOutlined,
  UploadOutlined,
  AlignLeftOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";

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

function SortableFieldCard({
  field,
  idx,
  isSelected,
  onSelect,
  onRemove,
  onMove,
  fieldCount,
  typeInfo,
}: {
  field: FieldConfig;
  idx: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  fieldCount: number;
  typeInfo: { icon: React.ReactNode; label: string } | undefined;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.4 : 1,
    marginBottom: 4,
    borderColor: isSelected ? "#1677FF" : undefined,
    cursor: "default",
  };

  return (
    <Card
      ref={setNodeRef}
      size="small"
      hoverable
      onClick={onSelect}
      style={style}
      styles={{ body: { padding: "6px 10px" } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
        <Space size={2}>
          <Button
            type="text"
            size="small"
            icon={<HolderOutlined />}
            style={{ cursor: "grab", color: "#8c8c8c", touchAction: "none" }}
            {...attributes}
            {...listeners}
          />
          <span>
            {typeInfo?.icon} {field.label || "未命名"}{" "}
            <span style={{ color: "#8c8c8c", fontSize: 11 }}>({typeInfo?.label})</span>
            {field.required && <span style={{ color: "#ff4d4f", marginLeft: 4 }}>*</span>}
          </span>
        </Space>
        <Space size={2}>
          <Button type="text" size="small" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={(e) => { e.stopPropagation(); onMove(-1); }} />
          <Button type="text" size="small" icon={<ArrowDownOutlined />} disabled={idx === fieldCount - 1} onClick={(e) => { e.stopPropagation(); onMove(1); }} />
          <Popconfirm title="删除此字段？" onConfirm={(e) => { e?.stopPropagation(); onRemove(); }}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
          </Popconfirm>
        </Space>
      </div>
    </Card>
  );
}

function FieldCardPreview({ field }: { field: FieldConfig }) {
  const typeInfo = fieldTypes.find((t) => t.value === field.type);
  return (
    <Card
      size="small"
      style={{
        borderColor: "#1677FF",
        cursor: "grabbing",
        width: "100%",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
      styles={{ body: { padding: "6px 10px" } }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
        <span>
          {typeInfo?.icon} {field.label || "未命名"}{" "}
          <span style={{ color: "#8c8c8c", fontSize: 11 }}>({typeInfo?.label})</span>
          {field.required && <span style={{ color: "#ff4d4f", marginLeft: 4 }}>*</span>}
        </span>
      </div>
    </Card>
  );
}

export default function FormBuilder({ value = [], onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const notify = useCallback((fields: FieldConfig[]) => onChange?.(fields), [onChange]);

  const selectedIdx = selectedId ? value.findIndex((f) => f.id === selectedId) : null;
  const selected = selectedIdx !== null && selectedIdx >= 0 ? value[selectedIdx] : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const oldIndex = value.findIndex((f) => f.id === active.id);
    const newIndex = value.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      setActiveId(null);
      return;
    }

    notify(arrayMove(value, oldIndex, newIndex));
    setActiveId(null);
  }, [value, notify]);

  const addField = (type: string) => {
    const id = `f${++fieldCounter}_${new Date().getTime()}`;
    const props: Record<string, unknown> = {};
    if (["radio", "checkbox", "select"].includes(type)) {
      props.options = ["选项1", "选项2"];
    }
    if (type === "rating") props.max = 5;
    const newFields = [...value, { id, type, label: "", required: false, props }];
    notify(newFields);
    setSelectedId(id);
  };

  const removeField = (idx: number) => {
    const newFields = value.filter((_, i) => i !== idx);
    notify(newFields);
    setSelectedId(null);
  };

  const moveField = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= value.length) return;
    const newFields = [...value];
    [newFields[idx], newFields[newIdx]] = [newFields[newIdx], newFields[idx]];
    notify(newFields);
    setSelectedId(value[newIdx].id);
  };

  const updateField = (idx: number, updates: Partial<FieldConfig>) => {
    const newFields = value.map((f, i) => (i === idx ? { ...f, ...updates } : f));
    notify(newFields);
  };

  const activeField = activeId ? value.find((f) => f.id === activeId) : null;

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="w-full min-w-0 flex-1">
        <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 14 }}>字段列表</div>
        <div style={{ minHeight: 200, border: "1px solid #d9d9d9", borderRadius: 8, padding: 8 }}>
          {value.length === 0 && (
            <div style={{ color: "#8c8c8c", fontSize: 13, textAlign: "center", padding: 40 }}>
              从右侧添加字段
            </div>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={value.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              {value.map((field, idx) => {
                const typeInfo = fieldTypes.find((t) => t.value === field.type);
                return (
                  <SortableFieldCard
                    key={field.id}
                    field={field}
                    idx={idx}
                    isSelected={selectedId === field.id}
                    onSelect={() => setSelectedId(field.id)}
                    onRemove={() => removeField(idx)}
                    onMove={(dir) => moveField(idx, dir)}
                    fieldCount={value.length}
                    typeInfo={typeInfo}
                  />
                );
              })}
            </SortableContext>
            <DragOverlay style={{ marginTop: -55 }}>
              {activeField ? <FieldCardPreview field={activeField} /> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      <div className="w-full min-w-0 flex-1">
        <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 14 }}>添加字段</div>
        <div style={{ border: "1px solid #d9d9d9", borderRadius: 8, padding: 8 }}>
          <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-4">
            {fieldTypes.map((ft) => (
              <Button
                key={ft.value}
                icon={ft.icon}
                onClick={() => addField(ft.value)}
                disabled={value.length >= 50}
              >
                {ft.label}
              </Button>
            ))}
          </div>
        </div>

        {selected && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500, fontSize: 14 }}>属性配置</div>
            <div style={{ border: "1px solid #d9d9d9", borderRadius: 8, padding: 12 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13 }}>标签</label>
                <Input
                  autoComplete="off"
                  value={selected.label}
                  onChange={(e) => updateField(selectedIdx!, { label: e.target.value })}
                  placeholder="字段标签"
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <Switch
                  checked={selected.required}
                  onChange={(v) => updateField(selectedIdx!, { required: v })}
                />{" "}
                <span style={{ fontSize: 13 }}>必填</span>
              </div>
              {["radio", "checkbox", "select"].includes(selected.type) && (
                <div>
                  <label style={{ fontSize: 13 }}>选项（逗号分隔）</label>
                  <Input
                    autoComplete="off"
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
