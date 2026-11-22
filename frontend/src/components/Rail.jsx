import { useCallback, useEffect, useRef, useState } from "react";
import { IconChevronLeft, IconChevronRight } from "./Icons";

// Horizontally scrolling row with edge arrows (Netflix-style).
export default function Rail({ title, count, action, children }) {
  const ref = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update, children]);

  const scroll = (dir) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="rail">
      <div className="rail-head">
        <h2>
          {title}
          {count != null && <span className="rail-count">{count}</span>}
        </h2>
        {action}
      </div>

      <div className="rail-frame">
        {canLeft && (
          <button className="rail-arrow left" onClick={() => scroll(-1)} aria-label="Scroll left">
            <IconChevronLeft />
          </button>
        )}
        <div className="rail-track" ref={ref}>
          {children}
        </div>
        {canRight && (
          <button className="rail-arrow right" onClick={() => scroll(1)} aria-label="Scroll right">
            <IconChevronRight />
          </button>
        )}
      </div>
    </section>
  );
}
