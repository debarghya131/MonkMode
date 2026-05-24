import { motion as Motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import transformatiomImage1 from "../../assets/transformatiom image 1.webp";
import transformatiomImage2 from "../../assets/transformatiom image 2.webp";
import transformatiomImage3 from "../../assets/transformatiom image 3.webp";
import transformatiomImage4 from "../../assets/transformatiom image 4.webp";
import transformatiomImage5 from "../../assets/transformatiom image 5.webp";
import transformatiomImage6 from "../../assets/transformatiom image 6.webp";
import useAuth from "../../hooks/useAuth";

const todayISO = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const emitGalleryUpdated = () => {
  window.dispatchEvent(new Event("monkmode:gym-gallery-updated"));
};

const DEMO_LOGS = [
  {
    id: "demo-gallery-1",
    date: "2026-01-01",
    demo: true,
    images: [{ id: "demo-gallery-1-image-1", src: transformatiomImage1 }],
  },
  {
    id: "demo-gallery-2",
    date: "2026-02-01",
    demo: true,
    images: [{ id: "demo-gallery-2-image-1", src: transformatiomImage2 }],
  },
  {
    id: "demo-gallery-3",
    date: "2026-02-15",
    demo: true,
    images: [{ id: "demo-gallery-3-image-1", src: transformatiomImage3 }],
  },
  {
    id: "demo-gallery-4",
    date: "2026-03-01",
    demo: true,
    images: [{ id: "demo-gallery-4-image-1", src: transformatiomImage4 }],
  },
  {
    id: "demo-gallery-5",
    date: "2026-03-15",
    demo: true,
    images: [{ id: "demo-gallery-5-image-1", src: transformatiomImage5 }],
  },
  {
    id: "demo-gallery-6",
    date: "2026-04-01",
    demo: true,
    images: [{ id: "demo-gallery-6-image-1", src: transformatiomImage6 }],
  },
];

const sortLogsByDateDesc = (logs) => [...logs].sort((a, b) => b.date.localeCompare(a.date));

const normalizeGalleryLogs = (logs) =>
  sortLogsByDateDesc(
    (Array.isArray(logs) ? logs : []).map((log) => ({
      id: String(log?.id || ""),
      date: String(log?.date || ""),
      demo: Boolean(log?.demo),
      images: Array.isArray(log?.images)
        ? log.images
            .map((image, index) => {
              if (typeof image === "string") {
                return {
                  id: `${log?.id || log?.date || "gallery"}-image-${index}`,
                  src: image
                };
              }

              return {
                id: String(image?.id || `${log?.id || log?.date || "gallery"}-image-${index}`),
                src: image?.src || ""
              };
            })
            .filter((image) => image.src)
        : []
    })).filter((log) => log.date)
  );

function Lightbox({ logs, startEntryId, startImageId, onClose }) {
  const allImages = logs.flatMap((log) =>
    log.images.map((image) => ({
      entryId: log.id,
      imageId: image.id,
      src: image.src,
      date: log.date
    }))
  );

  const initialIndex = allImages.findIndex(
    (image) => image.entryId === startEntryId && image.imageId === startImageId
  );
  const [current, setCurrent] = useState(Math.max(0, initialIndex));

  const prev = () => setCurrent((value) => (value - 1 + allImages.length) % allImages.length);
  const next = () => setCurrent((value) => (value + 1) % allImages.length);

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "ArrowLeft") prev();
      if (event.key === "ArrowRight") next();
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (!allImages.length) return null;
  const image = allImages[current];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-3xl flex-col items-center"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 rounded-full border border-amber-100/15 bg-black/70 px-3 py-1.5 text-xs font-semibold text-stone-200 shadow-lg shadow-black/35 backdrop-blur transition hover:border-amber-200/35 hover:bg-black/85 hover:text-amber-100"
          aria-label="Close gallery preview"
        >
          X Close
        </button>

        <div className="relative w-full overflow-hidden rounded-2xl border border-amber-100/10 bg-black/40">
          <img
            src={image.src}
            alt={`${image.date} photo`}
            className="max-h-[70vh] w-full object-contain"
          />

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

        <div className="mt-3 flex items-center gap-3">
          <span className="rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-200">
            {formatDate(image.date)}
          </span>
          <span className="text-xs text-stone-500">
            {current + 1} / {allImages.length}
          </span>
        </div>

        {allImages.length > 1 && (
          <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
            {allImages.map((thumb, index) => (
              <button
                key={thumb.imageId}
                type="button"
                onClick={() => setCurrent(index)}
                className={`shrink-0 overflow-hidden rounded-lg border transition ${
                  index === current ? "border-amber-300/60 opacity-100" : "border-amber-100/10 opacity-50 hover:opacity-80"
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
  const [logs, setLogs] = useState(() => (isDemoMode ? DEMO_LOGS : []));
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [loading, setLoading] = useState(() => !isDemoMode);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const refreshGallery = useCallback(async () => {
    if (isDemoMode) {
      setLogs(DEMO_LOGS);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.get("/gym/gallery");
      setLogs(normalizeGalleryLogs(data).map((log) => ({ ...log, demo: false })));
      setError("");
    } catch (fetchError) {
      console.error("Failed to fetch gym gallery:", fetchError);
      setLogs([]);
      setError(fetchError?.response?.data?.message || "Failed to load gallery.");
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    refreshGallery();
  }, [refreshGallery]);

  useEffect(() => {
    if (isDemoMode) return undefined;

    const handleRefresh = () => {
      refreshGallery();
    };

    window.addEventListener("focus", handleRefresh);
    return () => window.removeEventListener("focus", handleRefresh);
  }, [isDemoMode, refreshGallery]);

  const processFiles = async (files) => {
    if (isDemoMode || uploading) return;

    const imageFiles = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (!imageFiles.length) return;

    const readers = imageFiles.map((file) => (
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result || "");
        reader.readAsDataURL(file);
      })
    ));

    setUploading(true);
    setError("");
    try {
      const base64Images = (await Promise.all(readers)).filter(Boolean);
      await api.post("/gym/gallery", {
        date: todayISO(),
        images: base64Images
      });
      await refreshGallery();
      emitGalleryUpdated();
    } catch (uploadError) {
      console.error("Failed to upload gallery images:", uploadError);
      setError(uploadError?.response?.data?.message || "Failed to upload images.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    void processFiles(event.dataTransfer.files);
  };

  const handleDeleteImage = async (entryId, imageId, isDemoImage) => {
    if (isDemoMode || isDemoImage) return;

    try {
      setError("");
      await api.delete(`/gym/gallery/${entryId}/images/${imageId}`);
      await refreshGallery();
      emitGalleryUpdated();
    } catch (deleteError) {
      console.error("Failed to delete gallery image:", deleteError);
      setError(deleteError?.response?.data?.message || "Failed to delete image.");
    }
  };

  const totalImages = logs.reduce((sum, log) => sum + log.images.length, 0);
  const logsForLightbox =
    lightbox?.mode === "all-asc"
      ? [...logs].sort((a, b) => a.date.localeCompare(b.date))
      : logs;

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-[1.5rem] border border-amber-100/10 bg-black/20 p-3 sm:rounded-3xl sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                if (!isDemoMode) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={isDemoMode ? undefined : handleDrop}
              onClick={isDemoMode ? undefined : () => fileRef.current?.click()}
              className={`flex flex-1 flex-col items-start gap-3 rounded-[1.4rem] border-2 border-dashed px-4 py-3 transition sm:flex-row sm:items-center sm:justify-center sm:rounded-2xl sm:py-2 ${
                isDemoMode
                  ? "cursor-not-allowed border-amber-100/10 bg-white/[0.03] opacity-60"
                  : "cursor-pointer"
              } ${
                dragging
                  ? "border-amber-300/60 bg-amber-500/10"
                  : "border-amber-100/15 bg-white/5 hover:border-amber-300/30 hover:bg-white/8"
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-500/10 text-lg text-amber-200">
                ↑
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-stone-200">
                  {uploading ? "Uploading images..." : "Drop images here or click to upload"}
                </p>
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
                disabled={isDemoMode || uploading}
                className="hidden"
                onChange={(event) => {
                  void processFiles(event.target.files);
                }}
              />
            </div>

            {logs.length > 0 && (
              <div className="flex flex-col gap-3 rounded-[1.4rem] border border-amber-100/10 bg-black/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:py-2 lg:w-72">
                <span className="text-xs font-semibold text-stone-400">
                  {totalImages} photo{totalImages !== 1 ? "s" : ""} across {logs.length} check-in{logs.length !== 1 ? "s" : ""}
                </span>
                <Motion.button
                  type="button"
                  onClick={() => {
                    const oldestLog = [...logs].sort((a, b) => a.date.localeCompare(b.date))[0];
                    const oldestImage = oldestLog?.images?.[0];
                    if (oldestLog && oldestImage) {
                      setLightbox({
                        entryId: oldestLog.id,
                        imageId: oldestImage.id,
                        mode: "all-asc"
                      });
                    }
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
                  className="relative w-full overflow-hidden rounded-full border border-amber-300/40 bg-amber-500/15 px-3 py-1 text-[10px] font-semibold text-amber-200 transition duration-200 hover:border-transparent hover:bg-gradient-to-r hover:from-[#ffd86b] hover:via-[#f5b52f] hover:to-[#ea8a17] hover:text-stone-950 sm:w-auto sm:shrink-0"
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

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="max-h-[54vh] overflow-y-auto rounded-[1.5rem] border border-amber-100/10 bg-black/20 p-3 sm:max-h-[calc(100vh-23rem)] sm:rounded-3xl sm:p-5">
          {loading ? (
            <div className="rounded-2xl border border-dashed border-amber-100/10 bg-black/15 py-12 text-center">
              <p className="text-sm font-semibold text-stone-300">Loading gallery...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-amber-100/10 bg-black/15 py-12 text-center">
              <p className="text-sm font-semibold text-stone-300">No photos yet.</p>
              <p className="mt-1 text-xs text-stone-500">Upload your first progress photo above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log, logIndex) => (
                <Motion.div
                  key={log.id}
                  className="rounded-[1.4rem] border border-amber-100/10 bg-black/20 p-3 sm:rounded-2xl"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: logIndex * 0.07, duration: 0.25 }}
                  whileHover={{ y: -2, boxShadow: "0 10px 28px rgba(0,0,0,0.4)", borderColor: "rgba(251,191,36,0.2)" }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-stone-100">{formatDate(log.date)}</span>
                      <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                        {log.images.length} photo{log.images.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:overflow-x-auto sm:pb-1">
                    {log.images.map((image, imageIndex) => (
                      <Motion.div
                        key={image.id}
                        className="group relative h-28 w-full overflow-hidden rounded-xl border border-amber-100/10 sm:h-24 sm:w-24 sm:shrink-0"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: logIndex * 0.07 + imageIndex * 0.04, duration: 0.2 }}
                        whileHover={{ scale: 1.04, borderColor: "rgba(251,191,36,0.35)" }}
                      >
                        <img
                          src={image.src}
                          alt={`${log.date} ${imageIndex + 1}`}
                          className="h-full w-full cursor-pointer object-cover transition group-hover:opacity-80"
                          onClick={() => setLightbox({ entryId: log.id, imageId: image.id })}
                        />
                        {!log.demo && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleDeleteImage(log.id, image.id, log.demo);
                            }}
                            className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/70 text-[10px] text-rose-300 group-hover:flex"
                          >
                            X
                          </button>
                        )}
                      </Motion.div>
                    ))}
                  </div>
                </Motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {lightbox ? (
        <Lightbox
          logs={logsForLightbox}
          startEntryId={lightbox.entryId}
          startImageId={lightbox.imageId}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </>
  );
}
