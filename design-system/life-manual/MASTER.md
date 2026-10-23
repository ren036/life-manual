# Life Manual UI

Direction: compact, clear personal utility app, designed for phone use first.
Chosen by the user: modern system-app style with restrained decoration.

## Source and interpretation

Reviewed with [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).
Searches: personal productivity notes compact; utility tool minimal; mobile touch targets compact; React component accessibility state.
Adopted: functional minimalism, semantic controls, legible type, visible focus, shared spacing, restrained state feedback.
The generated landing-page hero and conversion patterns do not fit this PWA. Its Latin font suggestions do not improve Chinese reading. Use the system Chinese sans-serif stack.

## Tokens

Source of truth: src/theme.css. Light: background #F5F6F8, surface #FFFFFF, text #1C2534, muted #5E6B7E, accent #2856C9. Dark: background #111722, surface #1B2432, text #EDF2FA, muted #B0BFD3, accent #A3C1FF.
Blue is reserved for actions and selection. Status colors remain semantic. No large colored hero, paper texture, decorative labels or repeated nested cards.

## Layout and type

- Phone horizontal gutter: 16px, 12px below 360px.
- Title: 25px; section: 17px; record title: 16px; summary: 14px; metadata: 12–13px.
- Header content: at least 44px. Phone page title remains compact.
- Shared surface radius: 12px. Controls: 8–10px. Content surfaces have no decorative shadow.
- One group surface for related records. Separate rows with light dividers.
- Search, filter and sort share one row. The current collection uses a segmented tab bar.
- Prefer 44px tap regions for primary mobile controls, with 8px gaps between adjacent independent controls.
- Fixed bottom navigation includes safe-area padding; content clears it.

## Interaction and empty states

Every operation remains a semantic button. Preserve keyboard focus outlines, loading and disabled states. Use color and opacity feedback without moving content. Respect reduced motion.
Empty states have a short title, one line of useful context and one main action; alternate entry points stay secondary. No sample data is inserted into the user's storage.

## Scope

Routes, data formats, storage and backup behavior are preserved. Keep Mantine and the existing Lucide icon family. App styles live in src/redesign.css; semantic color tokens live in src/theme.css.
