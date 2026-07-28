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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">

      <div className="max-h-[100dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:p-6">

        <h2 className="text-xl font-semibold">
          Edit Division
        </h2>
        
        <label className="block text-sm font-semibold text-slate-700">Nama Divisi</label>
        <input
          value={name}
          onChange={(e) =>
            setName(
              e.target.value
            )
          }
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        /> 
        <label className="block text-sm font-semibold text-slate-700">Kode Divisi</label>
        <input
          value={code}
          onChange={(e) =>
            setCode(
              e.target.value
            )
          }
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        /> 

        {/* <textarea
          value={description}
          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
        /> */}

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            onClick={submit}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            Save
          </button>

        </div>

      </div>

    </div>
  )
}