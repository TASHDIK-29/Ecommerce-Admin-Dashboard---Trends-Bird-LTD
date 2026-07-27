import dotenv from "dotenv";

dotenv.config();

/**
 * The single source of truth for configuration.
 *
 * This is the ONLY file in the codebase allowed to touch `process.env`.
 * It validates on import, so a missing key crashes the process at boot
 * rather than surfacing as a confusing 500 on some request an hour later.
 */
export interface EnvConfig {
  NODE_ENV: "development" | "production" | "test";
  PORT: string;
  FRONTEND_URL: string;
  DATABASE_URL: string;
  JWT: {
    ACCESS_SECRET: string;
    ACCESS_EXPIRES: string;
    REFRESH_SECRET: string;
    REFRESH_EXPIRES: string;
  };
  BCRYPT_SALT_ROUND: number;
  SEED: {
    SUPER_ADMIN_NAME: string;
    SUPER_ADMIN_EMAIL: string;
    SUPER_ADMIN_PASSWORD: string;
    CATALOG_USER_NAME: string;
    CATALOG_USER_EMAIL: string;
    CATALOG_USER_PASSWORD: string;
  };
  CLOUDINARY: {
    CLOUD_NAME: string;
    API_KEY: string;
    API_SECRET: string;
    FOLDER: string;
  };
  MAX_FILE_SIZE_MB: number;
}

/**
 * Keys that must be present for the server to boot at all.
 *
 * Cloudinary keys are deliberately NOT in this list: they are validated
 * lazily by the Media module (see config/cloudinary.ts) so that the rest of
 * the API can be developed and reviewed without a Cloudinary account.
 */
const requiredEnvVariables: string[] = [
  "NODE_ENV",
  "PORT",
  "FRONTEND_URL",
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_ACCESS_EXPIRES",
  "JWT_REFRESH_SECRET",
  "JWT_REFRESH_EXPIRES",
  "BCRYPT_SALT_ROUND",
  "SUPER_ADMIN_NAME",
  "SUPER_ADMIN_EMAIL",
  "SUPER_ADMIN_PASSWORD",
  "CATALOG_USER_NAME",
  "CATALOG_USER_EMAIL",
  "CATALOG_USER_PASSWORD",
];

const loadEnvVariables = (): EnvConfig => {
  const missing = requiredEnvVariables.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}. ` +
        `Copy .env.example to .env and fill them in.`,
    );
  }

  const nodeEnv = process.env.NODE_ENV as EnvConfig["NODE_ENV"];
  if (!["development", "production", "test"].includes(nodeEnv)) {
    throw new Error(
      `NODE_ENV must be one of development | production | test, received "${nodeEnv}".`,
    );
  }

  const saltRound = Number(process.env.BCRYPT_SALT_ROUND);
  if (!Number.isInteger(saltRound) || saltRound < 10 || saltRound > 15) {
    throw new Error(
      `BCRYPT_SALT_ROUND must be an integer between 10 and 15, received "${process.env.BCRYPT_SALT_ROUND}".`,
    );
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: process.env.PORT as string,
    FRONTEND_URL: process.env.FRONTEND_URL as string,
    DATABASE_URL: process.env.DATABASE_URL as string,
    JWT: {
      ACCESS_SECRET: process.env.JWT_ACCESS_SECRET as string,
      ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES as string,
      REFRESH_SECRET: process.env.JWT_REFRESH_SECRET as string,
      REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES as string,
    },
    BCRYPT_SALT_ROUND: saltRound,
    SEED: {
      SUPER_ADMIN_NAME: process.env.SUPER_ADMIN_NAME as string,
      SUPER_ADMIN_EMAIL: process.env.SUPER_ADMIN_EMAIL as string,
      SUPER_ADMIN_PASSWORD: process.env.SUPER_ADMIN_PASSWORD as string,
      CATALOG_USER_NAME: process.env.CATALOG_USER_NAME as string,
      CATALOG_USER_EMAIL: process.env.CATALOG_USER_EMAIL as string,
      CATALOG_USER_PASSWORD: process.env.CATALOG_USER_PASSWORD as string,
    },
    CLOUDINARY: {
      CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ?? "",
      API_KEY: process.env.CLOUDINARY_API_KEY ?? "",
      API_SECRET: process.env.CLOUDINARY_API_SECRET ?? "",
      FOLDER: process.env.CLOUDINARY_FOLDER ?? "trends-bird/media",
    },
    MAX_FILE_SIZE_MB: Number(process.env.MAX_FILE_SIZE_MB ?? 10),
  };
};

export const envVars: EnvConfig = loadEnvVariables();

export const isProduction = envVars.NODE_ENV === "production";
export const isDevelopment = envVars.NODE_ENV === "development";
