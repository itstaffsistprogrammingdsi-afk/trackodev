import { useForm } from 'react-hook-form'
import { useCreateDivision } from '../hooks/useDivisions'

type Props = {
  open: boolean
  onClose: () => void
}

type FormData = {
  name: string
  description?: string
}

export default function CreateDivisionModal({ open, onClose }: Props) {
  const { register, handleSubmit, reset } = useForm<FormData>()
  const mutation = useCreateDivision()

  if (!open) return null

  const onSubmit = (data: FormData) => {
    mutation.mutate(data, {
      onSuccess: () => {
        reset()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-[400px] space-y-4">
        <h2 className="text-lg font-semibold">Create Division</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <input
            {...register('name', { required: true })}
            placeholder="Division name"
            className="w-full border p-2 rounded"
          />

          <textarea
            {...register('description')}
            placeholder="Description"
            className="w-full border p-2 rounded"
          />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}>
              Cancel
            </button>

            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}