"use client";

/**
 * Email/password login → OTP verify → cookies set → redirect to dashboard.
 */
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useLoginWithEmailMutation, useVerifyOtpMutation } from "@/redux/services/authApi";
import { getRtkErrorMessage } from "@/lib/rtk-error-message";
import { useTheme } from "@/components/theme-provider";
import ThemeToggle from "@/components/theme-toggle";

const OTP_LENGTH = 6;

export default function LoginPage() {
  const { isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loginToken, setLoginToken] = useState("");
  const [otpRecipient, setOtpRecipient] = useState("");
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [resultMessage, setResultMessage] = useState("");
  const router = useRouter();

  const [loginWithEmail, { isLoading: isLoginLoading }] = useLoginWithEmailMutation();
  const [verifyOtp, { isLoading: isVerifyLoading }] = useVerifyOtpMutation();

  const isLoading = isLoginLoading || isVerifyLoading;

  const canSubmitOtp = useMemo(
    () => otp.trim().length === OTP_LENGTH && loginToken.trim().length > 0,
    [otp, loginToken],
  );
  const getTokenFromCookies = () =>
    Cookies.get("token") ??
    Cookies.get("accessToken") ??
    Cookies.get("authSession") ??
    "";

  const submitCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResultMessage("");

    try {
      const response = await loginWithEmail({
        email: email.trim(),
        password,
      }).unwrap();

      const nextToken = response.token ?? response.data?.token ?? "";
      /** Masked phone from API (`phoneNo`) or legacy fields for OTP subtitle. */
      const recipientNumber =
        response.data?.phoneNo ??
        response.data?.phoneNumber ??
        response.data?.mobile ??
        response.data?.number ??
        response.phoneNumber ??
        response.mobile ??
        response.number ??
        "";

      if (!nextToken) {
        setResultMessage("Login API succeeded but token is missing. Please verify API response shape.");
        return;
      }

      setLoginToken(nextToken);
      setOtpRecipient(recipientNumber);
      setStep("otp");
      setResultMessage("OTP sent successfully.");
    } catch (error) {
      setResultMessage(
        `Failed to login with email/password. ${getRtkErrorMessage(error)}`.trim(),
      );
    }
  };

  const submitOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResultMessage("");

    let verifyResponse: unknown;
    try {
      verifyResponse = await verifyOtp({
        email: email.trim(),
        otp: otp.trim(),
        token: loginToken,
      }).unwrap();
    } catch (error) {
      setResultMessage(`OTP verification failed. ${getRtkErrorMessage(error)}`.trim());
      return;
    }

    const authToken =
      (verifyResponse as { accessToken?: string; token?: string }).accessToken ??
      (verifyResponse as { token?: string }).token ??
      "";

    if (authToken) {
      Cookies.set("token", authToken);
    }

    const cookieToken = authToken || getTokenFromCookies();
    if (cookieToken) {
      Cookies.set("accessToken", cookieToken);
      Cookies.set("token", cookieToken);
    }
    Cookies.set("auth_user_email", email.trim());

    router.push("/dashboard");
  };

  return (
    <main
      className={`relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 transition-colors duration-300 ${
        isDark ? "bg-[#06080f] text-zinc-100" : "bg-zinc-100 text-zinc-900"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          isDark
            ? "bg-[radial-gradient(circle_at_center,rgba(21,101,192,0.2),transparent_42%),linear-gradient(to_bottom,rgba(255,255,255,0.02),rgba(255,255,255,0))]"
            : "bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_40%)]"
        }`}
      />

      <ThemeToggle variant="corner" />

      <section
        className={`relative z-10 w-full max-w-sm rounded-2xl border p-6 shadow-2xl backdrop-blur-sm ${
          isDark
            ? "border-zinc-800 bg-zinc-900/85"
            : "border-zinc-200 bg-white/95"
        }`}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-b from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-600/30">
          <span className="text-lg font-bold">A</span>
        </div>

        <h1 className="text-center text-2xl font-semibold">Welcome Back</h1>
        <p className={`mt-2 text-center text-sm ${isDark ? "text-zinc-400" : "text-zinc-500"}`}>
          {step === "credentials"
            ? "Sign in with your email and password"
            : `Enter the OTP sent to ${otpRecipient || "your mobile number"}`}
        </p>

        {step === "credentials" && (
          <form onSubmit={submitCredentials} className="mt-6 space-y-3">
            <div>
              <label className={`mb-1 block text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className={`h-11 w-full rounded-lg border px-3 text-sm outline-none transition ${
                  isDark
                    ? "border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500"
                    : "border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500"
                }`}
              />
            </div>
            <div>
              <label className={`mb-1 block text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className={`h-11 w-full rounded-lg border px-3 text-sm outline-none transition ${
                  isDark
                    ? "border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500"
                    : "border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500"
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 h-11 w-full rounded-lg bg-linear-to-r from-blue-600 to-blue-500 text-sm font-medium text-white transition hover:from-blue-500 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Submitting..." : "Login"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={submitOtp} className="mt-6 space-y-3">
            <div>
              <label className={`mb-1 block text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>Email address</label>
              <input
                type="email"
                value={email}
                disabled
                className={`h-11 w-full rounded-lg border px-3 text-sm ${
                  isDark
                    ? "border-zinc-800 bg-zinc-950/80 text-zinc-400"
                    : "border-zinc-300 bg-zinc-100 text-zinc-600"
                }`}
              />
            </div>
            <div>
              <label className={`mb-1 block text-xs ${isDark ? "text-zinc-400" : "text-zinc-600"}`}>OTP</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={OTP_LENGTH}
                required
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder="6-digit OTP"
                className={`h-11 w-full rounded-lg border px-3 text-sm outline-none transition ${
                  isDark
                    ? "border-zinc-800 bg-zinc-950 text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500"
                    : "border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500"
                }`}
              />
            </div>
            <button
              type="submit"
              disabled={!canSubmitOtp || isLoading}
              className="mt-2 h-11 w-full rounded-lg bg-linear-to-r from-blue-600 to-blue-500 text-sm font-medium text-white transition hover:from-blue-500 hover:to-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        )}

        {resultMessage && (
          <div
            className={`mt-4 rounded-lg border px-3 py-2 text-xs ${
              isDark ? "border-zinc-800 bg-zinc-950 text-zinc-300" : "border-zinc-200 bg-zinc-50 text-zinc-700"
            }`}
          >
            {resultMessage}
          </div>
        )}
      </section>
    </main>
  );
}
