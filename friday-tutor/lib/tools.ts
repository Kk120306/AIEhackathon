import type { ChatCompletionTool } from "openai/resources/chat";

export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "show_desmos_graph",
      description: "Plot a mathematical function or equation using Desmos.",
      parameters: {
        type: "object",
        properties: {
          latex: {
            type: "string",
            description: "LaTeX expression to plot, e.g. 'y=x^{2}+3x-2'",
          },
          xMin: { type: "number", description: "Left bound of the x-axis" },
          xMax: { type: "number", description: "Right bound of the x-axis" },
        },
        required: ["latex"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_molecule_3d",
      description: "Render a 3D molecular structure using 3Dmol.js.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Common name of the molecule, e.g. 'ethanol'",
          },
          smiles: {
            type: "string",
            description: "SMILES string if known, e.g. 'CCO'",
          },
          pdb: {
            type: "string",
            description: "PDB data string if available",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_force_diagram",
      description:
        "Draw a physics diagram (forces, waves, electric fields, circuits, or projectile motion) on canvas.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["forces", "waves", "electric_field", "circuit", "projectile"],
            description: "The category of physics diagram to render",
          },
          params: {
            type: "object",
            description:
              "Diagram-specific parameters such as masses, angles, amplitudes, or charge values",
          },
        },
        required: ["type"],
      },
    },
  },
];
