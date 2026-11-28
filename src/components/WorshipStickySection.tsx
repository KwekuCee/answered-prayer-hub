import React, { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Music, Disc, Volume2, VolumeX } from "lucide-react";
import { useScroll, useTransform } from "framer-motion";
import choristerCutout from "@/assets/images/chorister-cutout.webp";
import choristerImg from "@/assets/images/loveworld_chorister.webp";

export const WORSHIP_SONGS = [
  {
    id: 1,
    title: "I'm Satisfied in Your Love",
    artist: "Loveworld Music & Arts",
    album: "Korle Bu Stands in Worship 2026",
    duration: "4:45",
    audioUrl: "/audio/track-1-satisfied-in-love.wav",
  },
  {
    id: 2,
    title: "The Great I Am",
    artist: "Loveworld Singers",
    album: "Korle Bu Stands in Worship Live",
    duration: "5:20",
    audioUrl: "/audio/track-2-the-great-i-am.wav",
  },
  {
    id: 3,
    title: "You Are Great",
    artist: "Loveworld Classics",
    album: "Worship & Glory",
    duration: "6:10",
    audioUrl: "/audio/track-3-you-are-great.wav",
  },
  {
    id: 4,
    title: "Awesome God",
    artist: "Korle Bu Mass Choir",
    album: "Stands in Worship Hymns",
    duration: "4:55",
    audioUrl: "/audio/track-4-awesome-god.wav",
  },
  {
    id: 5,
    title: "Holy Are You Lord",
    artist: "Loveworld Worship Ministers",
    album: "Divine Encounter Anthem",
    duration: "5:12",
    audioUrl: "/audio/track-5-holy-are-you-lord.wav",
  },
] as const;

type AudioCtxCtor = typeof AudioContext;

function getAudioContextCtor(): AudioCtxCtor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioCtxCtor }).webkitAudioContext ||
    null
  );
}

export const WorshipStickySection = () => {
  const [activeSongIndex, setActiveSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isInSection, setIsInSection] = useState(false);
  const [needsTapToUnlock, setNeedsTapToUnlock] = useState(false);
  const [pos, setPos] = useState(0);

  const sectionRef = useRef<HTMLDivElement>(null);

  // Web Audio pre-decoded cache + instant mobile playback refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const buffersRef = useRef<Map<number, AudioBuffer>>(new Map());
  const rawAudioBytesRef = useRef<Map<number, ArrayBuffer>>(new Map());
  const pendingFetchesRef = useRef<Map<number, Promise<AudioBuffer | null>>>(new Map());

  // HTMLAudioElement preloaded fallback per track (if WebAudio decode fails)
  const fallbackElementsRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const activeFallbackRef = useRef<HTMLAudioElement | null>(null);

  // Latest state refs so scroll/fetch callbacks never hold stale closures
  const activeIndexRef = useRef(0);
  const isInSectionRef = useRef(false);
  const userPausedRef = useRef(false);
  const isMutedRef = useRef(false);
  const playingIndexRef = useRef<number | null>(null);

  const getOrCreateAudioContext = useCallback((): AudioContext | null => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctor = getAudioContextCtor();
    if (!Ctor) return null;
    const ctx = new Ctor();
    const gain = ctx.createGain();
    gain.gain.value = isMutedRef.current ? 0 : 1;
    gain.connect(ctx.destination);
    audioCtxRef.current = ctx;
    gainNodeRef.current = gain;
    return ctx;
  }, []);

  const stopAllAudio = useCallback(() => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.onended = null;
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch {
        // already stopped
      }
      activeSourceRef.current = null;
    }
    if (activeFallbackRef.current) {
      try {
        activeFallbackRef.current.pause();
        activeFallbackRef.current.currentTime = 0;
      } catch {
        // ignore
      }
      activeFallbackRef.current = null;
    }
    playingIndexRef.current = null;
  }, []);

  const ensureTrackLoaded = useCallback(
    (index: number): Promise<AudioBuffer | null> => {
      const existingBuffer = buffersRef.current.get(index);
      if (existingBuffer) return Promise.resolve(existingBuffer);

      const inflight = pendingFetchesRef.current.get(index);
      if (inflight) return inflight;

      const song = WORSHIP_SONGS[index];
      if (!song) return Promise.resolve(null);

      // Prepare preloaded HTMLAudio fallback as well
      if (typeof window !== "undefined" && !fallbackElementsRef.current.has(index)) {
        const el = new Audio(song.audioUrl);
        el.preload = "auto";
        el.loop = true;
        el.muted = isMutedRef.current;
        fallbackElementsRef.current.set(index, el);
      }

      const promise = (async () => {
        try {
          let raw = rawAudioBytesRef.current.get(index);
          if (!raw) {
            const res = await fetch(song.audioUrl, { cache: "force-cache" });
            if (!res.ok) return null;
            raw = await res.arrayBuffer();
            rawAudioBytesRef.current.set(index, raw);
          }

          const ctx = getOrCreateAudioContext();
          if (!ctx) return null;

          // decodeAudioData detaches the ArrayBuffer, so pass a slice
          const decoded = await ctx.decodeAudioData(raw.slice(0));
          buffersRef.current.set(index, decoded);
          return decoded;
        } catch {
          return null;
        } finally {
          pendingFetchesRef.current.delete(index);
        }
      })();

      pendingFetchesRef.current.set(index, promise);
      return promise;
    },
    [getOrCreateAudioContext]
  );

  const playTrack = useCallback(
    async (index: number) => {
      if (playingIndexRef.current === index && (activeSourceRef.current || activeFallbackRef.current)) {
        return;
      }

      stopAllAudio();

      const ctx = getOrCreateAudioContext();
      if (ctx && ctx.state === "suspended") {
        try {
          await ctx.resume();
        } catch {
          // waiting for user gesture
        }
      }

      // 1. Instant 0ms path: already pre-decoded AudioBuffer in RAM
      const readyBuffer = buffersRef.current.get(index);
      if (
        readyBuffer &&
        ctx &&
        ctx.state === "running" &&
        gainNodeRef.current &&
        activeIndexRef.current === index &&
        isInSectionRef.current &&
        !userPausedRef.current
      ) {
        const source = ctx.createBufferSource();
        source.buffer = readyBuffer;
        source.loop = true;
        source.connect(gainNodeRef.current);
        source.start(0);
        activeSourceRef.current = source;
        playingIndexRef.current = index;
        setIsPlaying(true);
        setNeedsTapToUnlock(false);
        return;
      }

      // Kick off background decode for instant future switches on this track
      ensureTrackLoaded(index);

      // 2. Immediate streaming path via preloaded HTMLAudioElement (starts playing before full file finishes downloading)
      const fallback =
        fallbackElementsRef.current.get(index) || new Audio(WORSHIP_SONGS[index].audioUrl);
      fallback.loop = true;
      fallback.muted = isMutedRef.current;
      fallback.currentTime = 0;
      fallbackElementsRef.current.set(index, fallback);

      try {
        await fallback.play();
        if (activeIndexRef.current !== index || !isInSectionRef.current || userPausedRef.current) {
          fallback.pause();
          return;
        }
        activeFallbackRef.current = fallback;
        playingIndexRef.current = index;
        setIsPlaying(true);
        setNeedsTapToUnlock(false);
      } catch {
        setIsPlaying(false);
        setNeedsTapToUnlock(true);
      }
    },
    [ensureTrackLoaded, getOrCreateAudioContext, stopAllAudio]
  );

  // Pre-fetch and decode Track 0 immediately on mount, then preload Tracks 1..4 concurrently
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureTrackLoaded(0);
      if (cancelled) return;
      for (let i = 1; i < WORSHIP_SONGS.length; i++) {
        ensureTrackLoaded(i);
      }
    })();

    return () => {
      cancelled = true;
      stopAllAudio();
    };
  }, [ensureTrackLoaded, stopAllAudio]);

  // Global first-gesture silent AudioContext unlock for iOS Safari & Android Chrome
  useEffect(() => {
    const unlockAudioOnFirstGesture = () => {
      const ctx = getOrCreateAudioContext();
      if (!ctx) return;

      if (ctx.state === "suspended") {
        ctx
          .resume()
          .then(() => {
            // Play a 1-sample silent buffer inside the user gesture to cement mobile Safari unlock
            try {
              const silentBuffer = ctx.createBuffer(1, 1, 22050);
              const src = ctx.createBufferSource();
              src.buffer = silentBuffer;
              src.connect(ctx.destination);
              src.start(0);
            } catch {
              // ignore
            }
            setNeedsTapToUnlock(false);
            if (isInSectionRef.current && !userPausedRef.current && playingIndexRef.current === null) {
              playTrack(activeIndexRef.current);
            }
          })
          .catch(() => {
            // still suspended
          });
      } else {
        setNeedsTapToUnlock(false);
        if (isInSectionRef.current && !userPausedRef.current && playingIndexRef.current === null) {
          playTrack(activeIndexRef.current);
        }
      }
    };

    const events: (keyof WindowEventMap)[] = ["touchstart", "pointerdown", "click", "keydown"];
    events.forEach((evt) => window.addEventListener(evt, unlockAudioOnFirstGesture, { passive: true }));
    return () => {
      events.forEach((evt) => window.removeEventListener(evt, unlockAudioOnFirstGesture));
    };
  }, [getOrCreateAudioContext, playTrack]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const songIndexTransform = useTransform(scrollYProgress, [0, 0.9], [0, WORSHIP_SONGS.length - 1]);
  const wheelPos = useTransform(scrollYProgress, [0, 0.9], [0, WORSHIP_SONGS.length - 1]);

  useEffect(() => wheelPos.on("change", setPos), [wheelPos]);

  // Monitor viewport bounds: trigger instant play when entering, stop immediately when leaving
  useEffect(() => {
    const handleScrollBounds = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const inView = rect.top <= window.innerHeight * 0.45 && rect.bottom >= window.innerHeight * 0.25;

      const wasInView = isInSectionRef.current;
      isInSectionRef.current = inView;
      setIsInSection(inView);

      if (inView && !wasInView) {
        if (!userPausedRef.current) {
          playTrack(activeIndexRef.current);
        }
      } else if (!inView && wasInView) {
        stopAllAudio();
        setIsPlaying(false);
        userPausedRef.current = false;
      }
    };

    window.addEventListener("scroll", handleScrollBounds, { passive: true });
    handleScrollBounds();
    return () => window.removeEventListener("scroll", handleScrollBounds);
  }, [playTrack, stopAllAudio]);

  // Instant track transition on scroll
  useEffect(() => {
    return songIndexTransform.on("change", (latest) => {
      const idx = Math.min(WORSHIP_SONGS.length - 1, Math.max(0, Math.round(latest)));
      if (activeIndexRef.current !== idx) {
        activeIndexRef.current = idx;
        setActiveSongIndex(idx);
        userPausedRef.current = false;
        if (isInSectionRef.current) {
          playTrack(idx);
        }
      }
    });
  }, [songIndexTransform, playTrack]);

  const togglePlay = async () => {
    if (isPlaying) {
      userPausedRef.current = true;
      stopAllAudio();
      setIsPlaying(false);
    } else {
      userPausedRef.current = false;
      isInSectionRef.current = true;
      setIsInSection(true);
      await playTrack(activeIndexRef.current);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    isMutedRef.current = nextMuted;
    setIsMuted(nextMuted);
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setValueAtTime(nextMuted ? 0 : 1, audioCtxRef.current.currentTime);
    }
    if (activeFallbackRef.current) {
      activeFallbackRef.current.muted = nextMuted;
    }
  };

  return (
    <section
      ref={sectionRef}
      data-testid="worship-sticky-section"
      data-active-song={activeSongIndex}
      data-playing={isPlaying ? "true" : "false"}
      style={{ height: `${(WORSHIP_SONGS.length + 1) * 100}vh` }}
      className="relative"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* Full-section photo background (WebP) */}
        <img
          src={choristerImg}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm"
        />
        <div className="absolute inset-0 bg-background/80" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-background/90" />

        <div className="relative max-w-7xl mx-auto h-full max-h-screen min-h-0 overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-center gap-6 px-4 sm:px-6 pt-24 pb-6">
          {/* Singer cut-out strictly fitted within sticky viewport */}
          <div
            data-testid="worship-cutout-wrapper"
            className="hidden lg:flex lg:col-span-5 h-full max-h-[calc(100vh-7.5rem)] min-h-0 items-end justify-center pointer-events-none overflow-hidden"
          >
            <img
              src={choristerCutout}
              alt="Loveworld chorister"
              data-testid="worship-cutout-img"
              loading="lazy"
              decoding="async"
              className="max-h-[68vh] xl:max-h-[75vh] max-w-full w-auto h-auto object-contain object-bottom drop-shadow-2xl select-none"
            />
          </div>

          <div className="lg:col-span-7 min-w-0 space-y-5 md:space-y-6 pb-6 lg:pb-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-gold text-xs uppercase tracking-[0.3em] font-semibold">
                  <Music className="w-4 h-4" /> Live Scroll Worship Stream
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-display font-bold text-foreground mt-2 leading-[1.08]">
                  Anointed <span className="bg-gradient-gold bg-clip-text text-transparent italic">Worship Anthems</span>
                </h2>
              </div>

              <button
                type="button"
                onClick={toggleMute}
                className="p-3 rounded-full bg-zinc-900/80 border border-gold/30 text-gold hover:bg-gold/10 transition-colors shrink-0"
                title={isMuted ? "Unmute audio" : "Mute audio"}
                aria-label={isMuted ? "Unmute audio" : "Mute audio"}
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
            </div>

            {needsTapToUnlock && isInSection && (
              <button
                type="button"
                onClick={() => {
                  userPausedRef.current = false;
                  playTrack(activeIndexRef.current);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold text-navy text-xs font-bold shadow-gold transition-transform active:scale-95"
              >
                <Volume2 className="w-3.5 h-3.5" /> Tap to Enable Live Worship Audio
              </button>
            )}

            {/* Scroll wheel */}
            <div
              className="relative h-[340px] sm:h-[360px] overflow-hidden"
              style={{
                perspective: 1000,
                WebkitMaskImage:
                  "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
              }}
            >
              {WORSHIP_SONGS.map((song, idx) => {
                const d = idx - pos;
                const isActive = idx === activeSongIndex;
                const ad = Math.abs(d);
                return (
                  <div
                    key={song.id}
                    className={`absolute left-0 right-0 top-1/2 rounded-2xl border p-4 sm:p-5 flex items-center gap-4 backdrop-blur-xl transition-colors ${
                      isActive ? "border-gold bg-card/90 shadow-gold" : "border-border bg-card/50"
                    }`}
                    style={{
                      transform: `translateY(calc(-50% + ${d * 105}px)) rotateX(${-d * 22}deg) scale(${
                        1 - Math.min(ad, 3) * 0.08
                      })`,
                      opacity: Math.max(0, 1 - ad * 0.35),
                      zIndex: 10 - Math.round(ad),
                      pointerEvents: isActive ? "auto" : "none",
                    }}
                  >
                    <div
                      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-gold flex items-center justify-center shrink-0 ${
                        isActive && isPlaying ? "animate-spin" : ""
                      }`}
                      style={{ animationDuration: "6s" }}
                    >
                      <Disc className="w-6 h-6 sm:w-7 sm:h-7 text-navy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold text-gold uppercase tracking-widest">
                        Track {idx + 1} of {WORSHIP_SONGS.length} · {song.duration}
                      </span>
                      <h3 className="text-base sm:text-lg md:text-xl font-display font-bold text-foreground truncate">
                        {song.title}
                      </h3>
                      <p className="text-xs text-muted-foreground font-body truncate">
                        {song.artist} • {song.album}
                      </p>
                    </div>
                    {isActive && (
                      <button
                        type="button"
                        onClick={togglePlay}
                        aria-label={isPlaying ? "Pause" : "Play"}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gold text-navy flex items-center justify-center shrink-0 active:scale-95"
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 fill-current" />
                        ) : (
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              {WORSHIP_SONGS.map((s, i) => (
                <div
                  key={s.id}
                  className={`h-1 rounded-full transition-all ${
                    i === activeSongIndex ? "w-10 bg-gold" : "w-4 bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorshipStickySection;
