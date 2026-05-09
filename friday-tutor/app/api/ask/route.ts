export async function POST(req: Request) {
  try {
    const body = await req.json();
    const question = body.question;

    // TEMP: static response (replace later with LLM)
    const response = {
      subject: "H2 Physics",
      topic: "Forces and Motion",
      spoken_answer:
        "This is a free-body diagram problem. The car has weight acting downward, normal reaction upward, driving force forward, and drag acting backward.",
      needs_visualization: true,
      visualization_tool: "force_diagram",
      visualization_url: "",
      display_steps: [
        "Weight acts downward due to gravity.",
        "Normal reaction acts upward from the ground.",
        "Driving force acts forward.",
        "Drag acts opposite to motion.",
      ],
      diagram_data: {
        object: "car",
        forces: [
          { label: "Normal reaction", direction: "up" },
          { label: "Weight mg", direction: "down" },
          { label: "Drag", direction: "left" },
          { label: "Driving force", direction: "right" },
        ],
      },
      exam_tip:
        "Only draw forces acting on the object itself in a free-body diagram.",
    };

    return Response.json(response);
  } catch (error) {
    console.error(error);

    return Response.json(
      {
        subject: "Error",
        topic: "Fallback",
        spoken_answer: "Something went wrong. Please try again.",
        needs_visualization: false,
        visualization_tool: "none",
        display_steps: [],
        exam_tip: "",
      },
      { status: 500 }
    );
  }
}