import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        padding: "16px 24px",
        textAlign: "center",
        borderTop: "1px solid var(--border)",
        fontSize: "12px",
        color: "var(--text-tertiary)",
      }}
    >
      <p>
        Built with ❤️ by{" "}
        <a
          href="https://www.linkedin.com/in/dipeshwalia/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          Dipesh
        </a>{" "}
        · Built with VTracer WASM · Open Source ·{" "}
        <a
          href="https://github.com/visioncortex/vtracer"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent)", textDecoration: "none" }}
        >
          visioncortex/vtracer
        </a>
      </p>
    </footer>
  );
}
