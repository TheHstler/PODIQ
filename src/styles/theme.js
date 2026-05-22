/* ─────────────────────────────────────────────────────────────────────────────
   src/styles/theme.js
   Shared design tokens for PodPlayer dark theme.
   Import this into any page: import { colors, fonts, effects } from '../styles/theme';
───────────────────────────────────────────────────────────────────────────── */

/* ── COLOUR PALETTE ── */
export const colors = {
  /* Backgrounds */
  bg:           "#0F0F12",
  bgCard:       "#1A1A20",
  bgCardHover:  "#22222A",
  bgInput:      "#16161C",
  bgGlass:      "rgba(255,255,255,0.04)",

  /* Accents */
  purple:       "#8B5CF6",
  purpleLight:  "#A78BFA",
  purpleDim:    "rgba(139,92,246,0.15)",
  purpleDimHover: "rgba(139,92,246,0.25)",
  teal:         "#6EE7B7",
  blue:         "#60A5FA",
  amber:        "#F59E0B",
  red:          "#EF4444",

  /* Text */
  textPrimary:  "#FFFFFF",
  textSecondary:"#B3B3B3",
  textMuted:    "#6B6B7A",

  /* Borders */
  border:       "rgba(255,255,255,0.07)",
  borderAccent: "rgba(139,92,246,0.4)",
};

/* ── TYPOGRAPHY ── */
export const fonts = {
  heading: "'Manrope', 'Inter', sans-serif",
  body:    "'Inter', sans-serif",
  mono:    "'JetBrains Mono', 'Fira Code', monospace",
};

/* ── SHADOWS & EFFECTS ── */
export const effects = {
  cardShadow:   "0 4px 24px rgba(0,0,0,0.4)",
  glowPurple:   "0 0 40px rgba(139,92,246,0.2)",
  glowPurpleSm: "0 0 16px rgba(139,92,246,0.3)",
  textGlow:     "0 0 30px rgba(139,92,246,0.4)",
};

/* ── REUSABLE COMPONENT STYLES ── */

/* Standard dark card */
export const card = {
  background:   colors.bgCard,
  border:       `1px solid ${colors.border}`,
  borderRadius: "16px",
  boxShadow:    effects.cardShadow,
};

/* Purple accent button */
export const btnPrimary = {
  background:   colors.purple,
  color:        "#fff",
  border:       "none",
  borderRadius: "10px",
  padding:      "0.65rem 1.4rem",
  fontWeight:   "600",
  fontSize:     "0.9rem",
  cursor:       "pointer",
  fontFamily:   fonts.body,
  transition:   "all 0.2s",
  boxShadow:    effects.glowPurpleSm,
};

/* Ghost/outline button */
export const btnGhost = {
  background:   "transparent",
  color:        colors.purpleLight,
  border:       `1.5px solid ${colors.borderAccent}`,
  borderRadius: "10px",
  padding:      "0.6rem 1.2rem",
  fontWeight:   "600",
  fontSize:     "0.85rem",
  cursor:       "pointer",
  fontFamily:   fonts.body,
  transition:   "all 0.2s",
};

/* Dark input field */
export const input = {
  background:   colors.bgInput,
  border:       `1px solid ${colors.border}`,
  borderRadius: "10px",
  color:        colors.textPrimary,
  fontSize:     "0.92rem",
  fontFamily:   fonts.body,
  outline:      "none",
  padding:      "0.65rem 1rem",
};

/* Timestamp badge */
export const timeBadge = {
  background:   colors.purpleDim,
  color:        colors.purpleLight,
  padding:      "0.15rem 0.5rem",
  borderRadius: "4px",
  fontSize:     "0.7rem",
  fontFamily:   fonts.mono,
  whiteSpace:   "nowrap",
};

/* Small type badge (person / company etc) */
export const typeBadge = {
  background:   colors.purple,
  color:        "#fff",
  fontSize:     "0.6rem",
  fontWeight:   "700",
  letterSpacing:"0.1em",
  textTransform:"uppercase",
  padding:      "0.2rem 0.55rem",
  borderRadius: "20px",
};

/* Sticky nav bar */
export const nav = {
  display:        "flex",
  alignItems:     "center",
  justifyContent: "space-between",
  padding:        "1rem 2.5rem",
  background:     "rgba(15,15,18,0.85)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderBottom:   `1px solid ${colors.border}`,
  position:       "sticky",
  top:            0,
  zIndex:         200,
};

/* Google Fonts import — paste this <link> into public/index.html <head> */
export const FONT_LINK = `<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;
