"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { MediaField } from "@/components/shared/media-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMediaAsset, type MediaAsset } from "@/hooks/use-media";
import { useRoles } from "@/hooks/use-roles";
import {
  useCreateUser,
  useUpdateUser,
  type Gender,
  type UserRow,
} from "@/hooks/use-users";
import { useAuth } from "@/lib/auth-context";
import { applyApiErrors } from "@/lib/form-errors";

/** Mirrors the server's policy so the feedback is immediate. */
const password = z
  .string()
  .min(8, "At least 8 characters.")
  .max(72, "At most 72 characters.")
  .regex(/[a-z]/, "Needs a lowercase letter.")
  .regex(/[A-Z]/, "Needs an uppercase letter.")
  .regex(/[0-9]/, "Needs a number.");

const buildSchema = (isEdit: boolean) =>
  z.object({
    name: z.string().trim().min(2, "At least 2 characters.").max(100),
    email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
    // On edit an empty field means "leave the password unchanged".
    password: isEdit ? z.union([z.literal(""), password]) : password,
    phone: z
      .union([
        z.literal(""),
        z.string().trim().min(6, "At least 6 characters.").max(20).regex(/^\+?[0-9][0-9\s-]*$/, "Enter a valid phone number."),
      ])
      .optional(),
    gender: z.union([z.literal(""), z.enum(["MALE", "FEMALE", "OTHER"])]).optional(),
    roleId: z.string().min(1, "Pick a role. Every user must have one."),
  });

type FormValues = z.infer<ReturnType<typeof buildSchema>>;

const FIELDS = ["name", "email", "password", "phone", "gender", "roleId", "isActive"] as const;

const UserForm = ({
  user,
  onDone,
  onCancel,
}: {
  user?: UserRow | null;
  onDone: () => void;
  onCancel: () => void;
}) => {
  const isEdit = Boolean(user);
  const { user: currentUser } = useAuth();
  const isSelf = Boolean(user && currentUser && user.id === currentUser.id);

  const rolesQuery = useRoles({ limit: 100, status: "ACTIVE" });
  const avatarQuery = useMediaAsset(user?.avatarId);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [avatar, setAvatar] = useState<MediaAsset | null>(null);
  const [avatarTouched, setAvatarTouched] = useState(false);
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(buildSchema(isEdit)),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      phone: user?.phone ?? "",
      gender: (user?.gender ?? "") as Gender | "",
      roleId: user?.role.id ?? "",
    },
  });

  const roles = rolesQuery.data?.data ?? [];
  const isPending = createUser.isPending || updateUser.isPending;
  const currentAvatar = avatarTouched ? avatar : (avatarQuery.data ?? null);

  const onSubmit = handleSubmit(async (values) => {
    setFormErrors([]);

    const shared = {
      name: values.name,
      email: values.email,
      phone: values.phone || undefined,
      gender: (values.gender || undefined) as Gender | undefined,
      avatarId: avatarTouched ? (avatar?.id ?? null) : undefined,
    };

    try {
      if (isEdit && user) {
        await updateUser.mutateAsync({
          id: user.id,
          payload: {
            ...shared,
            password: values.password || undefined,
            // The server rejects changing your own role or status, so the form
            // never sends them for the signed-in user.
            ...(isSelf ? {} : { roleId: values.roleId, isActive }),
          },
        });
        toast.success(`"${values.name}" updated.`);
      } else {
        await createUser.mutateAsync({
          ...shared,
          password: values.password,
          roleId: values.roleId,
          isActive,
        });
        toast.success(`"${values.name}" created.`);
      }
      onDone();
    } catch (error) {
      setFormErrors(applyApiErrors(error, setError, FIELDS));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {formErrors.length > 0 ? (
        <Alert variant="destructive">
          <AlertDescription>
            {formErrors.map((message) => (
              <span key={message} className="block">
                {message}
              </span>
            ))}
          </AlertDescription>
        </Alert>
      ) : null}

      {isSelf ? (
        <Alert>
          <Info className="size-4" aria-hidden />
          <AlertDescription>
            This is your own account, so its role and active status cannot be changed here.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" aria-invalid={Boolean(errors.name)} {...register("name")} />
          {errors.name ? <p className="text-sm text-destructive">{errors.name.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="off"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? <p className="text-sm text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">
            Password {isEdit ? <span className="text-muted-foreground">(leave blank to keep)</span> : null}
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password ? (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              8+ characters with upper case, lower case and a number.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" placeholder="+8801711111111" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
          {errors.phone ? <p className="text-sm text-destructive">{errors.phone.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender</Label>
          <Select
            defaultValue={user?.gender ?? ""}
            onValueChange={(value) => setValue("gender", value as Gender)}
          >
            <SelectTrigger id="gender">
              <SelectValue placeholder="Not specified" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MALE">Male</SelectItem>
              <SelectItem value="FEMALE">Female</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="roleId">
            Role <span className="text-destructive">*</span>
          </Label>
          <Select
            defaultValue={user?.role.id ?? ""}
            disabled={isSelf || rolesQuery.isLoading}
            onValueChange={(value) => setValue("roleId", value, { shouldValidate: true })}
          >
            <SelectTrigger id="roleId" aria-invalid={Boolean(errors.roleId)}>
              <SelectValue placeholder={rolesQuery.isLoading ? "Loading roles…" : "Pick a role"} />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.roleId ? (
            <p className="text-sm text-destructive">{errors.roleId.message}</p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Avatar</Label>
          <MediaField
            value={currentAvatar}
            onChange={(asset) => {
              setAvatar(asset);
              setAvatarTouched(true);
            }}
            label="avatar"
            disabled={isPending}
          />
        </div>

        <div className="flex items-center justify-between rounded-md border p-3 sm:col-span-2">
          <div>
            <p className="text-sm font-medium">Active</p>
            <p className="text-xs text-muted-foreground">
              A deactivated user can neither sign in nor refresh their session.
            </p>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={setIsActive}
            disabled={isSelf || isPending}
            aria-label="Active"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {isEdit ? "Save changes" : "Create user"}
        </Button>
      </DialogFooter>
    </form>
  );
};

export const UserDialog = ({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserRow | null;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{user ? "Edit user" : "New user"}</DialogTitle>
        <DialogDescription>
          Every user holds exactly one role, and it is never defaulted.
        </DialogDescription>
      </DialogHeader>

      {open ? (
        <UserForm
          key={user?.id ?? "new"}
          user={user}
          onDone={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      ) : null}
    </DialogContent>
  </Dialog>
);
