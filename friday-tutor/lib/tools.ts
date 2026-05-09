import type { ChatCompletionTool } from "openai/resources/chat";

export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "plot_function",
      description: "Plot a mathematical function or equation using Desmos.",
      parameters: {
        type: "object",
        properties: {
          latex: {
            type: "string",
            description: "LaTeX expression to plot, e.g. 'y=x^2+3x-2'",
          },
          xMin: { type: "number", description: "Left bound of x-axis" },
          xMax: { type: "number", description: "Right bound of x-axis" },
        },
        required: ["latex"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_molecule",
      description: "Render a 3D molecule using 3Dmol.js.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Common name of the molecule, e.g. 'ethanol'",
          },
          smiles: {
            type: "string",
            description: "SMILES string if known",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draw_physics_diagram",
      description:
        "Draw a physics diagram (forces, waves, fields) on canvas.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: [
              "forces",
              "waves",
              "electric_field",
              "circuit",
              "projectile",
            ],
          },
          params: {
            type: "object",
            description:
              "Diagram-specific parameters (masses, angles, amplitudes, etc.)",
          },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_steps",
      description:
        "Display a numbered worked solution in the steps panel.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          steps: {
            type: "array",
            items: { type: "string" },
            description: "Ordered array of solution steps (markdown/LaTeX)",
          },
        },
        required: ["steps"],
      },
    },
  },
];
