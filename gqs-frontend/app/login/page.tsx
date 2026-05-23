"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, Form, Input, Button, message, Card, Tooltip } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";

type Mode = "login" | "register";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const loginWithCode = useAuthStore((s) => s.loginWithCode);
  const register = useAuthStore((s) => s.register);
  const [codeLoginForm] = Form.useForm();
  const [smtpEnabled, setSmtpEnabled] = useState(true);

  useEffect(() => {
    api.get("/auth/smtp-status").then((res) => {
      setSmtpEnabled(res.data?.data?.smtp_enabled ?? true);
    }).catch(() => {});
  }, []);

  const handleRegister = async (values: { email: string; password: string; confirm_password: string }) => {
    setLoading(true);
    try {
      await register(values.email, values.password, values.confirm_password);
      message.success("注册成功，请登录");
      setMode("login");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "注册失败";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success("登录成功");
      router.push("/text");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "登录失败";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async (email: string) => {
    try {
      await api.post("/auth/verify-code", { email, purpose: "login" });
      setCodeSent(true);
      message.success("验证码已发送");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "发送失败";
      message.error(msg);
    }
  };

  const handleCodeLogin = async (values: { email: string; code: string }) => {
    setLoading(true);
    try {
      await loginWithCode(values.email, values.code);
      message.success("登录成功");
      router.push("/text");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "登录失败";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: "password",
      label: "密码登录",
      children: (
        <Form layout="vertical" onFinish={handlePasswordLogin} size="middle" autoComplete="off">
          <Form.Item name="email" rules={[{ required: true, type: "email", message: "请输入有效邮箱" }]}>
            <Input autoComplete="off" prefix={<MailOutlined />} placeholder="邮箱" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password autoComplete="off" prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
          <div className="text-center">
            <Button type="link" size="small" onClick={() => router.push("/forgot-password")}>
              忘记密码？
            </Button>
          </div>
        </Form>
      ),
    },
    {
      key: "email",
      label: "验证码登录",
      children: (
        <Form form={codeLoginForm} layout="vertical" onFinish={handleCodeLogin} size="middle" autoComplete="off">
          <Form.Item name="email" rules={[{ required: true, type: "email", message: "请输入有效邮箱" }]}>
            <Input autoComplete="off" prefix={<MailOutlined />} placeholder="邮箱" disabled={!smtpEnabled} />
          </Form.Item>
          <Form.Item name="code" rules={[{ required: true, len: 6, message: "请输入6位验证码" }]}>
            <Input
              autoComplete="off"
              placeholder="验证码"
              maxLength={6}
              disabled={!smtpEnabled}
              suffix={
                <Tooltip title={!smtpEnabled ? "邮件服务未启用，请联系管理员" : undefined}>
                  <Button
                    type="link"
                    size="small"
                    disabled={codeSent || !smtpEnabled}
                    onClick={() => {
                      const email = codeLoginForm.getFieldValue("email");
                      if (email) handleSendCode(email);
                      else message.warning("请先输入邮箱");
                    }}
                  >
                    {!smtpEnabled ? "邮件服务未启用" : codeSent ? "已发送" : "发送验证码"}
                  </Button>
                </Tooltip>
              }
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} disabled={!smtpEnabled} block>
              {smtpEnabled ? "登录" : "邮件服务未启用"}
            </Button>
          </Form.Item>
        </Form>
      ),
    },
  ];

  const registerForm = (
    <Form layout="vertical" onFinish={handleRegister} size="middle" autoComplete="off">
      <Form.Item name="email" rules={[{ required: true, type: "email", message: "请输入有效邮箱" }]}>
        <Input autoComplete="off" prefix={<MailOutlined />} placeholder="邮箱" />
      </Form.Item>
      <Form.Item
        name="password"
        rules={[
          { required: true, min: 8, message: "密码至少8位" },
          { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: "须包含大小写字母和数字" },
        ]}
      >
        <Input.Password autoComplete="off" prefix={<LockOutlined />} placeholder="密码" />
      </Form.Item>
      <Form.Item
        name="confirm_password"
        dependencies={["password"]}
        rules={[
          { required: true, message: "请确认密码" },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue("password") === value) return Promise.resolve();
              return Promise.reject(new Error("两次密码不一致"));
            },
          }),
        ]}
      >
        <Input.Password autoComplete="off" prefix={<LockOutlined />} placeholder="确认密码" />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block>
          注册
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Card style={{ width: 400, borderRadius: 8, boxShadow: "0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02)" }}>
        <div className="text-center mb-6">
          <h2 style={{ fontSize: 20, fontWeight: 600, color: "#141414", marginBottom: 4 }}>QR Code SaaS</h2>
          <p style={{ fontSize: 14, color: "#8c8c8c", margin: 0 }}>开源二维码工具</p>
        </div>

        <Tabs
          activeKey={mode}
          onChange={(key) => { setMode(key as Mode); setCodeSent(false); }}
          centered
          size="small"
          items={[
            { key: "login", label: "登录", children: <Tabs items={tabItems} size="small" /> },
            { key: "register", label: "注册", children: registerForm },
          ]}
        />
      </Card>
    </div>
  );
}
