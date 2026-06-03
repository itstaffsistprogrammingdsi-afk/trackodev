import { useState }
  from 'react'

import {
  Division
} from '../../types'

import {
  useUpdateDivision
} from '../../hooks/useDivisions'

type Props = {
  open: boolean
  onClose: () => void
  division: Division
}

export default function
EditDivisionModal({
  open,
  onClose,
  division
}: Props) {

  const updateMutation =
    useUpdateDivision()

  const [name, setName] =
    useState(division.name)

  const [code, setCode] =
    useState(
      division.code || ''
    )

  // const [description,
  //   setDescription] =
  //     useState(
  //       division.description || ''
  //     )

  if (!open) return null

  const submit = async () => {

    await updateMutation
      .mutateAsync({

        id: division.id,

        data: {
          name,
          code
          // description
        }

      })

    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

      <div className="bg-white rounded-xl p-6 w-[500px] space-y-4">

        <h2 className="text-xl font-semibold">
          Edit Division
        </h2>
        
        Nama Divisi
        <input
          value={name}
          onChange={(e) =>
            setName(
              e.target.value
            )
          }
          className="w-full border p-2 rounded"
        /> 
        Kode Divisi
        <input
          value={code}
          onChange={(e) =>
            setCode(
              e.target.value
            )
          }
          className="w-full border p-2 rounded"
        /> 

        {/* <textarea
          value={description}
          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }
          className="w-full border p-2 rounded"
        /> */}

        <div className="flex justify-end gap-2">

          <button
            onClick={onClose}
            className="border px-4 py-2 rounded"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Save
          </button>

        </div>

      </div>

    </div>
  )
}