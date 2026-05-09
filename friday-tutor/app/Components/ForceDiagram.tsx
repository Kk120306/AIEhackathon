type Force = {
  label: string;
  direction: "up" | "down" | "left" | "right";
};

type ForceDiagramData = {
  object?: string;
  forces?: Force[];
};

type ForceDiagramProps = {
  data?: ForceDiagramData;
};

export default function ForceDiagram({ data }: ForceDiagramProps) {
  const object = data?.object || "object";
  const forces = data?.forces || [];

  const getForce = (direction: Force["direction"]) =>
    forces.find((force) => force.direction === direction);

  const up = getForce("up");
  const down = getForce("down");
  const left = getForce("left");
  const right = getForce("right");

  return (
    <div className="rounded-xl border border-gray-800 bg-black p-6">
      <h3 className="mb-4 text-xl font-bold text-white">
        Free-body diagram: {object}
      </h3>

      <div className="relative mx-auto flex h-[380px] max-w-xl items-center justify-center rounded-2xl border border-gray-700 bg-gray-950">
        {up && (
          <div className="absolute top-6 text-center text-green-400">
            <div className="text-5xl leading-none">↑</div>
            <p className="mt-1 text-sm font-semibold">{up.label}</p>
          </div>
        )}

        {down && (
          <div className="absolute bottom-6 text-center text-red-400">
            <p className="mb-1 text-sm font-semibold">{down.label}</p>
            <div className="text-5xl leading-none">↓</div>
          </div>
        )}

        {left && (
          <div className="absolute left-6 flex items-center gap-2 text-yellow-400">
            <span className="text-sm font-semibold">{left.label}</span>
            <span className="text-5xl leading-none">←</span>
          </div>
        )}

        {right && (
          <div className="absolute right-6 flex items-center gap-2 text-blue-400">
            <span className="text-5xl leading-none">→</span>
            <span className="text-sm font-semibold">{right.label}</span>
          </div>
        )}

        <div className="rounded-2xl border border-gray-600 bg-gray-800 px-10 py-6 text-center shadow-xl">
          <div className="text-6xl">{object.toLowerCase() === "car" ? "🚗" : "⬛"}</div>
          <p className="mt-2 text-sm uppercase tracking-widest text-gray-400">
            {object}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-400">
        ACE generated this custom diagram from the physical situation in the
        question.
      </p>
    </div>
  );
}