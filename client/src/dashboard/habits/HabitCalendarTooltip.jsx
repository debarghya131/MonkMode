import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./habit-calendar-tooltip.css";

export default function HabitCalendarTooltip({ id, preview, habits, singular, onDismiss }) {
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState(null);
  const dateLabel = new Date(`${preview.iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  useLayoutEffect(() => {
    const anchor = preview.anchor.getBoundingClientRect();
    const tooltip = tooltipRef.current.getBoundingClientRect();
    const above = anchor.top - tooltip.height - 8;
    setPosition({
      left: Math.max(12, Math.min(anchor.left + anchor.width / 2 - tooltip.width / 2, window.innerWidth - tooltip.width - 12)),
      top: Math.max(12, Math.min(above >= 12 ? above : anchor.bottom + 8, window.innerHeight - tooltip.height - 12)),
    });
  }, [preview, habits]);

  useEffect(() => {
    const dismissOutside = (event) => {
      if (!preview.anchor.contains(event.target)) onDismiss();
    };
    const dismissOnEscape = (event) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("pointerdown", dismissOutside);
    window.addEventListener("scroll", onDismiss, true);
    window.addEventListener("resize", onDismiss);
    window.addEventListener("blur", onDismiss);
    window.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside);
      window.removeEventListener("scroll", onDismiss, true);
      window.removeEventListener("resize", onDismiss);
      window.removeEventListener("blur", onDismiss);
      window.removeEventListener("keydown", dismissOnEscape);
    };
  }, [preview.anchor, onDismiss]);

  return createPortal(
    <div
      ref={tooltipRef}
      id={id}
      role="tooltip"
      className="habit-calendar-tooltip"
      style={position || { left: 12, top: 12, visibility: "hidden" }}
    >
      <div className="habit-calendar-tooltip-heading">
        <span>{dateLabel}</span>
        <span className="habit-calendar-tooltip-count">
          {habits.length} {singular}{habits.length === 1 ? "" : "s"} scheduled
        </span>
      </div>
      <p>
        {habits.length > 0
          ? `${habits.slice(0, 3).map((habit) => habit.title).join(" · ")}${habits.length > 3 ? ` +${habits.length - 3} more` : ""}`
          : `No ${singular}s scheduled for this day.`}
      </p>
    </div>,
    document.body
  );
}
