import {
  useQuery,
  useMutation,
  useQueryClient
} from '@tanstack/react-query'

import * as api from '../api/division.api'
import { Division } from '../types'

export const useDivisions = () => {
  return useQuery<Division[]>({
    queryKey: ['divisions'],
    queryFn: api.getDivisions
  })
}

export const useCreateDivision = () => {

  const qc = useQueryClient()

  return useMutation({

    mutationFn: api.createDivision,

    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ['divisions']
      })
    }

  })
}

export const useUpdateDivision = () => {

  const qc = useQueryClient()

  return useMutation({

    mutationFn: ({
      id,
      data
    }: {
      id: string
      data: {
        name?: string
        code?: string
        description?: string
      }
    }) =>
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