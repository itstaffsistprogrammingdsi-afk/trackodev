import {
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'

import * as api from '../api/division.api'

import {
  Division,
  DivisionMember,
  CreateDivisionPayload,
  UpdateDivisionPayload,
  AddDivisionMemberPayload,
  RemoveDivisionMemberPayload
} from '../types'

/*
|--------------------------------------------------------------------------
| DIVISIONS
|--------------------------------------------------------------------------
*/

export const useDivisions = (ownOnly = false, enabled = true) => {

  return useQuery<Division[]>({

    queryKey: ['divisions', ownOnly ? 'mine' : 'all'],

    queryFn: ownOnly ? api.getMyDivisions : api.getDivisions,
    enabled,
    // Division changes are invalidated by RealtimeSync. Polling here caused
    // repeated requests even when there was no user-visible change.
    refetchOnWindowFocus: false,

  })
}

export const useDivision = (
  id: string
) => {

  return useQuery<Division>({

    queryKey: [
      'division',
      id
    ],

    queryFn: () =>
      api.getDivision(id),

    enabled: !!id,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,

  })
}

export const useCreateDivision =
  () => {

    const qc =
      useQueryClient()

    return useMutation({

      mutationFn: (
        data: CreateDivisionPayload
      ) => api.createDivision(data),

      onSuccess: () => {

        qc.invalidateQueries({
          queryKey: ['divisions']
        })

      }

    })
  }

export const useUpdateDivision =
  () => {

    const qc =
      useQueryClient()

    return useMutation({

      mutationFn: ({
        id,
        data
      }: UpdateDivisionPayload) =>

        api.updateDivision(
          id,
          data
        ),

      onSuccess: () => {

        qc.invalidateQueries({
          queryKey: ['divisions']
        })

      }

    })
  }

export const useDeleteDivision =
  () => {

    const qc =
      useQueryClient()

    return useMutation({

      mutationFn:
        api.deleteDivision,

      onSuccess: () => {

        qc.invalidateQueries({
          queryKey: ['divisions']
        })

      }

    })
  }

/*
|--------------------------------------------------------------------------
| MEMBERS
|--------------------------------------------------------------------------
*/

export const useDivisionMembers =
  (
    divisionId: string
  ) => {

    return useQuery<DivisionMember[]>({

      queryKey: [
        'division-members',
        divisionId
      ],

      queryFn: () =>

        api.getDivisionMembers(
          divisionId
        ),

      enabled: !!divisionId,
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,

    })
  }

export const useAddDivisionMember =
  () => {

    const qc =
      useQueryClient()

    return useMutation({

      mutationFn: ({
        divisionId,
        data
      }: AddDivisionMemberPayload) =>

        api.addDivisionMember(
          divisionId,
          data
        ),

      onSuccess: (
        _,
        variables
      ) => {

        qc.invalidateQueries({

          queryKey: [
            'division-members',
            variables.divisionId
          ]

        })

      }

    })
  }

export const useRemoveDivisionMember =
  () => {

    const qc =
      useQueryClient()

    return useMutation({

      mutationFn: ({
        divisionId,
        userId
      }: RemoveDivisionMemberPayload) =>

        api.removeDivisionMember(
          divisionId,
          userId
        ),

      onSuccess: (
        _,
        variables
      ) => {

        qc.invalidateQueries({

          queryKey: [
            'division-members',
            variables.divisionId
          ]

        })

      }

    })
  }
