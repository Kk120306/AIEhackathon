import type { ChatCompletionTool } from "openai/resources/chat";

export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "show_desmos_graph",
      description:
        "Plot one or more mathematical functions or equations using Desmos. Use whenever the student asks to graph, plot, or visualise a function.",
      parameters: {
        type: "object",
        properties: {
          expressions: {
            type: "array",
            items: { type: "string" },
            description:
              "Array of LaTeX expressions to plot, e.g. [\"y=x^{2}+3x-2\", \"y=2x+1\"]",
          },
          explanation: {
            type: "string",
            description:
              "Short narration describing what the student will see on screen, e.g. 'This shows a parabola opening upward with vertex at (-1.5, -4.25).'",
          },
        },
        required: ["expressions"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_molecule_3d",
      description:
        "Render a 3D molecular structure using 3Dmol.js. Use for any chemistry question involving a specific compound or structure.",
      parameters: {
        type: "object",
        properties: {
          molecule_name: {
            type: "string",
            description: "Common or IUPAC name of the molecule, e.g. 'ethanol'",
          },
          smiles: {
            type: "string",
            description: "SMILES string if known, e.g. 'CCO'",
          },
          pubchem_cid: {
            type: "string",
            description:
              "PubChem Compound ID if known, e.g. '702' for ethanol. Used to fetch structure data from PubChem.",
          },
        },
        required: ["molecule_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "show_steps_breakdown",
      description:
        "Display a numbered, step-by-step worked solution in the steps panel. Use for multi-step calculations, derivations, or proofs where showing the working is important.",
      parameters: {
        type: "object",
        properties: {
          steps: {
            type: "array",
            items: { type: "string" },
            description:
              "Ordered array of solution steps. Each step may include LaTeX, e.g. [\"Rearrange to standard form: $ax^2+bx+c=0$\", \"Apply quadratic formula: $x=\\\\frac{-b\\\\pm\\\\sqrt{b^2-4ac}}{2a}$\"]",
          },
          topic: {
            type: "string",
            description:
              "Label for the worked solution, e.g. 'Solving a Quadratic Equation'",
          },
        },
        required: ["steps"],
      },
    },
  },
];
