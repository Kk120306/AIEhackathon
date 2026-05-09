type ChemMechanismProps = {
  steps: string[];
};

export default function ChemMechanism({ steps }: ChemMechanismProps) {
  const safeSteps =
    steps?.length > 0
      ? steps
      : [
          "Identify the nucleophile.",
          "Identify the electron-deficient carbon.",
          "The nucleophile attacks the carbon.",
          "The leaving group exits.",
          "The substitution product forms.",
        ];

  return (
    <div className="rounded-xl border border-gray-800 bg-black p-6">
      <h3 className="mb-4 text-xl font-bold text-white">
        Chemistry Mechanism Visualizer
      </h3>

      <div className="space-y-4">
        {safeSteps.map((step, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-500 font-bold text-white">
              {index + 1}
            </div>

            <div className="flex-1 rounded-xl border border-gray-700 bg-gray-950 p-4">
              <p className="text-gray-100">{step}</p>
            </div>

            {index < safeSteps.length - 1 && (
              <div className="hidden text-2xl text-purple-400 sm:block">→</div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-purple-800 bg-purple-950/40 p-4">
        <p className="text-sm text-purple-200">
          Friday uses this panel for reaction mechanisms and MolView for
          molecular structures.
        </p>
      </div>
    </div>
  );
}