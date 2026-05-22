"use client";

import CodeList from "@/components/CodeList";

export default function CodesPage() {
  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#141414" }}>我的活码</h3>
      <CodeList />
    </div>
  );
}
