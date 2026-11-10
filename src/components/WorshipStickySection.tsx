import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Music, Disc } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import choristerCutout from "@/assets/images/chorister-cutout.png";
import choristerImg from "@/assets/images/loveworld_chorister_1794092420351.jpg";

const WORSHIP_SONGS = [
  {
    id: 1,
    title: "I'm Satisfied in Your Love",
    artist: "Loveworld Music & Arts",
    album: "Korle Bu Stands in Worship 2026",
    duration: "4:45",
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg" 
  },
  {
    id: 2,
    title: "The Great I Am",
    artist: "Loveworld Singers",
    album: "Korle Bu Stands in Worship Live",
    duration: "5:20",
    audioUrl: "https://actions.google.com/sounds/v1/weather/light_rain.ogg"
  },
  {
    id: 3,
    title: "You Are Great",
    artist: "Loveworld Classics",
    album: "Worship & Glory",
    duration: "6:10",
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/daytime_forest_bonfire.ogg"
  },
  {
    id: 4,
    title: "Awesome God",
    artist: "Korle Bu Mass Choir",
    album: "Stands in Worship Hymns",
    duration: "4:55",
    audioUrl: "https://actions.google.com/sounds/v1/weather/wind_heavy.ogg"
  },
  {
    id: 5,
    title: "Holy Are You Lord",
    artist: "Loveworld Worship Ministers",
    album: "Divine Encounter Anthem",
    duration: "5:12",
    audioUrl: "https://actions.google.com/sounds/v1/ambiences/outdoor_ambience_train.ogg"
  }
];

export const WorshipStickySection = () => {
  const [activeSongIndex, setActiveSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"]
  });

  // Map scroll progress to active song index (0 to 4)
  const songIndexTransform = useTransform(scrollYProgress, [0, 0.9], [0, WORSHIP_SONGS.length - 1]);

  useEffect(() => {
    return songIndexTransform.onChange((latest) => {
      const idx = Math.min(WORSHIP_SONGS.length - 1, Math.max(0, Math.round(latest)));
      if (idx !== activeSongIndex) {
        setActiveSongIndex(idx);
        setIsPlaying(true);
      }
    });
  }, [songIndexTransform, activeSongIndex]);

  // Handle audio play/pause and auto-stop outside section bounds
  useEffect(() => {
    const handleScrollBounds = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const inView = rect.top <= 0 && rect.bottom >= window.innerHeight;
      if (!inView && rect.top > 0) {
        setIsPlaying(false);
      } else if (rect.bottom < 0) {
        setIsPlaying(false);
      }
    };

    window.addEventListener("scroll", handleScrollBounds, { passive: true });
    return () => window.removeEventListener("scroll", handleScrollBounds);
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch((err) => {
        console.warn("Audio autoplay prevented or failed:", err);
        setIsPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, activeSongIndex]);

  const currentSong = WORSHIP_SONGS[activeSongIndex];

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const wheelPos = useTransform(scrollYProgress, [0, 0.9], [0, WORSHIP_SONGS.length - 1]);
  const [pos, setPos] = useState(0);
  useEffect(() => wheelPos.on("change", setPos), [wheelPos]);

  return (
    <section ref={sectionRef} style={{ height: `${(WORSHIP_SONGS.length + 1) * 100}vh` }} className="relative">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Full-section photo background */}
        <img src={choristerImg} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm" />
        <div className="absolute inset-0 bg-background/75" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-background/90" />

        <div className="relative max-w-7xl mx-auto h-full grid grid-cols-1 lg:grid-cols-2 items-end lg:items-center px-4 pt-20">
          {/* Singer cut-out */}
          <div className="hidden lg:flex h-full items-end justify-center">
            <img src={choristerCutout} alt="Loveworld chorister" className="max-h-[92%] w-auto object-contain drop-shadow-2xl" />
          </div>

          <div className="space-y-6 pb-10 lg:pb-0">
            <div>
              <div className="inline-flex items-center gap-2 text-gold text-xs uppercase tracking-[0.3em] font-semibold">
                <Music className="w-4 h-4" /> Playlist
              </div>
              <h2 className="text-4xl md:text-6xl font-display font-bold text-foreground mt-2">
                Anointed <span className="bg-gradient-gold bg-clip-text text-transparent italic">Worship Anthems</span>
              </h2>
            </div>

            {/* Scroll wheel */}
            <div className="relative h-[380px]" style={{ perspective: 1000 }}>
              {WORSHIP_SONGS.map((song, idx) => {
                const d = idx - pos;
                const isActive = idx === activeSongIndex;
                const ad = Math.abs(d);
                return (
                  <div
                    key={song.id}
                    className={`absolute left-0 right-0 top-1/2 rounded-2xl border p-5 flex items-center gap-4 backdrop-blur-xl transition-colors ${isActive ? "border-gold bg-card/90 shadow-gold" : "border-border bg-card/50"}`}
                    style={{
                      transform: `translateY(calc(-50% + ${d * 110}px)) rotateX(${-d * 22}deg) scale(${1 - Math.min(ad, 3) * 0.08})`,
                      opacity: Math.max(0, 1 - ad * 0.35),
                      zIndex: 10 - Math.round(ad),
                      pointerEvents: isActive ? "auto" : "none",
                    }}
                  >
                    <div className={`w-14 h-14 rounded-full bg-gradient-gold flex items-center justify-center shrink-0 ${isActive && isPlaying ? "animate-spin" : ""}`} style={{ animationDuration: "6s" }}>
                      <Disc className="w-7 h-7 text-navy" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-semibold text-gold uppercase tracking-widest">Track {idx + 1} of {WORSHIP_SONGS.length} · {song.duration}</span>
                      <h3 className="text-lg md:text-xl font-display font-bold text-foreground truncate">{song.title}</h3>
                      <p className="text-xs text-muted-foreground font-body truncate">{song.artist} • {song.album}</p>
                    </div>
                    {isActive && (
                      <button onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"} className="w-12 h-12 rounded-full bg-gold text-navy flex items-center justify-center shrink-0 active:scale-95">
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              {WORSHIP_SONGS.map((s, i) => (
                <div key={s.id} className={`h-1 rounded-full transition-all ${i === activeSongIndex ? "w-10 bg-gold" : "w-4 bg-muted"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <audio ref={audioRef} src={currentSong.audioUrl} loop />
    </section>
  );
};

export default WorshipStickySection;
