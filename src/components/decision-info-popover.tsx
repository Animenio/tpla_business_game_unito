"use client";

import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

interface DecisionInfoPopoverProps {
  description: string;
  reference: string;
  referenceLabel?: string;
}

type PopoverPosition = {
  left: number;
  top: number;
};

export function DecisionInfoPopover({
  description,
  reference,
  referenceLabel = "Riferimento",
}: DecisionInfoPopoverProps) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;

    if (!trigger || !panel) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 12;
    const gap = 8;
    const triggerRect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    let left = triggerRect.right - panelRect.width;
    left = Math.max(
      margin,
      Math.min(left, viewportWidth - panelRect.width - margin),
    );

    const belowTop = triggerRect.bottom + gap;
    const aboveTop = triggerRect.top - panelRect.height - gap;
    const fitsBelow = belowTop + panelRect.height <= viewportHeight - margin;
    const fitsAbove = aboveTop >= margin;

    const top = fitsBelow
      ? belowTop
      : fitsAbove
        ? aboveTop
        : Math.max(
            margin,
            Math.min(
              belowTop,
              viewportHeight - Math.min(panelRect.height, viewportHeight - margin * 2) - margin,
            ),
          );

    setPosition({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    updatePosition();

    const handleViewportChange = () => updatePosition();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, updatePosition]);

  const handlePointerEnter = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== "touch") {
      setOpen(true);
    }
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== "touch") {
      setOpen(false);
    }
  };

  return (
    <>
      <button
        aria-describedby={open ? tooltipId : undefined}
        aria-label="Informazioni sulla decisione"
        className="decision-info"
        onBlur={() => setOpen(false)}
        onClick={() => {
          if (window.matchMedia("(hover: none)").matches) {
            setOpen(true);
          }
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        ref={triggerRef}
        type="button"
      >
        <span className="decision-info-trigger">ⓘ Info</span>
      </button>

      {open
        ? createPortal(
            <div
              className="decision-info-popover"
              id={tooltipId}
              ref={panelRef}
              role="tooltip"
              style={{
                left: position?.left ?? 0,
                top: position?.top ?? 0,
                visibility: position ? "visible" : "hidden",
              }}
            >
              <strong>Cosa significa</strong>
              <p>{description}</p>
              <strong>{referenceLabel}</strong>
              <p>{reference}</p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
