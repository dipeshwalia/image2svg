import Link from "next/link";
import styles from "./page.module.css";
import Footer from "@/components/Footer";

export default function HomePage() {
  return (
    <div className={styles.page}>
      {/* Nav */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <img
              src="/logo.png"
              alt="Image2SVG Logo"
              width={28}
              height={28}
              style={{ borderRadius: "6px" }}
            />
            <span className={styles.logoText}>Image2SVG</span>
          </div>
          <Link href="/editor" className={`btn btn-primary ${styles.navCta}`}>
            Open Editor
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span className={styles.badgeDot} />
            100% Browser-Native · Zero Server
          </div>
          <h1 className={styles.heroTitle}>
            Convert Images to <span className="text-gradient">Vector SVGs</span>
            <br />
            Instantly in Your Browser
          </h1>
          <p className={styles.heroSubtitle}>
            Powered by WebAssembly. Your images never leave your device.
            <br />
            No uploads. No API keys. No limits. Just pure algorithms.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/editor" className="btn btn-primary btn-lg">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
              Start Converting
            </Link>
            <a href="#features" className="btn btn-secondary btn-lg">
              See How It Works
            </a>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>&lt;500ms</span>
              <span className={styles.statLabel}>Avg. conversion</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>100%</span>
              <span className={styles.statLabel}>Private</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>$0</span>
              <span className={styles.statLabel}>Forever free</span>
            </div>
          </div>
        </div>

        {/* Animated demo area */}
        <div className={styles.demoArea}>
          <div className={styles.demoCard}>
            <div className={styles.demoLabel}>Original Image</div>
            <div className={styles.demoPlaceholder}>
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <rect width="80" height="80" rx="8" fill="#1a1a2e" />
                <circle cx="30" cy="28" r="8" fill="#00d4ff" opacity="0.3" />
                <path
                  d="M10 55L25 40L40 50L55 35L70 50V65C70 69.4183 66.4183 73 62 73H18C13.5817 73 10 69.4183 10 65V55Z"
                  fill="#00d4ff"
                  opacity="0.15"
                />
              </svg>
            </div>
          </div>
          <div className={styles.demoArrow}>
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </div>
          <div className={`${styles.demoCard} ${styles.demoCardSvg}`}>
            <div className={styles.demoLabel}>Vector SVG</div>
            <div className={styles.demoPlaceholder}>
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <rect width="80" height="80" rx="8" fill="#1a1a2e" />
                <circle cx="30" cy="28" r="8" stroke="#00d4ff" strokeWidth="1.5" fill="none" />
                <path
                  d="M10 55L25 40L40 50L55 35L70 50V65C70 69.4183 66.4183 73 62 73H18C13.5817 73 10 69.4183 10 65V55Z"
                  stroke="#8b5cf6"
                  strokeWidth="1.5"
                  fill="none"
                />
                {/* Nodes */}
                <circle cx="10" cy="55" r="2.5" fill="#00d4ff" />
                <circle cx="25" cy="40" r="2.5" fill="#00d4ff" />
                <circle cx="40" cy="50" r="2.5" fill="#00d4ff" />
                <circle cx="55" cy="35" r="2.5" fill="#00d4ff" />
                <circle cx="70" cy="50" r="2.5" fill="#00d4ff" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features} id="features">
        <div className={styles.featuresInner}>
          <h2 className={styles.sectionTitle}>Why Image2SVG?</h2>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>⚡</div>
              <h3>Instant</h3>
              <p>
                WebAssembly-powered vectorization runs at near-native speed. Most conversions
                complete in under 500ms.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🔒</div>
              <h3>Private</h3>
              <p>
                Your images never leave your device. Everything happens locally in your browser —
                zero network requests.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>💰</div>
              <h3>Free Forever</h3>
              <p>
                No API keys, no sign-ups, no rate limits, no premium tiers. Open source and free to
                use.
              </p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🌐</div>
              <h3>Works Offline</h3>
              <p>
                Once loaded, works without internet. Install as a PWA for full offline access
                anytime.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
