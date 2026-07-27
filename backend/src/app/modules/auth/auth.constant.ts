export const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

export const sessionUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  gender: true,
  avatarId: true,
  isActive: true,
  role: {
    select: {
      id: true,
      name: true,
      status: true,
      permissions: {
        select: { permission: { select: { name: true } } },
      },
    },
  },
} as const;
