"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Header />
      <main style={{ flex: 1, maxWidth: 960, width: "100%", margin: "0 auto", padding: "32px 24px" }}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
