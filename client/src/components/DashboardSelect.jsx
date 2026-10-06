import { Children, Fragment, isValidElement, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const readOptions = (nodes) => Children.toArray(nodes).flatMap((node) => {
  if (!isValidElement(node)) return [];
  if (node.type === Fragment) return readOptions(node.props.children);
  if (node.type !== "option") return [];
  return [{
    value: String(node.props.value ?? node.props.children ?? ""),
    label: node.props.label ?? node.props.children,
    disabled: Boolean(node.props.disabled),
  }];
});

const enabledIndex = (options, start, direction) => {
  for (let step = 1; step <= options.length; step += 1) {
    const index = (start + direction * step + options.length * 2) % options.length;
    if (!options[index].disabled) return index;
  }
  return start;
};

export default function DashboardSelect({
  children,
  value,
  onChange,
  className = "",
  disabled = false,
  id,
  name,
  required,
  "aria-label": ariaLabel,
  ...rest
}) {
  const generatedId = useId();
  const listId = `${id || generatedId}-options`;
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState(null);
  const options = readOptions(children);
  const selectedIndex = options.findIndex((option) => option.value === String(value ?? ""));
  const selected = options[selectedIndex] ?? options[0];

  const close = () => setOpen(false);

  const show = () => {
    if (disabled || !options.length) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(Math.max(rect.width, 10 * 16), viewportWidth - 16);
    const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));
    const wantedHeight = Math.min(options.length * 36 + 8, 280, viewportHeight - 16);
    const below = viewportHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const placeBelow = below >= Math.min(wantedHeight, 160) || below >= above;
    const available = Math.max(56, placeBelow ? below : above);
    const maxHeight = Math.min(wantedHeight, available);
    const top = placeBelow ? rect.bottom + 4 : Math.max(8, rect.top - maxHeight - 4);

    setMenuPosition({ left, top, width, maxHeight });
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : enabledIndex(options, options.length - 1, 1));
    setOpen(true);
  };

  const choose = (option) => {
    if (option.disabled) return;
    if (option.value !== String(value ?? "")) {
      onChange?.({ target: { value: option.value, name, id } });
    }
    close();
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      close();
    };
    const onScroll = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      close();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  useEffect(() => {
    if (open) menuRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const onKeyDown = (event) => {
    if (disabled) return;
    if (event.key === "Tab") {
      close();
      return;
    }
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        close();
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        show();
      } else {
        setActiveIndex((index) => enabledIndex(options, index, event.key === "ArrowDown" ? 1 : -1));
      }
      return;
    }
    if (event.key === "Home" || event.key === "End") {
      if (!open) return;
      event.preventDefault();
      setActiveIndex(event.key === "Home"
        ? enabledIndex(options, options.length - 1, 1)
        : enabledIndex(options, 0, -1));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) show();
      else choose(options[activeIndex]);
    }
  };

  return (
    <span className={`dashboard-select-root ${className.includes("w-full") ? "dashboard-select-block" : ""}`}>
      <button
        {...rest}
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        className={`dashboard-select-trigger ${className}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        aria-required={required || undefined}
        onClick={() => (open ? close() : show())}
        onKeyDown={onKeyDown}
      >
        <span className="dashboard-select-value">{selected?.label ?? "Select…"}</span>
        <span aria-hidden="true" className="dashboard-select-chevron">▾</span>
      </button>
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      {open && menuPosition && createPortal(
        <div
          ref={menuRef}
          id={listId}
          role="listbox"
          aria-label={ariaLabel || "Choose an option"}
          className="dashboard-select-menu"
          data-demo-allow="true"
          style={menuPosition}
        >
          {options.map((option, index) => (
            <button
              key={`${option.value}-${index}`}
              id={`${listId}-${index}`}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              disabled={option.disabled}
              tabIndex={-1}
              className="dashboard-select-option"
              data-active={index === activeIndex || undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {index === selectedIndex && <span aria-hidden="true">✓</span>}
            </button>
          ))}
        </div>,
        document.body
      )}
    </span>
  );
}
