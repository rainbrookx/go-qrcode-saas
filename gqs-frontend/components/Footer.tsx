export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid #f0f0f0",
        padding: "16px 24px",
        textAlign: "center",
        fontSize: 12,
        color: "#8c8c8c",
        background: "#fff",
      }}
    >
      QR Code SaaS — 开源二维码工具 |{" "}
      <a href="https://github.com" target="_blank" rel="noopener noreferrer" style={{ color: "#1677FF" }}>
        GitHub
      </a>
    </footer>
  );
}
