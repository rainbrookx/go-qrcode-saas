"use client";

import { useEffect, useState } from "react";
import { Card, Descriptions, Progress, Form, Input, Button, message, Spin, Alert } from "antd";
import api from "@/lib/api";

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<Record<string, unknown> | null>(null);
  const [quota, setQuota] = useState<Record<string, unknown> | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    Promise.all([api.get("/auth/me"), api.get("/user/quota")])
      .then(([meRes, quotaRes]) => {
        setUserInfo(meRes.data.data);
        setQuota(quotaRes.data.data);
        setLoading(false);
      })
      .catch(() => {
        setError("加载失败");
        setLoading(false);
      });
  }, []);

  const handleChangePassword = async (values: {
    old_password: string;
    new_password: string;
    confirm_password: string;
  }) => {
    setChangingPassword(true);
    try {
      await api.post("/auth/change-password", values);
      message.success("密码已修改");
      passwordForm.resetFields();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "修改失败";
      message.error(msg);
    } finally {
      setChangingPassword(false);
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

  const used = (quota?.used as number) || 0;
  const total = (quota?.total as number) || 100;
  const breakdown = (quota?.breakdown as Record<string, number>) || {};

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 24, color: "#141414" }}>
        个人中心
      </h3>

      <Card
        variant="outlined"
        style={{ borderRadius: 8, marginBottom: 24 }}
        styles={{ body: { padding: 24 } }}
        title={<span style={{ fontSize: 14, fontWeight: 600 }}>账号信息</span>}
      >
        <Descriptions column={1} size="small" colon={false}>
          <Descriptions.Item label="邮箱">{userInfo?.email as string}</Descriptions.Item>
          <Descriptions.Item label="注册时间">
            {new Date(userInfo?.created_at as string).toLocaleDateString("zh-CN")}
          </Descriptions.Item>
        </Descriptions>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: "#8c8c8c", marginBottom: 8 }}>活码配额</div>
          <Progress
            percent={Math.round((used / total) * 100)}
            format={() => `${used} / ${total}`}
            strokeColor="#1677FF"
          />
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12, color: "#8c8c8c" }}>
            <span>网址跳转: {breakdown.urldyn || 0}</span>
            <span>文章: {breakdown.article || 0}</span>
            <span>表单: {breakdown.form || 0}</span>
          </div>
        </div>
      </Card>

      <Card
        variant="outlined"
        style={{ borderRadius: 8 }}
        styles={{ body: { padding: 24 } }}
        title={<span style={{ fontSize: 14, fontWeight: 600 }}>修改密码</span>}
      >
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handleChangePassword}
          size="middle"
        >
          <Form.Item
            name="old_password"
            rules={[{ required: true, message: "请输入旧密码" }]}
          >
            <Input.Password placeholder="旧密码" />
          </Form.Item>
          <Form.Item
            name="new_password"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: 8, message: "密码至少 8 位" },
            ]}
          >
            <Input.Password placeholder="新密码（至少 8 位）" />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            dependencies={["new_password"]}
            rules={[
              { required: true, message: "请确认新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("new_password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="确认新密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={changingPassword} block>
              修改密码
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
