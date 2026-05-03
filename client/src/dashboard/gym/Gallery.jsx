import { motion as Motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import transformatiomImage1 from "../../assets/transformatiom image 1.png";
import transformatiomImage2 from "../../assets/transformatiom image 2.png";
import transformatiomImage3 from "../../assets/transformatiom image 3.png";
import transformatiomImage4 from "../../assets/transformatiom image 4.png";
import transformatiomImage5 from "../../assets/transformatiom image 5.png";
import transformatiomImage6 from "../../assets/transformatiom image 6.png";
import useAuth from "../../hooks/useAuth";

const STORAGE_KEY = "monkmode_gallery";

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric", month: "short", year: "numeric",
  });

const DEMO_LOGS = [
  {
    date: "2026-01-01",
    demo: true,
    images: [transformatiomImage1],
  },
  {
    date: "2026-02-01",
    demo: true,
    images: [transformatiomImage2],
  },
  {
    date: "2026-02-15",
    demo: true,
    images: [transformatiomImage3],
  },
  {
    date: "2026-03-01",
    demo: true,
    images: [transformatiomImage4],
  },
  {
    date: "2026-03-15",
    demo: true,
    images: [transformatiomImage5],
  },
  {
    date: "2026-04-01",
    demo: true,
    images: [transformatiomImage6],
  },
];

const loadLogs = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const userLogs = stored ? JSON.parse(stored) : [];
    const userOnly = userLogs.filter((l) => !l.demo);
    const userDates = new Set(userOnly.map((l) => l.date));
    const demos = DEMO_LOGS.filter((d) => !userDates.has(d.date));
    return [...userOnly, ...demos].sort((a, b) => b.date.localeCompare(a.date));
  } catch { return DEMO_LOGS; }
};

const saveLogs = (logs) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  window.dispatchEvent(new Event("monkmode:gym-gallery-updated"));
};

/* ── Lightbox ── */
function Lightbox({ logs, startDate, startIndex, onClose }) {
  const allImages = logs.flatMap((log) =>
    log.images.map((src) => ({ src, date: log.date }))
  );

  const initialIdx = allImages.findIndex(
    (img, i) =>
      img.date === startDate &&
      logs.find((l) => l.date === startDate)?.images[startIndex] === img.src &&
      i >= allImages.findIndex((x) => x.date === startDate)
  );

  const [current, setCurrent] = useState(Math.max(0, initialIdx));

  const prev = () => setCurrent((c) => (c - 1 + allImages.length) % allImages.length);
  const next = () => setCurrent((c) => (c + 1) % allImages.length);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (!allImages.length) return null;
  const img = allImages[current];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-3xl flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full border border-amber-100/15 bg-black/70 px-3 py-1.5 text-xs font-semibold text-stone-200 shadow-lg shadow-black/35 backdrop-blur transition hover:border-amber-200/35 hover:bg-black/85 hover:text-amber-100"
          aria-label="Close gallery preview"
        >
          ✕ Close
        </button>

        {/* Image */}
        <div className="relative w-full overflow-hidden rounded-2xl border border-amber-100/10 bg-black/40">
          <img
            src={img.src}
            alt={`${img.date} photo`}
            className="max-h-[70vh] w-full object-contain"
          />

          {/* Arrows */}
          {allImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-amber-100/15 bg-black/60 px-3 py-2 text-sm font-bold text-stone-200 transition hover:bg-black/80"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-amber-100/15 bg-black/60 px-3 py-2 text-sm font-bold text-stone-200 transition hover:bg-black/80"
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* Meta */}
        <div className="mt-3 flex items-center gap-3">
          <span className="rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
            {formatDate(img.date)}
          </span>
          <span className="text-xs text-stone-500">
            {current + 1} / {allImages.length}
          </span>
        </div>

        {/* Thumbnail strip */}
        {allImages.length > 1 && (
          <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
            {allImages.map((thumb, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                className={`shrink-0 overflow-hidden rounded-lg border transition ${
                  i === current ? "border-amber-300/60 opacity-100" : "border-amber-100/10 opacity-50 hover:opacity-80"
                }`}
              >
                <img src={thumb.src} alt="" className="h-14 w-14 object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Gallery() {
  const { isDemoMode } = useAuth();
  const [logs, setLogs] = useState(loadLogs);
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { date, index, mode? }
  const fileRef = useRef();

  const processFiles = (files) => {
    if (isDemoMode) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;

    const readers = imageFiles.map(
      (file) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(file);
        })
    );

    Promise.all(readers).then((base64s) => {
      const today = todayISO();
      setLogs((prev) => {
        const existing = prev.find((l) => l.date === today);
        const updated = existing
          ? prev.map((l) => l.date === today ? { ...l, images: [...l.images, ...base64s] } : l)
          : [{ date: today, images: base64s }, ...prev];
        const sorted = updated.sort((a, b) => b.date.localeCompare(a.date));
        saveLogs(sorted);
        return sorted;
      });
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleDeleteImage = (date, imgIndex) => {
    setLogs((prev) => {
      const log = prev.find((l) => l.date === date);
      if (log?.demo) return prev;
      const updated = prev
        .map((l) =>
          l.date === date
            ? { ...l, images: l.images.filter((_, i) => i !== imgIndex) }
            : l
        )
        .filter((l) => l.images.length > 0 || l.demo);
      saveLogs(updated.filter((l) => !l.demo));
      return updated;
    });
  };

  const totalImages = logs.reduce((sum, l) => sum + l.images.length, 0);
  const logsForLightbox =
    lightbox?.mode === "all-asc"
      ? [...logs].sort((a, b) => a.date.localeCompare(b.date))
      : logs;

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-3xl border border-amber-100/10 bg-black/20 p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            {/* ── Upload zone ── */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!isDemoMode) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={isDemoMode ? undefined : handleDrop}
              onClick={isDemoMode ? undefined : () => fileRef.current.click()}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-2 transition ${
                isDemoMode
                  ? "cursor-not-allowed border-amber-100/10 bg-white/[0.03] opacity-60"
                  : "cursor-pointer"
              } ${
                dragging
                  ? "border-amber-300/60 bg-amber-500/10"
                  : "border-amber-100/15 bg-white/5 hover:border-amber-300/30 hover:bg-white/8"
              }`}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-300/25 bg-amber-500/10 text-lg text-amber-200">
                ↑
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-stone-200">Drop images here or click to upload</p>
                <p className="text-xs text-stone-500">
                  {isDemoMode
                    ? "Disabled in demo mode"
                    : "JPG, PNG, WEBP — multiple files supported"}
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                disabled={isDemoMode}
                className="hidden"
                onChange={(e) => processFiles(e.target.files)}
              />
            </div>

            {/* ── Stats bar ── */}
            {logs.length > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100/10 bg-black/20 px-4 py-2 lg:w-72">
                <span className="text-xs font-semibold text-stone-400">
                  {totalImages} photo{totalImages !== 1 ? "s" : ""} across {logs.length} check-in{logs.length !== 1 ? "s" : ""}
                </span>
                <Motion.button
                  type="button"
                  onClick={() => {
                    const oldest = [...logs].sort((a, b) => a.date.localeCompare(b.date))[0];
                    if (oldest) setLightbox({ date: oldest.date, index: 0, mode: "all-asc" });
                  }}
                  animate={{
                    scale: [1, 1.06, 1],
                    boxShadow: [
                      "0 0 0px rgba(251,191,36,0)",
                      "0 0 12px rgba(251,191,36,0.5)",
                      "0 0 0px rgba(251,191,36,0)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  whileHover={{ scale: 1.1, boxShadow: "0 0 20px rgba(251,191,36,0.65), 0 0 40px rgba(251,191,36,0.2)" }}
                  whileTap={{ scale: 0.93 }}
                  className="relative shrink-0 overflow-hidden rounded-full border border-amber-300/40 bg-amber-500/15 px-3 py-1 text-[10px] font-semibold text-amber-200 transition duration-200 hover:border-transparent hover:bg-gradient-to-r hover:from-[#ffd86b] hover:via-[#f5b52f] hover:to-[#ea8a17] hover:text-stone-950"
                >
                  <Motion.span
                    className="pointer-events-none absolute inset-y-0 left-[-40%] w-[30%] -skew-x-12 bg-white/30 blur-sm"
                    animate={{ left: ["-40%", "130%"] }}
                    transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
                  />
                  <span className="relative z-10">View All</span>
                </Motion.button>
              </div>
            )}
          </div>
        </div>

        <div className="h-[calc(100vh-23rem)] overflow-y-auto rounded-3xl border border-amber-100/10 bg-black/20 p-4 sm:p-5">
          {/* ── Log list ── */}
          {logs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-100/10 bg-black/15 py-12 text-center">
              <p className="text-sm font-semibold text-stone-300">No photos yet.</p>
              <p className="mt-1 text-xs text-stone-500">Upload your first progress photo above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, li) => (
                <Motion.div
                  key={log.date}
                  className="rounded-2xl border border-amber-100/10 bg-black/20 p-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: li * 0.07, duration: 0.25 }}
                  whileHover={{ y: -2, boxShadow: "0 10px 28px rgba(0,0,0,0.4)", borderColor: "rgba(251,191,36,0.2)" }}
                >
                  {/* Log header */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-stone-100">{formatDate(log.date)}</span>
                      <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                        {log.images.length} photo{log.images.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail grid */}
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                    {log.images.map((src, i) => (
                      <Motion.div
                        key={i}
                        className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-amber-100/10"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: li * 0.07 + i * 0.04, duration: 0.2 }}
                        whileHover={{ scale: 1.04, borderColor: "rgba(251,191,36,0.35)" }}
                      >
                        <img
                          src={src}
                          alt={`${log.date} ${i + 1}`}
                          className="h-full w-full cursor-pointer object-cover transition group-hover:opacity-80"
                          onClick={() => setLightbox({ date: log.date, index: i })}
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteImage(log.date, i); }}
                          className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] text-rose-300 group-hover:flex"
                        >
                          ✕
                        </button>
                      </Motion.div>
                    ))}
                  </div>
                </Motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <Lightbox
          logs={logsForLightbox}
          startDate={lightbox.date}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}
