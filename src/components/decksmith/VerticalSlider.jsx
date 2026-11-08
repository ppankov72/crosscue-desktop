import { useRef, useCallback } from 'react';

/**
 * Custom div-based vertical slider with absolute-positioned thumb.
 * Replaces native <input type="range"> to guarantee precise visual alignment
 * with scale marks across all browsers and themes.
 *
 * Props:
 *   value      — normalized position 0 (top) to 1 (bottom)
 *   onChange   — (newPos) => void  (caller maps pos to domain value)
 *   height     — track height in px (default 84)
 *   disabled   — boolean
 *   onReset    — optional double-click handler
 *   className  — extra class for the wrapper
 *   thumbClass — extra class for the thumb element
 */
export default function VerticalSlider({ value, onChange, height = 84, disabled = false, onReset, className = '', thumbClass = '' }) {
  const trackRef = useRef(null);
  const draggingRef = useRef(false);

  const THUMB_H = 13; // matches the previous webkit thumb height

  const posFromPointer = useCallback(clientY => {
    const track = trackRef.current;
    if (!track) return value;
    const rect = track.getBoundingClientRect();
    const usable = rect.height - THUMB_H;
    if (usable <= 0) return value;
    const raw = (clientY - rect.top - THUMB_H / 2) / usable;
    return Math.max(0, Math.min(1, raw));
  }, [value]);

  const handlePointerDown = useCallback(e => {
    if (disabled) return;
    e.preventDefault();
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    onChange(posFromPointer(e.clientY));
  }, [disabled, onChange, posFromPointer]);

  const handlePointerMove = useCallback(e => {
    if (!draggingRef.current) return;
    onChange(posFromPointer(e.clientY));
  }, [onChange, posFromPointer]);

  const handlePointerUp = useCallback(e => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  const thumbTop = value * (height - THUMB_H);

  return (
    <div
      ref={trackRef}
      className={`vertical-slider-track ${disabled ? 'opacity-40' : ''} ${className}`}
      style={{ height, cursor: disabled ? 'not-allowed' : 'pointer', touchAction: 'none' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={() => !disabled && onReset?.()}
      role="slider"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={1}
      aria-disabled={disabled}
    >
      <div className="vertical-slider-groove" />
      <div
        className={`vertical-slider-thumb ${draggingRef.current ? 'active' : ''} ${thumbClass}`}
        style={{ top: thumbTop, height: THUMB_H }}
      />
    </div>
  );
}