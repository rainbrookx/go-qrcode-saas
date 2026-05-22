"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Form, Input, Button, message, Card } from "antd";
import { MailOutlined, LockOutlined } from "@ant-design/icons";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5]">
      <Card style={{ width: 400, borderRadius: 8 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: "#141414", textAlign: "center", marginBottom: 24 }}>
          找回密码
        </h2>

        {step === "email" ? (
          <Form layout="vertical" onFinish={handleSendCode} size="middle">
            <Form.Item name="email" rules={[{ required: true, type: "email", message: "请输入有效邮箱" }]}>
              <Input prefix={<MailOutlined />} placeholder="注册邮箱" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                发送验证码
              </Button>
            </Form.Item>
            <div className="text-center">
              <Button type="link" onClick={() => router.push("/login")}>返回登录</Button>
            </div>
          </Form>
        ) : (
          <Form layout="vertical" onFinish={handleReset} size="middle">
            <div style={{ marginBottom: 12, fontSize: 14, color: "#8c8c8c", textAlign: "center" }}>
              验证码已发送至 {email}
            </div>
            <Form.Item name="code" rules={[{ required: true, len: 6, message: "请输入6位验证码" }]}>
              <Input placeholder="验证码" maxLength={6} />
            </Form.Item>
            <Form.Item
              name="new_password"
              rules={[
                { required: true, min: 8, message: "密码至少8位" },
                { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: "须包含大小写字母和数字" },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="新密码" />
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
              <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
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
