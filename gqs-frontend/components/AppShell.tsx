"use client";

import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Header />
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {children}
        </div>
        <Footer />
      </div>
    </ConfigProvider>
  );
}
