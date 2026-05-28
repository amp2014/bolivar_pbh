// ── Inline SVG icon components (Lucide-style, 24px viewBox, stroked) ──────────
const Icon = ({ d, d2, size = 24, circle, rect, extra }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round">
    {circle && <circle {...circle} />}
    {rect && <rect {...rect} />}
    {d && <path d={d} />}
    {d2 && <path d={d2} />}
    {extra}
  </svg>
)

const HomeIcon    = (s) => <Icon size={s} d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" d2="M9 21V12h6v9" />
const CalendarIcon = (s) => <Icon size={s} rect={{ x:3, y:4, width:18, height:18, rx:2 }} d="M16 2v4M8 2v4M3 10h18" />
const FishIcon    = (s) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 12c0 0-4-6-9-6s-9 6-9 6 4 6 9 6 9-6 9-6z" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M20 12l2-3" />
    <path d="M20 12l2 3" />
  </svg>
)
const MapPinIcon  = (s) => <Icon size={s} d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" circle={{ cx:12, cy:9, r:3 }} />
const CameraIcon  = (s) => <Icon size={s} d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" circle={{ cx:12, cy:13, r:4 }} />
const BuildingIcon = (s) => <Icon size={s} d="M12 2L2 7l10 5 10-5-10-5z" d2="M2 17l10 5 10-5M2 12l10 5 10-5" />
const KeyRoundIcon = (s) => <Icon size={s} d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
const PhoneIcon   = (s) => <Icon size={s} d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 9.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 5.96 5.96l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21 17z" />
const ShieldIcon  = (s) => <Icon size={s} d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />

// ── Feature registry ────────────────────────────────────────────────────────
export const FEATURES = {
  home: {
    key: 'home',
    label: 'Home',
    icon: HomeIcon,
    route: '/',
    roles: ['all'],
    fixed: true,
  },
  stays: {
    key: 'stays',
    label: 'Stays',
    icon: CalendarIcon,
    route: '/stays',
    roles: ['all'],
  },
  fishing: {
    key: 'fishing',
    label: 'Fishing',
    icon: FishIcon,
    route: '/fishing',
    roles: ['all'],
  },
  local: {
    key: 'local',
    label: 'Local',
    icon: MapPinIcon,
    route: '/local',
    roles: ['all'],
  },
  photos: {
    key: 'photos',
    label: 'Photos',
    icon: CameraIcon,
    route: '/photos',
    roles: ['all'],
  },
  house: {
    key: 'house',
    label: 'House',
    icon: BuildingIcon,
    route: '/house',
    roles: ['all'],
  },
  houseInfo: {
    key: 'houseInfo',
    label: 'Info',
    icon: KeyRoundIcon,
    route: '/info',
    roles: ['family', 'admin'],
  },
  emergency: {
    key: 'emergency',
    label: 'Emergency',
    icon: PhoneIcon,
    route: '/emergency',
    roles: ['all'],
  },
  admin: {
    key: 'admin',
    label: 'Admin',
    icon: ShieldIcon,
    route: '/admin',
    roles: ['admin'],
  },
}

// Ordered array preserving display order (home always first)
export const FEATURES_LIST = [
  FEATURES.home,
  FEATURES.stays,
  FEATURES.fishing,
  FEATURES.local,
  FEATURES.photos,
  FEATURES.house,
  FEATURES.houseInfo,
  FEATURES.emergency,
  FEATURES.admin,
]
