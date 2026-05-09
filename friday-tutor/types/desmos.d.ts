export {};

declare global {
  type DesmosExpression = {
    id: string;
    latex: string;
  };

  type DesmosCalculator = {
    setExpression(expression: DesmosExpression): void;
    setBlank(): void;
    destroy(): void;
  };

  type DesmosApi = {
    GraphingCalculator(
      element: HTMLElement,
      options?: Record<string, unknown>
    ): DesmosCalculator;
  };

  interface Window {
    Desmos?: DesmosApi;
  }
}
