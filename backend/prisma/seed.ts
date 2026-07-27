/* eslint-disable no-console */
import { PrismaClient, RoleStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";

const prisma = new PrismaClient();

const PERMISSION_GROUPS: {
  name: string;
  slug: string;
  description: string;
  actions: string[];
}[] = [
  {
    name: "Dashboard",
    slug: "dashboard",
    description: "Access to the dashboard overview screen.",
    actions: ["watch"],
  },
  {
    name: "Permission",
    slug: "permission",
    description: "Defines every capability in the system, grouped by module.",
    actions: ["watch", "create", "read", "update", "delete"],
  },
  {
    name: "Role",
    slug: "role",
    description: "Bundles permissions into a named job function.",
    actions: ["watch", "create", "read", "update", "delete"],
  },
  {
    name: "User",
    slug: "user",
    description: "Dashboard accounts, each holding one role.",
    actions: ["watch", "create", "read", "update", "delete"],
  },
  {
    name: "Media",
    slug: "media",
    description: "Shared library of uploaded files that other modules attach from.",
    actions: ["watch", "read", "upload", "write", "delete"],
  },
  {
    name: "Category",
    slug: "category",
    description: "Nested category tree a product is filed under.",
    actions: ["watch", "create", "read", "update", "delete"],
  },
  {
    name: "Brand",
    slug: "brand",
    description: "The manufacturer or label a product belongs to.",
    actions: ["watch", "create", "read", "update", "delete"],
  },
  {
    name: "Attribute",
    slug: "attribute",
    description: "Dimensions a product varies along, and their values.",
    actions: ["watch", "create", "read", "update", "delete"],
  },
  {
    name: "Product",
    slug: "product",
    description: "Products, variants, and their categories, brand and media.",
    actions: ["watch", "create", "read", "update", "delete"],
  },
];

const CATALOG_GROUP_SLUGS = ["dashboard", "media", "category", "brand", "attribute", "product"];

const SUPER_ADMIN_ROLE = "Super Admin";
const CATALOG_ROLE = "Catalog Manager";

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable ${key}`);
  return value;
};

const seedPermissions = async (): Promise<void> => {
  for (const group of PERMISSION_GROUPS) {
    const record = await prisma.permissionGroup.upsert({
      where: { slug: group.slug },
      update: { name: group.name, description: group.description },
      create: { name: group.name, slug: group.slug, description: group.description },
    });

    for (const action of group.actions) {
      const name = `${group.slug}:${action}`;
      await prisma.permission.upsert({
        where: { name },
        update: { description: `Can ${action} ${group.name.toLowerCase()}.` },
        create: {
          name,
          action,
          description: `Can ${action} ${group.name.toLowerCase()}.`,
          groupId: record.id,
        },
      });
    }
  }

  const total = await prisma.permission.count();
  console.log(`  permissions: ${total} across ${PERMISSION_GROUPS.length} groups`);
};

const upsertRoleWithPermissions = async (
  name: string,
  description: string,
  permissionIds: string[],
  isSystem: boolean,
): Promise<string> => {
  const role = await prisma.role.upsert({
    where: { name },
    update: { description, status: RoleStatus.ACTIVE, isSystem },
    create: { name, description, status: RoleStatus.ACTIVE, isSystem },
  });

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId: role.id } }),
    prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    }),
  ]);

  console.log(`  role "${name}": ${permissionIds.length} permissions`);
  return role.id;
};

const upsertUser = async (
  name: string,
  email: string,
  password: string,
  roleId: string,
): Promise<void> => {
  const saltRound = Number(process.env.BCRYPT_SALT_ROUND ?? 12);
  const hashed = await bcrypt.hash(password, saltRound);

  await prisma.user.upsert({
    where: { email },
    update: { name, password: hashed, roleId, isActive: true, isDeleted: false },
    create: { name, email, password: hashed, roleId, isActive: true },
  });

  console.log(`  user "${email}" -> role ${roleId}`);
};

const main = async (): Promise<void> => {
  console.log("Seeding database...");

  console.log("- permissions");
  await seedPermissions();

  console.log("- roles");
  const allPermissions = await prisma.permission.findMany({ select: { id: true } });
  const superAdminRoleId = await upsertRoleWithPermissions(
    SUPER_ADMIN_ROLE,
    "Full access to every module and action.",
    allPermissions.map((p) => p.id),
    true,
  );

  const catalogPermissions = await prisma.permission.findMany({
    where: { group: { slug: { in: CATALOG_GROUP_SLUGS } } },
    select: { id: true },
  });
  const catalogRoleId = await upsertRoleWithPermissions(
    CATALOG_ROLE,
    "Catalog access only. No permission, role or user administration.",
    catalogPermissions.map((p) => p.id),
    false,
  );

  console.log("- users");
  await upsertUser(
    requireEnv("SUPER_ADMIN_NAME"),
    requireEnv("SUPER_ADMIN_EMAIL").toLowerCase(),
    requireEnv("SUPER_ADMIN_PASSWORD"),
    superAdminRoleId,
  );
  await upsertUser(
    requireEnv("CATALOG_USER_NAME"),
    requireEnv("CATALOG_USER_EMAIL").toLowerCase(),
    requireEnv("CATALOG_USER_PASSWORD"),
    catalogRoleId,
  );

  console.log("\nSeed complete.");
  console.log(`  Super admin : ${requireEnv("SUPER_ADMIN_EMAIL")}`);
  console.log(`  Catalog user: ${requireEnv("CATALOG_USER_EMAIL")}  (expect 403 on permission/role/user routes)`);
};

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
