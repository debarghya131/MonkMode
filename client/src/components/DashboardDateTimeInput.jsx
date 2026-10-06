import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const parseDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};

const dateISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const displayDate = (value) => {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }).format(date) : "mm/dd/yyyy";
};

const displayTime = (value) => {
  const match = /^(\d{2}):(\d{2})/.exec(value || "");
  if (!match) return "--:-- --";
  const hour = Number(match[1]);
  return `${String(hour % 12 || 12).padStart(2, "0")}:${match[2]} ${hour < 12 ? "AM" : "PM"}`;
};

const timeParts = (value) => {
  const match = /^(\d{2}):(\d{2})/.exec(value || "");
  const hour = match ? Number(match[1]) : 9;
  return {
    hour: String(hour % 12 || 12),
    minute: match ? match[2] : "00",
    period: hour < 12 ? "AM" : "PM",
  };
};

export default function DashboardDateTimeInput({
  type,
  value = "",
  onChange,
  className = "",
  id,
  name,
  min,
  max,
  disabled = false,
  readOnly = false,
  required = false,
  "aria-label": ariaLabel,
  ...rest
}) {
  const generatedId = useId();
  const panelId = `${id || generatedId}-picker`;
  const isDate = type === "date";
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const keyboardOpenRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const date = parseDate(value) || new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const [yearDraft, setYearDraft] = useState(() => String((parseDate(value) || new Date()).getFullYear()));
  const [draftTime, setDraftTime] = useState(() => timeParts(value));

  const close = () => setOpen(false);

  const show = () => {
    if (disabled || readOnly) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const shell = triggerRef.current.closest(".dashboard-shell")?.getBoundingClientRect();
    const leftBound = Math.max(8, (shell?.left ?? 0) + 8);
    const rightBound = Math.min(window.innerWidth - 8, (shell?.right ?? window.innerWidth) - 8);
    const width = Math.max(0, Math.min(Math.max(rect.width, isDate ? 280 : 244), rightBound - leftBound));
    const left = Math.max(leftBound, Math.min(rect.left, rightBound - width));
    const wantedHeight = Math.min(isDate ? 352 : 220, window.innerHeight - 16);
    const below = window.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const placeBelow = below >= wantedHeight || below >= above;
    const maxHeight = Math.min(wantedHeight, Math.max(48, placeBelow ? below : above));

    if (isDate) {
      const date = parseDate(value) || parseDate(todayISO());
      setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      setYearDraft(String(date.getFullYear()));
    } else {
      setDraftTime(timeParts(value));
    }
    setPosition(placeBelow
      ? { left, top: rect.bottom + 4, width, maxHeight }
      : { left, bottom: window.innerHeight - rect.top + 4, width, maxHeight });
    setOpen(true);
  };

  const choose = (nextValue) => {
    if (nextValue !== value) onChange?.({ target: { value: nextValue, name, id } });
    close();
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) return;
      close();
    };
    const onScroll = (event) => {
      if (!panelRef.current?.contains(event.target)) close();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !keyboardOpenRef.current) return;
    const target = isDate
      ? panelRef.current?.querySelector('.dashboard-datetime-calendar button[aria-pressed="true"], .dashboard-datetime-calendar button[data-today="true"], .dashboard-datetime-calendar button:not(:disabled)')
      : panelRef.current?.querySelector('.dashboard-datetime-time-fields input');
    target?.focus({ preventScroll: true });
  }, [isDate, open]);

  const firstDay = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1).getDay();
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, index) => index - firstDay + 1);
  const changeMonth = (offset) => {
    const next = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + offset, 1);
    setViewMonth(next);
    setYearDraft(String(next.getFullYear()));
  };
  const commitYear = () => {
    const year = Number(yearDraft);
    if (year >= 100 && year <= 9999) setViewMonth(new Date(year, viewMonth.getMonth(), 1));
    else setYearDraft(String(viewMonth.getFullYear()));
  };
  const hour = Number(draftTime.hour);
  const minute = Number(draftTime.minute);
  const validTime = Number.isInteger(hour) && hour >= 1 && hour <= 12 && Number.isInteger(minute) && minute >= 0 && minute <= 59;
  const applyTime = () => {
    if (!validTime) return;
    const hour24 = hour % 12 + (draftTime.period === "PM" ? 12 : 0);
    choose(`${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  };

  return (
    <span className={`dashboard-datetime-root ${className.includes("w-full") ? "dashboard-datetime-block" : ""} ${className.includes("sm:w-24") ? "dashboard-datetime-narrow" : ""}`}>
      <button
        {...rest}
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-required={required || undefined}
        className={`dashboard-datetime-trigger ${className}`}
        onClick={(event) => {
          keyboardOpenRef.current = event.detail === 0;
          if (open) close();
          else show();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) {
              keyboardOpenRef.current = true;
              show();
            }
          }
        }}
      >
        <span className={value ? "" : "dashboard-datetime-placeholder"}>{isDate ? displayDate(value) : displayTime(value)}</span>
        <span aria-hidden="true" className="dashboard-datetime-icon">{isDate ? "▦" : "◷"}</span>
      </button>
      {name && <input type="hidden" name={name} value={value} />}
      {open && position && createPortal(
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={ariaLabel || (isDate ? "Choose date" : "Choose time")}
          className="dashboard-datetime-panel"
          data-demo-allow="true"
          style={position}
        >
          {isDate ? (
            <>
              <div className="dashboard-datetime-header">
                <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}>‹</button>
                <span>{new Intl.DateTimeFormat("en-US", { month: "long" }).format(viewMonth)}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Year"
                  value={yearDraft}
                  onChange={(event) => setYearDraft(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  onBlur={commitYear}
                  onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                />
                <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}>›</button>
              </div>
              <div className="dashboard-datetime-calendar">
                {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={index} className="dashboard-datetime-weekday">{day}</span>)}
                {cells.map((day, index) => day > 0 ? (() => {
                  const nextValue = dateISO(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={Boolean((min && nextValue < min) || (max && nextValue > max))}
                      aria-label={new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day))}
                      aria-pressed={nextValue === value}
                      data-today={nextValue === todayISO() || undefined}
                      onClick={() => choose(nextValue)}
                    >{day}</button>
                  );
                })() : <span key={index} />)}
              </div>
              <div className="dashboard-datetime-footer">
                <button type="button" onClick={() => choose("")}>Clear</button>
                <button type="button" disabled={Boolean((min && todayISO() < min) || (max && todayISO() > max))} onClick={() => choose(todayISO())}>Today</button>
              </div>
            </>
          ) : (
            <>
              <p className="dashboard-datetime-time-title">Choose time</p>
              <div className="dashboard-datetime-time-fields">
                <label>Hour<input type="text" inputMode="numeric" aria-label="Hour" value={draftTime.hour} onChange={(event) => setDraftTime((prev) => ({ ...prev, hour: event.target.value.replace(/\D/g, "").slice(0, 2) }))} /></label>
                <span aria-hidden="true">:</span>
                <label>Minute<input type="text" inputMode="numeric" aria-label="Minute" value={draftTime.minute} onChange={(event) => setDraftTime((prev) => ({ ...prev, minute: event.target.value.replace(/\D/g, "").slice(0, 2) }))} /></label>
              </div>
              <div className="dashboard-datetime-period" role="group" aria-label="AM or PM">
                {["AM", "PM"].map((period) => <button key={period} type="button" aria-pressed={draftTime.period === period} onClick={() => setDraftTime((prev) => ({ ...prev, period }))}>{period}</button>)}
              </div>
              <div className="dashboard-datetime-footer">
                <button type="button" onClick={() => choose("")}>Clear</button>
                <button type="button" disabled={!validTime} onClick={applyTime}>Set time</button>
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </span>
  );
}
