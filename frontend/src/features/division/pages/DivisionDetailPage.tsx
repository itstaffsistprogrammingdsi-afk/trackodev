import { useState }
  from 'react'

import { useParams }
  from 'react-router-dom'

import {
  useDivision
} from '../hooks/useDivisions'

import DivisionMembers
  from '../components/members/DivisionMembers'

import EditDivisionModal
  from '../components/modals/EditDivisionModal'

export default function
DivisionDetailPage() {

  const { id } = useParams()

  const [openEdit, setOpenEdit] =
    useState(false)

  const { data: division } =
    useDivision(id!)

  if (!division) {
    return (
      <div className="p-6">
        Loading...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">

      {/* ===================================== */}
      {/* HEADER */}
      {/* ===================================== */}

      <div className="border rounded-xl p-5">

        <div className="flex items-start justify-between">

          <div>

            <h1 className="text-2xl font-bold">
              {division.name}
            </h1>

            <p className="text-gray-500 mt-2">

              {division.description ||
                'No description'}

            </p>

          </div>

          <button
            onClick={() =>
              setOpenEdit(true)
            }
            className="border px-4 py-2 rounded-lg"
          >
            Edit
          </button>

        </div>

      </div>

      {/* ===================================== */}
      {/* MEMBERS */}
      {/* ===================================== */}

      <DivisionMembers
        divisionId={division.id}
      />

      {/* ===================================== */}
      {/* EDIT MODAL */}
      {/* ===================================== */}

      <EditDivisionModal
        open={openEdit}
        onClose={() =>
          setOpenEdit(false)
        }
        division={division}
      />

    </div>
  )
}