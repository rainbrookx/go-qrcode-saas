"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button, Dropdown, Avatar, Space, Drawer } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  QrcodeOutlined,
  MenuOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "@/lib/store";

const tabs = [
  { key: "/text", label: "文本" },
  { key: "/url", label: "网址静态码" },
  { key: "/urldyn", label: "网址跳转码" },
  { key: "/article", label: "文章" },
  { key: "/form", label: "表单" },
  { key: "/deqr", label: "解码" },
  { key: "/about", label: "关于" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/login");
    setDrawerOpen(false);
  };

  const navigate = (path: string) => {
    router.push(path);
    setDrawerOpen(false);
  };

  return (
    <header
      className="px-4 md:px-6"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        borderBottom: "1px solid #f0f0f0",
        background: "#fff",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div className="min-w-0" style={{ display: "flex", alignItems: "center", gap: 32 }}>
        <a
          href="/text"
          className="min-w-0 truncate"
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
        {/* Desktop nav */}
        <nav className="hidden md:flex" style={{ gap: 2 }}>
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

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Desktop user area */}
        <div className="hidden md:block">
          {user ? (
            <Dropdown
              menu={{
                items: [
                  { key: "profile", label: "个人中心", onClick: () => router.push("/profile") },
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

        {/* Mobile: avatar or login + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          {user ? (
            <Avatar size={28} icon={<UserOutlined />} />
          ) : (
            <Button type="primary" size="small" onClick={() => navigate("/login")}>
              登录
            </Button>
          )}
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: 18 }} />}
            onClick={() => setDrawerOpen(true)}
          />
        </div>
      </div>

      {/* Mobile Drawer */}
      <Drawer
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <QrcodeOutlined style={{ color: "#1677FF" }} />
            QR Code SaaS
          </div>
        }
        placement="right"
        size="default"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        styles={{ body: { padding: "8px 0" } }}
      >
        <nav style={{ display: "flex", flexDirection: "column" }}>
          {tabs.map((tab) => {
            const active = pathname === tab.key;
            return (
              <Button
                key={tab.key}
                type="text"
                block
                onClick={() => navigate(tab.key)}
                style={{
                  textAlign: "left",
                  height: 44,
                  fontSize: 15,
                  color: active ? "#1677FF" : "#434343",
                  fontWeight: active ? 600 : 400,
                  background: active ? "#f0f5ff" : undefined,
                }}
              >
                {tab.label}
              </Button>
            );
          })}
        </nav>
        {user && (
          <>
            <div style={{ borderTop: "1px solid #f0f0f0", margin: "8px 0" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <Button
                type="text"
                block
                onClick={() => navigate("/profile")}
                style={{ textAlign: "left", height: 44, fontSize: 15, color: "#434343" }}
              >
                个人中心
              </Button>
              <Button
                type="text"
                block
                onClick={() => navigate("/codes")}
                style={{ textAlign: "left", height: 44, fontSize: 15, color: "#434343" }}
              >
                我的活码
              </Button>
              <Button
                type="text"
                block
                danger
                onClick={handleLogout}
                style={{ textAlign: "left", height: 44, fontSize: 15 }}
              >
                退出登录
              </Button>
            </div>
          </>
        )}
      </Drawer>
    </header>
  );
}
