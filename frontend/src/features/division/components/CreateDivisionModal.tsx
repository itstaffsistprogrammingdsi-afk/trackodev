import { useState } from "react";
import { useCreateDivision } from "../hooks/useDivisions";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateDivisionModal({ open, onClose }: Props) {
  const createMutation = useCreateDivision();

  const [name, setName] = useState("");

  const [code, setCode] = useState("");

  const [description, setDescription] = useState("");

  if (!open) return null;

  const submit = async () => {
    await createMutation.mutateAsync({
      name,

      code: code || undefined,

      description,
    });

    setName("");
    setCode("");
    setDescription("");

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-[450px]">
        <h2 className="text-xl font-semibold mb-4">Create Division</h2>

        <div className="space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Division name"
            className="w-full border p-2 rounded"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="w-full border p-2 rounded"
          />

          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Code (optional)"
            className="w-full border p-2 rounded"
          />
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>

          <button
            onClick={submit}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
