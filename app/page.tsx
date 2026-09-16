@import "tailwindcss";

:root {
  --background: #070b14;
  --surface: #0d1422;
  --surface-2: #111b2d;
  --border: rgba(148, 163, 184, 0.14);
  --text: #f8fafc;
  --muted: #94a3b8;
  --primary: #22d3ee;
  --primary-dark: #0891b2;
  --success: #22c55e;
  --warning: #f59e0b;
  --danger: #ef4444;
}

* {
  box-sizing: border-box;
}

html {
  direction: rtl;
  scroll-behavior: smooth;
}

body {
  margin: 0;
  padding: 0;
  background:
    radial-gradient(
      circle at top right,
      rgba(34, 211, 238, 0.08),
      transparent 30%
    ),
    var(--background);
  color: var(--text);
  font-family:
    Tahoma,
    Arial,
    "Segoe UI",
    sans-serif;
  direction: rtl;
}

button,
input,
textarea,
select {
  font-family: inherit;
}

a {
  color: inherit;
  text-decoration: none;
}

button {
  cursor: pointer;
}

::selection {
  background: rgba(34, 211, 238, 0.25);
}

/* =========================
   Dashboard
========================= */

.dashboard-shell {
  min-height: 100vh;
  background: var(--background);
}

.dashboard-container {
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px;
}

/* Header */

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 22px;
  margin-bottom: 24px;
  background: rgba(13, 20, 34, 0.92);
  border: 1px solid var(--border);
  border-radius: 20px;
  backdrop-filter: blur(16px);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    var(--primary),
    var(--primary-dark)
  );
  color: #001018;
  font-size: 21px;
  font-weight: 900;
  box-shadow: 0 10px 30px rgba(34, 211, 238, 0.2);
}

.brand-text h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.brand-text p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12px;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
}

.user-avatar {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(34, 211, 238, 0.12);
  color: var(--primary);
  font-weight: 800;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.user-name {
  font-size: 13px;
  font-weight: 700;
}

.user-plan {
  color: var(--muted);
  font-size: 11px;
}

/* Layout */

.dashboard-grid {
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  gap: 24px;
  direction: ltr;
}

.dashboard-sidebar,
.dashboard-main {
  direction: rtl;
}

/* Sidebar */

.dashboard-sidebar {
  height: fit-content;
  position: sticky;
  top: 24px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
}

.sidebar-title {
  padding: 8px 10px 14px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 12px 13px;
  border-radius: 12px;
  color: #cbd5e1;
  font-size: 13px;
  transition: 0.2s ease;
}

.sidebar-link:hover,
.sidebar-link.active {
  background: rgba(34, 211, 238, 0.09);
  color: var(--primary);
}

.sidebar-icon {
  width: 28px;
  text-align: center;
  font-size: 16px;
}

/* Main */

.dashboard-main {
  min-width: 0;
}

.welcome-section {
  margin-bottom: 24px;
}

.welcome-section h2 {
  margin: 0;
  font-size: 30px;
  line-height: 1.5;
  font-weight: 900;
}

.welcome-section p {
  margin: 7px 0 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.9;
}

/* Cards */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.stat-card {
  padding: 20px;
  background: linear-gradient(
    145deg,
    rgba(17, 27, 45, 0.95),
    rgba(13, 20, 34, 0.95)
  );
  border: 1px solid var(--border);
  border-radius: 18px;
}

.stat-label {
  color: var(--muted);
  font-size: 12px;
  margin-bottom: 10px;
}

.stat-value {
  font-size: 22px;
  font-weight: 900;
}

.stat-sub {
  margin-top: 7px;
  color: #64748b;
  font-size: 11px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
  gap: 18px;
}

.panel {
  padding: 22px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 20px;
}

.panel-title {
  margin: 0;
  font-size: 17px;
  font-weight: 800;
}

.panel-description {
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.8;
}

/* Account */

.account-list {
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.account-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 13px 0;
  border-bottom: 1px solid var(--border);
}

.account-row:last-child {
  border-bottom: 0;
}

.account-label {
  color: var(--muted);
  font-size: 12px;
}

.account-value {
  max-width: 65%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 700;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--success);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
}

/* Services */

.service-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.service-card {
  min-height: 125px;
  padding: 17px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.025);
  transition: 0.2s ease;
}

.service-card:hover {
  transform: translateY(-2px);
  border-color: rgba(34, 211, 238, 0.3);
  background: rgba(34, 211, 238, 0.04);
}

.service-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  margin-bottom: 12px;
  border-radius: 11px;
  background: rgba(34, 211, 238, 0.09);
  font-size: 18px;
}

.service-title {
  margin: 0 0 5px;
  font-size: 13px;
  font-weight: 800;
}

.service-text {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.8;
}

/* Buttons */

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 17px;
  border: 0;
  border-radius: 11px;
  background: linear-gradient(
    135deg,
    var(--primary),
    var(--primary-dark)
  );
  color: #001018;
  font-size: 12px;
  font-weight: 900;
  transition: 0.2s ease;
}

.primary-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 25px rgba(34, 211, 238, 0.18);
}

/* Mobile */

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 800px) {
  .dashboard-container {
    padding: 14px;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-sidebar {
    position: static;
  }

  .sidebar-menu {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }

  .welcome-section h2 {
    font-size: 24px;
  }
}

@media (max-width: 520px) {
  .dashboard-header {
    padding: 14px;
  }

  .brand-text p {
    display: none;
  }

  .user-info {
    display: none;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .stat-card {
    padding: 15px;
  }

  .stat-value {
    font-size: 18px;
  }

  .sidebar-menu {
    grid-template-columns: 1fr 1fr;
  }

  .service-grid {
    grid-template-columns: 1fr;
  }

  .panel {
    padding: 17px;
  }
}
