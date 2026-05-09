"use client";

import Script from "next/script";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DESMOS_SCRIPT_SRC =
  "https://www.desmos.com/api/v1.8/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";

function normalizeExpression(expression: string) {
  let normalized = expression.trim();

  if (normalized.startsWith("$") && normalized.endsWith("$")) {
    normalized = normalized.slice(1, -1).trim();
  }

  if (normalized.startsWith("\\(") && normalized.endsWith("\\)")) {
    normalized = normalized.slice(2, -2).trim();
  }

  if (normalized.startsWith("\\[") && normalized.endsWith("\\]")) {
    normalized = normalized.slice(2, -2).trim();
  }

  return normalized;
}

export default function DesmosPanel({
  expressions,
}: {
  expressions: string[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const calculatorRef = useRef<DesmosCalculator | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [initError, setInitError] = useState(false);
  const [calculator, setCalculator] = useState<DesmosCalculator | null>(null);

  const markReady = useCallback(() => {
    setLoadError(false);
    setScriptReady(true);
  }, []);

  const normalizedExpressions = useMemo(
    () =>
      expressions
        .map(normalizeExpression)
        .filter((expression) => expression.length > 0),
    [expressions]
  );

  useEffect(() => {
    if (window.Desmos) {
      markReady();
    }
  }, [markReady]);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || !window.Desmos) {
      return;
    }

    try {
      setInitError(false);

      const nextCalculator = window.Desmos.GraphingCalculator(
        containerRef.current,
        {
          expressions: true,
          settingsMenu: false,
          keypad: true,
        }
      );

      calculatorRef.current = nextCalculator;
      setCalculator(nextCalculator);

      return () => {
        nextCalculator.destroy();
        calculatorRef.current = null;
      };
    } catch (error) {
      console.error("Failed to initialize Desmos:", error);
      setInitError(true);
    }
  }, [scriptReady]);

  useEffect(() => {
    if (!calculator) {
      return;
    }

    calculator.setBlank();

    normalizedExpressions.forEach((expression, index) => {
      calculator.setExpression({
        id: `expression-${index}`,
        latex: expression,
      });
    });
  }, [calculator, normalizedExpressions]);

  return (
    <div className="relative h-[500px] overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      <Script
        id="desmos-calculator-api"
        src={DESMOS_SCRIPT_SRC}
        strategy="afterInteractive"
        onLoad={markReady}
        onReady={markReady}
        onError={() => {
          if (!window.Desmos) {
            setLoadError(true);
          }
        }}
      />

      <div ref={containerRef} className="h-full w-full" />

      {!calculator && !loadError && !initError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950 text-sm text-gray-300">
          Loading graphing calculator...
        </div>
      )}

      {!calculator && (loadError || initError) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-950 p-6 text-center text-sm text-gray-300">
          Desmos could not load or initialize. The expressions are still listed
          below.
        </div>
      )}
    </div>
  );
}
