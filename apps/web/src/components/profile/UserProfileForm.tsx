"use client";

import type { UserPublic } from "@uganda-cbc-sms/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema } from "@uganda-cbc-sms/shared";
import { Camera } from "lucide-react";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiPatch, apiUpload } from "@/lib/api";
import { resolveUploadUrl } from "@/lib/media";
import { useAuthStore } from "@/store/authStore";

type Form = z.infer<typeof updateProfileSchema>;

type ProfileUser = UserPublic & {
  photoUrl?: string | null;
};

export function UserProfileForm({ initial }: { initial: ProfileUser }) {
  const updateAuthUser = useAuthStore((s) => s.updateUser);
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: initial.fullName,
      email: initial.email,
    },
  });

  const displayPhoto = previewUrl ?? resolveUploadUrl(photoUrl);

  const initials = useMemo(() => {
    const name = form.watch("fullName") || initial.fullName;
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }, [form, initial.fullName]);

  const onPickPhoto = () => fileRef.current?.click();

  const onPhotoChange = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    setOk(null);
    const local = URL.createObjectURL(file);
    setPreviewUrl(local);
    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const user = await apiUpload<ProfileUser>("/users/me/photo", fd);
      setPhotoUrl(user.photoUrl ?? null);
      setPreviewUrl(null);
      updateAuthUser({
        fullName: user.fullName,
        email: user.email,
        photoUrl: user.photoUrl ?? null,
      });
      setOk("Profile photo updated.");
    } catch (e) {
      setPreviewUrl(null);
      setErr(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setPhotoBusy(false);
      URL.revokeObjectURL(local);
    }
  };

  const onSaveProfile = async (values: Form) => {
    setErr(null);
    setOk(null);
    setProfileBusy(true);
    try {
      const user = await apiPatch<ProfileUser>("/users/me", values);
      updateAuthUser({
        fullName: user.fullName,
        email: user.email,
        photoUrl: user.photoUrl ?? photoUrl,
      });
      form.reset({ fullName: user.fullName, email: user.email });
      setOk("Profile saved.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save profile");
    } finally {
      setProfileBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {ok ? <Alert tone="success">{ok}</Alert> : null}
      {err ? <Alert tone="error">{err}</Alert> : null}

      <Card title="Profile photo">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
            {displayPhoto ? (
              <Image src={displayPhoto} alt="" fill className="object-cover" sizes="112px" unoptimized />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
                {initials || "?"}
              </span>
            )}
          </div>
          <div className="flex-1 space-y-2 text-center sm:text-left">
            <p className="text-sm text-muted-foreground">
              Upload a square photo (JPEG, PNG, or WebP, max {process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? "2"} MB).
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => void onPhotoChange(e.target.files?.[0])}
            />
            <Button type="button" variant="secondary" loading={photoBusy} onClick={onPickPhoto}>
              <Camera className="mr-2 h-4 w-4" />
              Change photo
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Account details">
        <form className="space-y-4" onSubmit={form.handleSubmit((v) => void onSaveProfile(v))}>
          <Input
            label="Full name"
            {...form.register("fullName")}
            error={form.formState.errors.fullName?.message}
          />
          <Input label="Email" type="email" {...form.register("email")} error={form.formState.errors.email?.message} />
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</p>
            <p className="text-sm capitalize text-foreground">{initial.role.replace(/_/g, " ")}</p>
            <p className="mt-1 text-xs text-muted-foreground">Contact an administrator to change your role.</p>
          </div>
          <Button type="submit" loading={profileBusy}>
            Save changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
