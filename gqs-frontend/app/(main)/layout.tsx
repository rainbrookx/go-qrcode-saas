"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <main
      className="px-4 py-6 md:px-6 md:py-8"
      style={{ flex: 1, maxWidth: 960, width: "100%", margin: "0 auto" }}
    >
      {children}
    </main>
  );
}
