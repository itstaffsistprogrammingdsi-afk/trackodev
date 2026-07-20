export type Workspace = {
  id: string
  division_id: string
  name: string
  description?: string
  created_at: string
}

export type CreateWorkspacePayload = {
  name: string
  description?: string
}

export type UpdateWorkspacePayload = {
  name?: string
  description?: string
}
