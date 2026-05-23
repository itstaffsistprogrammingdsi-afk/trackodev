export const hasPermission = (
  permissions: string[],
  permission: string
) => {
  return permissions.includes(permission);
};