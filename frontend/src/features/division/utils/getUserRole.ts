export type RoleType =
  | 'super_admin'
  | 'admin'
  | 'user'

type UserLike = {
  role?: string
  roles?: string[]
}

export const getUserRole = (
  user?: UserLike | null
): RoleType => {

  if (!user)
    return 'user'

  if (
    user.role &&
    [
      'super_admin',
      'admin',
      'user'
    ].includes(user.role)
  ) {

    return user.role as RoleType
  }

  if (
    user.roles &&
    user.roles.length > 0
  ) {

    const role = user.roles[0]

    if (
      [
        'super_admin',
        'admin',
        'user'
      ].includes(role)
    ) {

      return role as RoleType
    }
  }

  return 'user'
}