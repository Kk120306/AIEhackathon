import type { FridayResponse } from "../page";

export async function getMockFridayResponse(
  question: string
): Promise<FridayResponse> {
  await new Promise((resolve) => setTimeout(resolve, 800));

  const q = question.toLowerCase();

  if (
    q.includes("graph") ||
    q.includes("desmos") ||
    q.includes("x squared") ||
    q.includes("x^2") ||
    q.includes("function") ||
    q.includes("transform")
  ) {
    return {
      subject: "H2 Mathematics",
      topic: "Graph Transformation",
      spoken_answer:
        "This is a graph transformation question. Start with the base graph y equals x squared. The expression x minus 3 shifts the graph 3 units to the right. The coefficient 2 stretches it vertically, making the graph narrower. The plus 1 shifts the graph upward by 1 unit.",
      needs_visualization: true,
      visualization_tool: "desmos",
      visualization_url: "https://www.desmos.com/calculator",
      display_steps: [
        "Start with the base graph: y = x².",
        "Replace x with (x - 3), shifting the graph 3 units to the right.",
        "Multiply by 2, causing a vertical stretch.",
        "Add 1, shifting the graph 1 unit upward.",
      ],
      exam_tip:
        "For graph transformations, handle horizontal changes inside the bracket first, then vertical stretches and shifts.",
    };
  }

  if (
    q.includes("force") ||
    q.includes("drag") ||
    q.includes("car") ||
    q.includes("newton") ||
    q.includes("acceleration")
  ) {
    return {
      subject: "H2 Physics",
      topic: "Forces and Motion",
      spoken_answer:
        "This is a free-body diagram problem. The object has weight acting downward, normal reaction upward, a driving or applied force forward, and drag or resistive force backward. If the forward force is larger than the drag, the object accelerates forward. If both are equal, it moves at constant velocity.",
      needs_visualization: true,
      visualization_tool: "force_diagram",
      display_steps: [
        "Weight acts downward due to gravity.",
        "Normal reaction acts upward from the surface.",
        "Driving or applied force acts in the direction of motion.",
        "Drag or resistive force acts opposite to motion.",
      ],
      diagram_data: {
        object: q.includes("car") ? "car" : "object",
        forces: [
          { label: "Normal reaction", direction: "up" },
          { label: "Weight mg", direction: "down" },
          { label: "Drag", direction: "left" },
          { label: "Driving force", direction: "right" },
        ],
      },
      exam_tip:
        "In a free-body diagram, only draw forces acting on the object itself.",
    };
  }

  if (
    q.includes("methane") ||
    q.includes("molecular geometry") ||
    q.includes("shape") ||
    q.includes("vsepr")
  ) {
    return {
      subject: "H2 Chemistry",
      topic: "Molecular Geometry",
      spoken_answer:
        "Methane has a tetrahedral molecular geometry. Carbon is the central atom and forms four single covalent bonds with hydrogen atoms. Since there are four bonding pairs and no lone pairs around carbon, the bond angle is about 109.5 degrees.",
      needs_visualization: true,
      visualization_tool: "molview",
      visualization_url: "https://molview.org/?cid=297",
      display_steps: [
        "Carbon is the central atom.",
        "Carbon forms four single bonds with hydrogen.",
        "There are four bonding pairs and zero lone pairs.",
        "The shape is tetrahedral with bond angles of about 109.5 degrees.",
      ],
      exam_tip:
        "For VSEPR questions, count bonding pairs and lone pairs around the central atom.",
    };
  }

  if (
    q.includes("nucleophilic") ||
    q.includes("substitution") ||
    q.includes("sn1") ||
    q.includes("sn2") ||
    q.includes("bromoethane")
  ) {
    return {
      subject: "H2 Chemistry",
      topic: "Nucleophilic Substitution",
      spoken_answer:
        "This is a nucleophilic substitution mechanism. In an SN2 reaction, the nucleophile attacks the electron-deficient carbon from the opposite side of the leaving group. At the same time, the carbon-halogen bond breaks and the leaving group exits.",
      needs_visualization: true,
      visualization_tool: "chem_mechanism",
      display_steps: [
        "Identify the nucleophile, such as hydroxide ion.",
        "Identify the electron-deficient carbon bonded to the halogen.",
        "The nucleophile attacks the carbon from the opposite side.",
        "The carbon-halogen bond breaks at the same time.",
        "The leaving group exits and the substitution product forms.",
      ],
      exam_tip:
        "For SN2, remember: one-step mechanism, backside attack, and rate depends on both the haloalkane and nucleophile.",
    };
  }

  return {
    subject: "General H2 Science",
    topic: "Concept Explanation",
    spoken_answer:
      "I can help with this concept. I will explain it step by step at Singapore A-Level standard, focusing on the key idea, the method, and the common exam mistake.",
    needs_visualization: false,
    visualization_tool: "none",
    display_steps: [
      "Identify the topic being tested.",
      "State the key principle or formula.",
      "Apply the principle step by step.",
      "Check the final answer against the exam context.",
    ],
    exam_tip:
      "Always connect your explanation back to the specific command word in the question.",
  };
}