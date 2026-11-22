// Simple 1.6px-stroke line icons (SF Symbols-ish). One consistent weight.
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const make = (paths) =>
  function Icon(props) {
    return (
      <svg {...base} {...props}>
        {paths}
      </svg>
    );
  };

export const IconHome = make(<path d="M4 11l8-7 8 7M6 9.5V20h12V9.5" />);
export const IconChat = make(
  <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 4v-4h0A1.5 1.5 0 0 1 4 14.5v-9z" />
);
export const IconDoc = make(
  <>
    <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z" />
    <path d="M14 3.5V8h4M8.5 12.5h7M8.5 15.5h7" />
  </>
);
export const IconPlus = make(<path d="M12 5v14M5 12h14" />);
export const IconSend = make(<path d="M12 19V5M6 11l6-6 6 6" />);
export const IconTrash = make(
  <path d="M4.5 7h15M10 7V4.5h4V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12M10 11v5M14 11v5" />
);
export const IconUpload = make(
  <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
);
export const IconCopy = make(
  <>
    <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
    <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
  </>
);
export const IconCheck = make(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconClose = make(<path d="M6 6l12 12M18 6L6 18" />);
export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </>
);
export const IconMenu = make(<path d="M4 7h16M4 12h16M4 17h16" />);
export const IconArrowRight = make(<path d="M5 12h14M13 6l6 6-6 6" />);
export const IconChevronLeft = make(<path d="M15 5l-7 7 7 7" />);
export const IconChevronRight = make(<path d="M9 5l7 7-7 7" />);
export const IconRefresh = make(
  <path d="M19.5 12a7.5 7.5 0 1 1-2.3-5.4M19.5 4.5v4h-4" />
);
export const IconAlert = make(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.8v5M12 16.2v.01" />
  </>
);
export const IconDown = make(<path d="M12 5v14M6 13l6 6 6-6" />);
export const IconFile = make(
  <>
    <path d="M7 3.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9.5A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z" />
    <path d="M14 3.5V8h4" />
  </>
);
