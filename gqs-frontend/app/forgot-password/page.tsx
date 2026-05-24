"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, message, Card, Tooltip } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [smtpEnabled, setSmtpEnabled] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api.get("/auth/smtp-status").then((res) => {
      setSmtpEnabled(res.data?.data?.smtp_enabled ?? true);
    }).catch(() => {});
  }, []);

  const handleSendCode = async (values: { email: string }) => {
    setLoading(true);
    try {
      await api.post("/auth/verify-code", { email: values.email, purpose: "reset_password" });
      setEmail(values.email);
      setStep("reset");
      message.success("验证码已发送");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "发送失败";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (values: { code: string; new_password: string; confirm_password: string }) => {
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, code: values.code, new_password: values.new_password, confirm_password: values.confirm_password });
      message.success("密码已重置，请登录");
      router.push("/login");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "重置失败";
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-4" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Card style={{ width: "100%", maxWidth: 400, borderRadius: 8 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#141414", textAlign: "center", marginBottom: 24 }}>
          找回密码
        </h2>

        {step === "email" ? (
          <Form layout="vertical" onFinish={handleSendCode} size="middle" autoComplete="off">
            <Form.Item name="email" rules={[{ required: true, type: "email", message: "请输入有效邮箱" }]}>
              <Input autoComplete="off" prefix={<MailOutlined />} placeholder="注册邮箱" disabled={!smtpEnabled} />
            </Form.Item>
            <Form.Item>
              <Tooltip title={!smtpEnabled ? "邮件服务未启用，请联系管理员" : undefined}>
                <Button type="primary" htmlType="submit" loading={loading} disabled={!smtpEnabled} block>
                  {smtpEnabled ? "发送验证码" : "邮件服务未启用"}
                </Button>
              </Tooltip>
            </Form.Item>
            {!smtpEnabled && (
              <div style={{ textAlign: "center", color: "#8c8c8c", fontSize: 13, marginTop: -8, marginBottom: 12 }}>
                邮件服务未启用，无法发送验证码
              </div>
            )}
            <div className="text-center">
              <Button type="link" onClick={() => router.push("/login")}>返回登录</Button>
            </div>
          </Form>
        ) : (
          <Form layout="vertical" onFinish={handleReset} size="middle" autoComplete="off">
            <div style={{ marginBottom: 12, fontSize: 14, color: "#8c8c8c", textAlign: "center", overflowWrap: "anywhere" }}>
              验证码已发送至 {email}
            </div>
            <Form.Item name="code" rules={[{ required: true, len: 6, message: "请输入6位验证码" }]}>
              <Input autoComplete="off" placeholder="验证码" maxLength={6} />
            </Form.Item>
            <Form.Item
              name="new_password"
              rules={[
                { required: true, min: 8, message: "密码至少8位" },
                { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: "须包含大小写字母和数字" },
              ]}
            >
              <Input.Password autoComplete="off" prefix={<LockOutlined />} placeholder="新密码" />
            </Form.Item>
            <Form.Item
              name="confirm_password"
              dependencies={["new_password"]}
              rules={[
                { required: true, message: "请确认密码" },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("new_password") === value) return Promise.resolve();
                    return Promise.reject(new Error("两次密码不一致"));
                  },
                }),
              ]}
            >
              <Input.Password autoComplete="off" prefix={<LockOutlined />} placeholder="确认密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                重置密码
              </Button>
            </Form.Item>
          </Form>
        )}
      </Card>
    </div>
  );
}
