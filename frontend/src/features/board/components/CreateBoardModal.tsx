import { useForm } from 'react-hook-form'
import { useCreateBoard } from '../hooks/useBoards'

type Props = {
  open: boolean
  onClose: () => void
  campaignId: string
}

type FormData = {
  name: string
}

export default function CreateBoardModal({ open, onClose, campaignId }: Props) {
  const { register, handleSubmit, reset } = useForm<FormData>()
  const mutation = useCreateBoard(campaignId)

  if (!open) return null

  const onSubmit = (data: FormData) => {
    mutation.mutate(data, {
      onSuccess: () => {
        reset()
        onClose()
      },
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-[400px]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <input
            {...register('name', { required: true })}
            placeholder="Board name"
            className="w-full border p-2 rounded"
          />

          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Create
          </button>
        </form>
      </div>
    </div>
  )
}