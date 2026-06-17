"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandMark } from "@/components/brand/BrandMark";
import { LoginHeroPanel } from "@/components/auth/LoginHeroPanel";
import { SESSION_SIGN_IN_MESSAGES } from "@/components/auth/constants";
import { SessionLoadingScreen } from "@/components/auth/SessionLoadingScreen";
import { apiPost, getApiErrorMessage } from "@/lib/api";
import { sessionInactivityMinutes } from "@/lib/sessionConfig";
import { getTenantSlugFromHostname, getLoginTenantSlugOverride, setLoginTenantSlugOverride } from "@/lib/tenantHost";
import { usesSubdomainTenancy } from "@/lib/tenantRouting";
import type { TenantBillingStatus } from "@uganda-cbc-sms/shared";
import { postLoginPath } from "@/lib/postLoginPath";
import { redirectToSchoolTenant } from "@/lib/tenantRedirect";
import type { AuthUser, SessionInfo } from "@/store/authStore";
import { useAuthStore } from "@/store/authStore";

type AuthView = "login" | "register";
type StrengthLevel = "weak" | "fair" | "strong";

type LoginState = {
  email: string;
  password: string;
  remember: boolean;
};

type RegisterState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agree: boolean;
};

const formSlide = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -60, opacity: 0 },
};

const formTransition = {
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
};

const fieldContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.04,
    },
  },
};

const fieldItem = {
  hidden: { y: 8, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  },
};

function strengthDetails(password: string): {
  level: StrengthLevel;
  width: string;
  color: string;
  label: string;
} {
  if (!password) {
    return { level: "weak", width: "0%", color: "#EF4444", label: "Weak" };
  }
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const score = [password.length >= 8, hasMixedCase, hasNumber, hasSymbol].filter(Boolean).length;

  if (score <= 2) return { level: "weak", width: "33%", color: "#EF4444", label: "Weak" };
  if (score === 3) return { level: "fair", width: "66%", color: "#F59E0B", label: "Fair" };
  return { level: "strong", width: "100%", color: "#22C55E", label: "Strong" };
}

function cx(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function LoginPageFallback() {
  return <SessionLoadingScreen messages={SESSION_SIGN_IN_MESSAGES} />;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loginToStore = useAuthStore((s) => s.login);
  const [view, setView] = useState<AuthView>("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginShake, setLoginShake] = useState(false);
  const [registerShake, setRegisterShake] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [sharedHostLogin, setSharedHostLogin] = useState(false);
  const [schoolSlug, setSchoolSlug] = useState("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shared = !usesSubdomainTenancy(window.location.hostname);
    setSharedHostLogin(shared);
    if (!shared) return;
    const fromQuery = searchParams.get("school") ?? searchParams.get("tenant");
    const slug = (fromQuery ?? getLoginTenantSlugOverride() ?? "default").trim().toLowerCase();
    setSchoolSlug(slug);
    setLoginTenantSlugOverride(slug);
  }, [searchParams]);

  const timeoutNotice =
    searchParams.get("reason") === "timeout"
      ? `Your session ended after ${sessionInactivityMinutes()} minutes of inactivity. Please sign in again.`
      : null;

  const [loginState, setLoginState] = useState<LoginState>({
    email: "",
    password: "",
    remember: false,
  });
  const [registerState, setRegisterState] = useState<RegisterState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });

  const [loginTouched, setLoginTouched] = useState<Record<string, boolean>>({});
  const [registerTouched, setRegisterTouched] = useState<Record<string, boolean>>({});

  const loginErrors = useMemo(() => {
    return {
      email: /\S+@\S+\.\S+/.test(loginState.email) ? "" : "Enter a valid email address.",
      password: loginState.password.length >= 8 ? "" : "Password must be at least 8 characters.",
    };
  }, [loginState]);

  const registerErrors = useMemo(() => {
    return {
      name: registerState.name.trim().length >= 2 ? "" : "Full name is required.",
      email: /\S+@\S+\.\S+/.test(registerState.email) ? "" : "Enter a valid email address.",
      password: registerState.password.length >= 8 ? "" : "Use at least 8 characters.",
      confirmPassword:
        registerState.confirmPassword && registerState.confirmPassword === registerState.password
          ? ""
          : "Passwords do not match.",
      agree: registerState.agree ? "" : "Please accept Terms and Privacy Policy.",
    };
  }, [registerState]);

  const passwordStrength = useMemo(
    () => strengthDetails(registerState.password),
    [registerState.password]
  );

  const triggerShake = (kind: AuthView) => {
    if (kind === "login") {
      setLoginShake(true);
      setTimeout(() => setLoginShake(false), 450);
      return;
    }
    setRegisterShake(true);
    setTimeout(() => setRegisterShake(false), 450);
  };

  const loginInvalid = Object.values(loginErrors).some(Boolean);
  const registerInvalid = Object.values(registerErrors).some(Boolean);

  const loginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginTouched({ email: true, password: true });
    setLoginError(null);
    if (loginInvalid) {
      triggerShake("login");
      return;
    }
    try {
      setLoginLoading(true);
      if (sharedHostLogin) {
        setLoginTenantSlugOverride(schoolSlug.trim() || "default");
      }
      const data = await apiPost<{
        token: string;
        user: AuthUser;
        session?: SessionInfo;
        tenant?: { id: string; slug: string };
        billing?: TenantBillingStatus;
      }>("/auth/login", {
        email: loginState.email,
        password: loginState.password,
      });
      loginToStore(data.user, data.token, data.session, data.tenant);
      if (data.tenant?.slug) {
        setLoginTenantSlugOverride(data.tenant.slug);
      }
      const dash = postLoginPath(data.user, data.billing);
      const tenantSlug = data.tenant?.slug?.toLowerCase();
      const hostSlug =
        typeof window !== "undefined"
          ? getTenantSlugFromHostname(window.location.hostname)?.toLowerCase() ?? null
          : null;
      const subdomainTenancy =
        typeof window !== "undefined" && usesSubdomainTenancy(window.location.hostname);
      if (subdomainTenancy && tenantSlug && hostSlug !== tenantSlug) {
        redirectToSchoolTenant(tenantSlug, dash);
        return;
      }
      if (subdomainTenancy && tenantSlug && !hostSlug) {
        redirectToSchoolTenant(tenantSlug, dash);
        return;
      }
      window.location.assign(dash);
    } catch (error) {
      setLoginError(getApiErrorMessage(error));
      triggerShake("login");
      setLoginLoading(false);
    }
  };

  const registerSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setRegisterTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      agree: true,
    });
    if (registerInvalid) {
      triggerShake("register");
      return;
    }
    console.log("register submit", registerState);
    router.push(`/auth/check-your-email?email=${encodeURIComponent(registerState.email)}`);
  };

  const inputBase =
    "font-body h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition-ui placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background";

  const renderFormCard = () => {
    const isLogin = view === "login";

    return (
      <AnimatePresence mode="wait">
        {isLogin ? (
          <motion.div
            key="login"
            variants={formSlide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={formTransition}
            className="w-full"
          >
            <motion.form
              onSubmit={loginSubmit}
              variants={fieldContainer}
              initial="hidden"
              animate="visible"
              className="rounded-3xl bg-card/90 p-5 shadow-lg backdrop-blur-xl dark:bg-card/95 sm:p-6"
            >
              <motion.div variants={fieldItem} className="mb-5">
                <p className="font-heading text-2xl font-semibold text-foreground">Welcome back</p>
                <p className="font-body mt-1.5 text-sm text-muted-foreground">
                  Sign in to access your school management dashboard.
                </p>
              </motion.div>

              {sharedHostLogin ? (
                <motion.div variants={fieldItem} className="mb-3">
                  <label className="font-body mb-2 block text-sm font-medium text-foreground">
                    School code
                  </label>
                  <input
                    type="text"
                    value={schoolSlug}
                    onChange={(e) => {
                      const next = e.target.value.trim().toLowerCase();
                      setSchoolSlug(next);
                      setLoginTenantSlugOverride(next || "default");
                    }}
                    className={inputBase}
                    placeholder="default"
                    autoComplete="organization"
                  />
                </motion.div>
              ) : null}

              <motion.div variants={fieldItem} className="mb-3">
                <label className="font-body mb-2 block text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="hidden" />
                  <input
                    type="email"
                    value={loginState.email}
                    onChange={(e) => setLoginState((s) => ({ ...s, email: e.target.value }))}
                    onBlur={() => setLoginTouched((s) => ({ ...s, email: true }))}
                    className={cx(inputBase, loginTouched.email && loginErrors.email && "border-red-400")}
                    placeholder="Enter your email"
                  />
                </div>
                {loginTouched.email && loginErrors.email ? (
                  <p className="mt-1 text-xs text-red-600">{loginErrors.email}</p>
                ) : null}
              </motion.div>

              <motion.div variants={fieldItem} className="mb-2.5">
                <label className="font-body mb-2 block text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="hidden" />
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginState.password}
                    onChange={(e) => setLoginState((s) => ({ ...s, password: e.target.value }))}
                    onBlur={() => setLoginTouched((s) => ({ ...s, password: true }))}
                    className={cx(
                      inputBase,
                      loginTouched.password && loginErrors.password && "border-red-400"
                    )}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    aria-label="Toggle password visibility"
                  >
                    {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {loginTouched.password && loginErrors.password ? (
                  <p className="mt-1 text-xs text-red-600">{loginErrors.password}</p>
                ) : null}
              </motion.div>

              <motion.div variants={fieldItem} className="mb-4 flex items-center justify-between">
                <label className="font-body flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={loginState.remember}
                    onChange={(e) => setLoginState((s) => ({ ...s, remember: e.target.checked }))}
                    className="h-4 w-4 rounded border-border text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  Remember me
                </label>
                <Link href="/auth/forgot-password" className="font-body text-sm font-medium text-[#2563EB] hover:underline">
                  Forgot password?
                </Link>
              </motion.div>

              <motion.div variants={fieldItem}>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  disabled={loginLoading}
                  className="font-body h-10 w-full rounded-lg bg-[#2563EB] text-sm font-medium text-white shadow-[0_16px_30px_-16px_rgba(37,99,235,0.8)] transition hover:-translate-y-[1px] hover:bg-[#1D4ED8] hover:shadow-[0_20px_34px_-16px_rgba(30,64,175,0.85)]"
                  animate={loginShake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                >
                  Sign In
                </motion.button>
              </motion.div>
              {timeoutNotice ? (
                <motion.p variants={fieldItem} className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                  {timeoutNotice}
                </motion.p>
              ) : null}
              {loginError ? (
                <motion.p variants={fieldItem} className="mt-2 text-sm text-red-600">
                  {loginError}
                </motion.p>
              ) : null}

              <motion.div variants={fieldItem} className="my-3.5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="font-body text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  or continue with Google
                </span>
                <div className="h-px flex-1 bg-border" />
              </motion.div>

              <motion.div variants={fieldItem}>
                <button
                  type="button"
                  className="font-body w-full rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
                >
                  Google
                </button>
              </motion.div>

              <motion.p variants={fieldItem} className="font-body mt-4 text-center text-sm text-muted-foreground">
                {"Don't have an account? "}
                <button
                  type="button"
                  onClick={() => setView("register")}
                  className="font-semibold text-[#2563EB] hover:underline"
                >
                  Register →
                </button>
              </motion.p>
            </motion.form>
          </motion.div>
        ) : (
          <motion.div
            key="register"
            variants={formSlide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={formTransition}
            className="w-full"
          >
            <motion.form
              onSubmit={registerSubmit}
              variants={fieldContainer}
              initial="hidden"
              animate="visible"
              className="rounded-3xl bg-card/90 p-5 shadow-lg backdrop-blur-xl dark:bg-card/95 sm:p-6"
            >
              <motion.div variants={fieldItem} className="mb-5">
                <p className="font-heading text-2xl font-semibold text-foreground">Create account</p>
                <p className="font-body mt-1.5 text-sm text-muted-foreground">
                  Start managing academics, fees, and performance in one place.
                </p>
              </motion.div>

              <motion.div variants={fieldItem} className="mb-3">
                <label className="font-body mb-2 block text-sm font-medium text-foreground">Full Name</label>
                <div className="relative">
                  <User className="hidden" />
                  <input
                    type="text"
                    value={registerState.name}
                    onChange={(e) => setRegisterState((s) => ({ ...s, name: e.target.value }))}
                    onBlur={() => setRegisterTouched((s) => ({ ...s, name: true }))}
                    className={cx(
                      inputBase,
                      registerTouched.name && registerErrors.name && "border-red-400"
                    )}
                    placeholder="Enter your full name"
                  />
                </div>
                {registerTouched.name && registerErrors.name ? (
                  <p className="mt-1 text-xs text-red-600">{registerErrors.name}</p>
                ) : null}
              </motion.div>

              <motion.div variants={fieldItem} className="mb-3">
                <label className="font-body mb-2 block text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="hidden" />
                  <input
                    type="email"
                    value={registerState.email}
                    onChange={(e) => setRegisterState((s) => ({ ...s, email: e.target.value }))}
                    onBlur={() => setRegisterTouched((s) => ({ ...s, email: true }))}
                    className={cx(
                      inputBase,
                      registerTouched.email && registerErrors.email && "border-red-400"
                    )}
                    placeholder="you@company.com"
                  />
                </div>
                {registerTouched.email && registerErrors.email ? (
                  <p className="mt-1 text-xs text-red-600">{registerErrors.email}</p>
                ) : null}
              </motion.div>

              <motion.div variants={fieldItem} className="mb-3">
                <label className="font-body mb-2 block text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="hidden" />
                  <input
                    type={showRegisterPassword ? "text" : "password"}
                    value={registerState.password}
                    onChange={(e) => setRegisterState((s) => ({ ...s, password: e.target.value }))}
                    onBlur={() => setRegisterTouched((s) => ({ ...s, password: true }))}
                    className={cx(
                      inputBase,
                      registerTouched.password && registerErrors.password && "border-red-400"
                    )}
                    placeholder="Create a password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    aria-label="Toggle password visibility"
                  >
                    {showRegisterPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full"
                      animate={{ width: passwordStrength.width, backgroundColor: passwordStrength.color }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Strength: <span className="font-semibold">{passwordStrength.label}</span>
                  </p>
                </div>
                {registerTouched.password && registerErrors.password ? (
                  <p className="mt-1 text-xs text-red-600">{registerErrors.password}</p>
                ) : null}
              </motion.div>

              <motion.div variants={fieldItem} className="mb-3">
                <label className="font-body mb-2 block text-sm font-medium text-foreground">
                  Confirm Password
                </label>
                <div className="relative">
                  <ShieldCheck className="hidden" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={registerState.confirmPassword}
                    onChange={(e) =>
                      setRegisterState((s) => ({ ...s, confirmPassword: e.target.value }))
                    }
                    onBlur={() => setRegisterTouched((s) => ({ ...s, confirmPassword: true }))}
                    className={cx(
                      inputBase,
                      registerTouched.confirmPassword &&
                        registerErrors.confirmPassword &&
                        "border-red-400"
                    )}
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {registerTouched.confirmPassword && registerErrors.confirmPassword ? (
                  <p className="mt-1 text-xs text-red-600">{registerErrors.confirmPassword}</p>
                ) : null}
              </motion.div>

              <motion.label variants={fieldItem} className="mb-4 flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={registerState.agree}
                  onChange={(e) => setRegisterState((s) => ({ ...s, agree: e.target.checked }))}
                  onBlur={() => setRegisterTouched((s) => ({ ...s, agree: true }))}
                  className="mt-[3px] h-4 w-4 rounded border-border text-[#2563EB] focus:ring-[#2563EB]"
                />
                <span className="font-body">
                  I agree to the{" "}
                  <button type="button" className="font-medium text-[#2563EB] hover:underline">
                    Terms of Service
                  </button>{" "}
                  and{" "}
                  <button type="button" className="font-medium text-[#2563EB] hover:underline">
                    Privacy Policy
                  </button>
                </span>
              </motion.label>
              {registerTouched.agree && registerErrors.agree ? (
                <p className="-mt-3 mb-4 text-xs text-red-600">{registerErrors.agree}</p>
              ) : null}

              <motion.div variants={fieldItem}>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.98 }}
                  className="font-body h-10 w-full rounded-lg bg-[#2563EB] text-sm font-medium text-white shadow-[0_16px_30px_-16px_rgba(37,99,235,0.8)] transition hover:-translate-y-[1px] hover:bg-[#1D4ED8] hover:shadow-[0_20px_34px_-16px_rgba(30,64,175,0.85)]"
                  animate={registerShake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                >
                  Create Account
                </motion.button>
              </motion.div>

              <motion.div variants={fieldItem} className="my-3.5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="font-body text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  or continue with Google
                </span>
                <div className="h-px flex-1 bg-border" />
              </motion.div>

              <motion.div variants={fieldItem}>
                <button
                  type="button"
                  className="font-body w-full rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
                >
                  Google
                </button>
              </motion.div>

              <motion.p variants={fieldItem} className="font-body mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="font-semibold text-[#2563EB] hover:underline"
                >
                  Sign In ←
                </button>
              </motion.p>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-background transition-colors">
      {loginLoading ? (
        <SessionLoadingScreen messages={SESSION_SIGN_IN_MESSAGES} layout="overlay" />
      ) : null}
      <div className="mx-auto hidden min-h-screen max-w-[1600px] lg:flex">
        <LoginHeroPanel />

        <section className="relative flex w-3/5 items-center justify-center bg-background px-8 py-6 xl:px-10 xl:py-8">
          <div className="absolute right-6 top-6 z-10 xl:right-10 xl:top-8">
            <ThemeToggle />
          </div>
          <div className="w-full max-w-sm">{renderFormCard()}</div>
        </section>
      </div>

      <div className="lg:hidden">
        <div className="flex items-center justify-between border-b border-border bg-background px-5 py-4">
          <BrandMark size="compact" />
          <ThemeToggle />
        </div>
        <div className="bg-background px-4 py-6">
          <div className="mx-auto w-full max-w-sm">{renderFormCard()}</div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
