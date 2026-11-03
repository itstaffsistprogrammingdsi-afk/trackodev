export type Workspace = {
  id: string
  division_id: string
  name: string
  description?: string
  created_at: string
}

export type WorkspaceAccessLevel = "join_only" | "view_all" | "full";

export type WorkspaceMemberSource = "manual" | "auto";

export type WorkspaceMember = {
  id: string
  name: string
  email: string
  avatar?: string | null
  access: WorkspaceAccessLevel
  source?: WorkspaceMemberSource
  division_names?: string[]
}

export type MentionableUser = {
  id: string
  name: string
  email: string
  avatar?: string | null
  division_names?: string[]
}

export type CreateWorkspacePayload = {
  name: string
  description?: string
}

export type UpdateWorkspacePayload = {
  name?: string
  description?: string
}
