import bcrypt from "bcryptjs";

import { envVars } from "../config/env";

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, envVars.BCRYPT_SALT_ROUND);

export const comparePassword = (plain: string, hashed: string): Promise<boolean> =>
  bcrypt.compare(plain, hashed);
