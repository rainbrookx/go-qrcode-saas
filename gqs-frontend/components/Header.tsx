"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button, Dropdown, Avatar, Space } from "antd";
import { UserOutlined, LogoutOutlined, QrcodeOutlined } from "@ant-design/icons";
import { useAuthStore } from "@/lib/store";

const tabs = [
  { key: "/text", label: "文本" },
  { key: "/url", label: "网址静态码" },
  { key: "/urldyn", label: "网址跳转码" },
  { key: "/article", label: "文章" },
  { key: "/form", label: "表单" },
  { key: "/deqr", label: "解码" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header
      style={{
        borderBottom: "1px solid #f0f0f0",
        background: "#fff",
        padding: "0 24px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <a
          href="/text"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 16,
            fontWeight: 600,
            color: "#141414",
            textDecoration: "none",
          }}
        >
          <QrcodeOutlined style={{ fontSize: 20, color: "#1677FF" }} />
          QR Code SaaS
        </a>
        <nav style={{ display: "flex", gap: 2 }}>
          {tabs.map((tab) => {
            const active = pathname === tab.key;
            return (
              <Button
                key={tab.key}
                type="text"
                size="small"
                onClick={() => router.push(tab.key)}
                style={{
                  fontSize: 13,
                  color: active ? "#fff" : undefined,
                  background: active ? "#1677FF" : undefined,
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </nav>
      </div>

      <div>
        {user ? (
          <Dropdown
            menu={{
              items: [
                { key: "codes", label: "我的活码", onClick: () => router.push("/codes") },
                { type: "divider" },
                {
                  key: "logout",
                  label: "退出登录",
                  icon: <LogoutOutlined />,
                  onClick: handleLogout,
                },
              ],
            }}
          >
            <Space style={{ cursor: "pointer", fontSize: 13 }}>
              <Avatar size={28} icon={<UserOutlined />} />
              <span style={{ color: "#434343" }}>{user.email}</span>
            </Space>
          </Dropdown>
        ) : (
          <Button type="primary" size="small" onClick={() => router.push("/login")}>
            登录
          </Button>
        )}
      </div>
    </header>
  );
}
