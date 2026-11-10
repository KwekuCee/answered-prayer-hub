# Redesign Hero + Worship Anthems section

## 1. Hero (cinematic)
- Full-screen background video edge to edge, darker navy-to-black gradient overlay for depth.
- Large bold Playfair title "100% Answered Prayer" centered low on screen, short gold tagline, two clear buttons (Register / Sign Up as Inviter).
- Minimal text, slow fade-in and subtle zoom animation, small "scroll" cue at the bottom.
- Keep the existing video file and registration tabs below working as today.

## 2. Anointed Worship Anthems
- Chorister photo becomes the full background of the whole section (blurred/darkened version of the photo).
- The singer is cut out of the photo (transparent background image generated from the existing photo) and stands on top, alone, on the left side.
- Playlist becomes a vertical "wheel": the 5 songs sit on a curved rotating list; the active song is centered, large and bright, neighbours tilt and fade above/below.
- Sticky scroll: the section pins in place while scrolling turns the wheel one song at a time (song 1 to 5). Only after the 5th song does the page continue scrolling to the next sections.
- Keep 5 songs, play/pause button and auto-play behaviour as now.

## Technical details
- Use image edit tool with transparent background on `loveworld_chorister_*.jpg` to produce `chorister-cutout.png`.
- `WorshipStickySection.tsx`: section height ~ (songs+1)*100vh, sticky inner `top-0 h-screen`; framer-motion `useScroll` progress mapped to wheel rotation (rotateX per item, translateY, opacity, scale based on distance from active index).
- `HeroSection.tsx`: restructure layout only; semantic tokens, no logic changes.
