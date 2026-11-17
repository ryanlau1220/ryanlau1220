import { useEffect, useRef, useState } from "react";

export function RevealText({
  text,
  step = 45,
  startDelay = 0,
}: {
  text: string;
  step?: number;
  startDelay?: number;
}) {
  const elementRef = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  let characterIndex = 0;
  return (
    <span ref={elementRef} className="reveal-text" data-revealed={visible}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(/(\s+)/).map((word, wordIndex) => {
          if (/^\s+$/.test(word)) return <span key={wordIndex}>{word}</span>;
          return (
            <span className="reveal-word" key={wordIndex}>
              {Array.from(word).map((character, index) => {
                const delay = startDelay + Math.min(characterIndex++ * step, 1200);
                return (
                  <span
                    className="reveal-glyph"
                    key={index}
                    style={{ animationDelay: `${delay}ms` }}
                  >
                    {character}
                  </span>
                );
              })}
            </span>
          );
        })}
      </span>
    </span>
  );
}
