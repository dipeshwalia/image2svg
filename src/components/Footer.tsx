export default function Footer() {
  return (
    <footer
      style={{
        padding: "20px 24px 16px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
      }}
    >
      {/* GitHub — big CTA */}
      <a
        href="https://github.com/dipeshwalia/image2svg"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          color: "var(--text-primary)",
          textDecoration: "none",
          fontSize: "13px",
          fontWeight: 600,
          transition: "all 150ms ease",
          width: "100%",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--accent)";
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)";
          (e.currentTarget as HTMLAnchorElement).style.background = "var(--accent-subtle)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--border)";
          (e.currentTarget as HTMLAnchorElement).style.color = "var(--text-primary)";
          (e.currentTarget as HTMLAnchorElement).style.background = "var(--bg-surface)";
        }}
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
        </svg>
        dipeshwalia/image2svg
      </a>

      {/* Credit — small */}
      <p
        style={{
          fontSize: "10px",
          color: "var(--text-tertiary)",
          margin: 0,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        Built with ❤️ by{" "}
        <a
          href="https://www.linkedin.com/in/dipeshwalia/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--text-secondary)", textDecoration: "none" }}
        >
          Dipesh
        </a>{" "}
        · Powered by{" "}
        <a
          href="https://github.com/visioncortex/vtracer"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--text-secondary)", textDecoration: "none" }}
        >
          VTracer
        </a>
      </p>
    </footer>
  );
}
