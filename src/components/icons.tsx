// Small inline SVG icons shared by the application chrome.

export function ShieldIcon() {
  return (
    <svg className="shield-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5 20 6v5.6c0 4.7-3.2 8.7-8 9.9-4.8-1.2-8-5.2-8-9.9V6l8-3.5Z" />
      <path d="m8.5 12 2.1 2.1 4.9-4.9" />
    </svg>
  );
}

export function ResetViewIcon() {
  return (
    <svg className="reset-view-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.5 11.2 12 4.8l7.5 6.4" />
      <path d="M7 10.4V19h10v-8.6" />
      <path d="M10 19v-5h4v5" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg className="close-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg className="search-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.2" />
      <path d="M16.2 16.2 21 21" />
    </svg>
  );
}

/** Original book mark from the approved design note (24×24, cyan on deep blue). */
export function BookGlyph() {
  return (
    <svg className="book-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.2 5.2c1.25.85 2.55 1.15 4.3 1.15H19.2v12.2h-8.4c-1.7 0-3.05-.28-4.35-1.15V5.2Z"
        fill="rgb(8 28 48)"
        stroke="#7de9ff"
        strokeWidth="1.55"
        strokeLinejoin="round"
      />
      <path
        d="M6.2 5.2c-1.35 0-2.45.55-2.45 1.55v11.15c0 1 1.1 1.55 2.45 1.55"
        fill="none"
        stroke="#7de9ff"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
      <path
        d="M6.2 5.2v12.75"
        fill="none"
        stroke="#7de9ff"
        strokeWidth="1.55"
      />
      <path
        d="M11.4 9.1h5.4M11.4 11.6h5.4M11.4 14.1h3.6"
        fill="none"
        stroke="rgb(125 233 255 / 75%)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg className="chevron-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}
