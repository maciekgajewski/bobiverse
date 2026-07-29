import type { BrowserGroupId } from "../narrative/browser";

const sharedIconProps = {
  "aria-hidden": true,
  fill: "none",
  focusable: "false",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.6,
  viewBox: "0 0 24 24",
} as const;

export function ObjectGroupIcon({ type }: { type: BrowserGroupId }) {
  let drawing;
  switch (type) {
    case "characters":
      drawing = (
        <>
          <circle cx="9" cy="8" r="3" />
          <path d="M3.8 18.5c.7-3.2 2.4-5 5.2-5s4.5 1.8 5.2 5" />
          <circle cx="17.2" cy="9" r="2.2" />
          <path d="M15.3 14.1c2.9-.7 4.8.8 5.2 3.6" />
        </>
      );
      break;
    case "events":
      drawing = (
        <>
          <rect x="4" y="5.5" width="16" height="14" rx="2" />
          <path d="M8 3.5v4M16 3.5v4M4 9.5h16" />
          <path d="m12 12 .8 1.8 2 .2-1.5 1.3.4 2-1.7-1-1.7 1 .4-2L9.2 14l2-.2z" />
        </>
      );
      break;
    case "star-systems":
      drawing = (
        <>
          <circle cx="12" cy="12" r="2.2" />
          <ellipse cx="12" cy="12" rx="9" ry="4.2" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
          <circle
            cx="19.4"
            cy="10.6"
            r=".8"
            fill="currentColor"
            stroke="none"
          />
        </>
      );
      break;
    case "other-locations":
      drawing = (
        <>
          <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
          <circle cx="12" cy="10" r="2.4" />
        </>
      );
      break;
    case "species":
      drawing = (
        <>
          <path d="M7 3c0 7 10 11 10 18M17 3C17 10 7 14 7 21" />
          <path d="M8 6h8M8.5 10h7M8.5 14h7M8 18h8" />
        </>
      );
      break;
    case "technologies":
      drawing = (
        <>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
          <path d="M9 2.5v3M15 2.5v3M9 18.5v3M15 18.5v3M2.5 9h3M2.5 15h3M18.5 9h3M18.5 15h3" />
        </>
      );
      break;
    case "organizations":
      drawing = (
        <>
          <circle cx="12" cy="5" r="2.2" />
          <circle cx="5" cy="18" r="2.2" />
          <circle cx="19" cy="18" r="2.2" />
          <path d="m10.9 6.9-4.8 9M13.1 6.9l4.8 9M7.2 18h9.6" />
        </>
      );
      break;
    case "vessels":
      drawing = (
        <>
          <path d="M12 3c3.6 2.7 5.5 6.2 5.5 10.4L14 17h-4l-3.5-3.6C6.5 9.2 8.4 5.7 12 3Z" />
          <circle cx="12" cy="10" r="2" />
          <path d="m8.5 15-3 2.2v3.3l4.5-3M15.5 15l3 2.2v3.3L14 17.5" />
        </>
      );
      break;
  }
  return (
    <svg {...sharedIconProps} className="group-type-icon" data-icon-type={type}>
      {drawing}
    </svg>
  );
}

export function CollapseIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg {...sharedIconProps} className="collapse-icon" viewBox="0 0 12 12">
      <path d={expanded ? "m2.5 4 3.5 3.5L9.5 4" : "m4 2.5 3.5 3.5L4 9.5"} />
    </svg>
  );
}

export function ObjectItemBullet({ active }: { active: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`object-item-bullet ${active ? "active" : ""}`}
      data-item-bullet=""
      fill="none"
      focusable="false"
      stroke="currentColor"
      viewBox="0 0 12 12"
    >
      <circle cx="6" cy="6" r="3.5" strokeWidth="1.2" />
      <circle cx="6" cy="6" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
