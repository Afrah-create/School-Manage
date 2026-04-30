"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";

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

export default function LoginPage() {
  const router = useRouter();
  const [view, setView] = useState<AuthView>("login");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginShake, setLoginShake] = useState(false);
  const [registerShake, setRegisterShake] = useState(false);

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

  const loginSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLoginTouched({ email: true, password: true });
    if (loginInvalid) {
      triggerShake("login");
      return;
    }
    console.log("login submit", loginState);
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
    "font-body w-full rounded-xl border border-slate-200 bg-white/90 px-11 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition duration-200 placeholder:text-slate-400 focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.15)]";

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
              className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-40px_rgba(37,99,235,0.5)] backdrop-blur-xl sm:p-6"
            >
              <motion.div variants={fieldItem} className="mb-5">
                <p className="font-heading text-2xl font-semibold text-slate-900">Welcome back</p>
                <p className="font-body mt-1.5 text-sm text-slate-500">
                  Sign in to access your school management dashboard.
                </p>
              </motion.div>

              <motion.div variants={fieldItem} className="mb-3">
                <label className="font-body mb-2 block text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
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
                <label className="font-body mb-2 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
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
                <label className="font-body flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={loginState.remember}
                    onChange={(e) => setLoginState((s) => ({ ...s, remember: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
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
                  className="font-body w-full rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white shadow-[0_16px_30px_-16px_rgba(37,99,235,0.8)] transition hover:-translate-y-[1px] hover:bg-[#1D4ED8] hover:shadow-[0_20px_34px_-16px_rgba(30,64,175,0.85)]"
                  animate={loginShake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                >
                  Sign In
                </motion.button>
              </motion.div>

              <motion.div variants={fieldItem} className="my-3.5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="font-body text-xs uppercase tracking-[0.12em] text-slate-400">
                  or continue with Google
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </motion.div>

              <motion.div variants={fieldItem}>
                <button
                  type="button"
                  className="font-body w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Google
                </button>
              </motion.div>

              <motion.p variants={fieldItem} className="font-body mt-4 text-center text-sm text-slate-500">
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
              className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_30px_80px_-40px_rgba(37,99,235,0.5)] backdrop-blur-xl sm:p-6"
            >
              <motion.div variants={fieldItem} className="mb-5">
                <p className="font-heading text-2xl font-semibold text-slate-900">Create account</p>
                <p className="font-body mt-1.5 text-sm text-slate-500">
                  Start managing academics, fees, and performance in one place.
                </p>
              </motion.div>

              <motion.div variants={fieldItem} className="mb-3">
                <label className="font-body mb-2 block text-sm font-medium text-slate-700">Full Name</label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
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
                <label className="font-body mb-2 block text-sm font-medium text-slate-700">Email</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
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
                <label className="font-body mb-2 block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                    aria-label="Toggle password visibility"
                  >
                    {showRegisterPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      className="h-full rounded-full"
                      animate={{ width: passwordStrength.width, backgroundColor: passwordStrength.color }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Strength: <span className="font-semibold">{passwordStrength.label}</span>
                  </p>
                </div>
                {registerTouched.password && registerErrors.password ? (
                  <p className="mt-1 text-xs text-red-600">{registerErrors.password}</p>
                ) : null}
              </motion.div>

              <motion.div variants={fieldItem} className="mb-3">
                <label className="font-body mb-2 block text-sm font-medium text-slate-700">
                  Confirm Password
                </label>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                    aria-label="Toggle confirm password visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {registerTouched.confirmPassword && registerErrors.confirmPassword ? (
                  <p className="mt-1 text-xs text-red-600">{registerErrors.confirmPassword}</p>
                ) : null}
              </motion.div>

              <motion.label variants={fieldItem} className="mb-4 flex items-start gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={registerState.agree}
                  onChange={(e) => setRegisterState((s) => ({ ...s, agree: e.target.checked }))}
                  onBlur={() => setRegisterTouched((s) => ({ ...s, agree: true }))}
                  className="mt-[3px] h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
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
                  className="font-body w-full rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white shadow-[0_16px_30px_-16px_rgba(37,99,235,0.8)] transition hover:-translate-y-[1px] hover:bg-[#1D4ED8] hover:shadow-[0_20px_34px_-16px_rgba(30,64,175,0.85)]"
                  animate={registerShake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                >
                  Create Account
                </motion.button>
              </motion.div>

              <motion.div variants={fieldItem} className="my-3.5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="font-body text-xs uppercase tracking-[0.12em] text-slate-400">
                  or continue with Google
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </motion.div>

              <motion.div variants={fieldItem}>
                <button
                  type="button"
                  className="font-body w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Google
                </button>
              </motion.div>

              <motion.p variants={fieldItem} className="font-body mt-4 text-center text-sm text-slate-500">
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
    <div className="min-h-screen bg-[#EFF6FF]">
      <div className="mx-auto hidden min-h-screen max-w-[1600px] lg:flex">
        <aside className="relative flex w-2/5 flex-col justify-between overflow-hidden bg-gradient-to-br from-[#1E3A8A] to-[#1D4ED8] p-8 text-white xl:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(255,255,255,0.16),transparent_38%),radial-gradient(circle_at_85%_15%,rgba(219,234,254,0.18),transparent_35%)]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:26px_26px]" />
          <div className="relative">
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
              <Image
                src="/images/Logo.jpeg"
                alt="SlimCyberTech logo"
                width={30}
                height={30}
                className="h-7 w-7 rounded-md object-cover"
              />
              <span className="font-heading ml-2 text-sm font-semibold">SlimCyberTech</span>
            </div>
            <div className="mt-7 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <Image
                src="/images/Slim.jpeg"
                alt="SlimCyberTech full logo"
                width={420}
                height={140}
                className="h-auto w-full max-w-[320px] rounded-lg object-cover"
                priority
              />
              <h1 className="font-heading mt-4 max-w-sm text-3xl font-semibold leading-tight xl:text-4xl">
                SlimCyberTech
              </h1>
              <p className="font-body mt-2 max-w-md text-sm text-blue-100/90">
                Building the future with code.
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="font-body text-sm text-blue-100">
                Trusted by administrators, teachers, and bursars to simplify daily workflows.
              </p>
            </div>
          </div>
        </aside>

        <section className="flex w-3/5 items-center justify-center bg-[#EFF6FF] px-8 py-6 xl:px-10 xl:py-8">
          <div className="w-full max-w-xl">{renderFormCard()}</div>
        </section>
      </div>

      <div className="lg:hidden">
        <div className="bg-[#1E3A8A] px-5 py-4">
          <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-white backdrop-blur-sm">
            <Image
              src="/images/Logo.jpeg"
              alt="SlimCyberTech logo"
              width={26}
              height={26}
              className="h-6 w-6 rounded-md object-cover"
            />
            <span className="font-heading ml-2 text-sm font-semibold">SlimCyberTech</span>
          </div>
        </div>
        <div className="px-4 py-6">
          <div className="mx-auto w-full max-w-xl">{renderFormCard()}</div>
        </div>
      </div>
    </div>
  );
}
