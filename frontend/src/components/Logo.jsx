export default function Logo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block', flexShrink: 0 }}
      aria-label="DiabetesSense Logo"
    >
      <defs>
        <linearGradient id="dsLogoGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="50%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="dsDropGrad" x1="12" y1="6" x2="28" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Rounded squircle tile */}
      <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#dsLogoGrad)" />
      
      {/* Subtle glass overlay */}
      <rect x="2" y="2" width="36" height="18" rx="10" fill="#ffffff" fillOpacity="0.12" />

      {/* Stylized Droplet Silhouette */}
      <path
        d="M20 8C20 8 12 17 12 22.5C12 26.9 15.6 30.5 20 30.5C24.4 30.5 28 26.9 28 22.5C28 17 20 8 20 8Z"
        fill="url(#dsDropGrad)"
      />

      {/* Electrocardiogram Heartbeat & Glucose Pulse */}
      <path
        d="M13 22.5H16.2L18.2 16.5L21.8 28.5L23.8 20.5L25 22.5H27"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Central Biomarker Focus Dot */}
      <circle cx="20" cy="11.5" r="1.8" fill="#ffffff" />
    </svg>
  )
}
