"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

interface DesmosPanelProps {
  latex: string;
  xMin?: number;
  xMax?: number;
}

declare global {
  interface Window {
    Desmos: {
      GraphingCalculator: (
        el: HTMLElement,
        options?: Record<string, unknown>
      ) => {
        setExpression: (expr: { id: string; latex: string }) => void;
        setMathBounds: (bounds: {
          left: number;
          right: number;
          bottom: number;
          top: number;
        }) => void;
        destroy: () => void;
      };
    };
  }
}

export default function DesmosPanel({ latex, xMin = -10, xMax = 10 }: DesmosPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calcRef = useRef<ReturnType<typeof window.Desmos.GraphingCalculator> | null>(null);

  const initCalc = () => {
    if (!containerRef.current || !window.Desmos) return;
    if (calcRef.current) calcRef.current.destroy();
    calcRef.current = window.Desmos.GraphingCalculator(containerRef.current, {
      keypad: false,
      settingsMenu: false,
      border: false,
    });
    calcRef.current.setExpression({ id: "main", latex });
    calcRef.current.setMathBounds({
      left: xMin,
      right: xMax,
      bottom: -10,
      top: 10,
    });
  };

  useEffect(() => {
    if (window.Desmos) initCalc();
    return () => { calcRef.current?.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latex, xMin, xMax]);

  return (
    <>
      <Script
        src="https://www.desmos.com/api/v1.8/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda5"
        onLoad={initCalc}
      />
      <div className="w-full h-full rounded-lg overflow-hidden" ref={containerRef} />
    </>
  );
}
