import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import type { PlanId } from "./config";

const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};
export const accountConfigured = Object.values(firebaseConfig).every(
  (value) => typeof value === "string" && value.trim(),
);
const app = accountConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;

export type Billing = {
  status?: string;
  plan?: PlanId;
  accessUntil?: number | null;
  cancelAtPeriodEnd?: boolean;
  canManage?: boolean;
};
export const watchAccount = (fn: (user: User | null) => void) =>
  auth
    ? onAuthStateChanged(auth, fn)
    : (() => {
        fn(null);
        return () => {};
      })();
export function watchBilling(
  uid: string,
  fn: (data: Billing | null) => void,
  error: () => void,
) {
  let stopped = false;
  let unsubscribe = () => {};
  if (app)
    import("firebase/firestore")
      .then(({ getFirestore, doc, onSnapshot }) => {
        if (stopped) return;
        unsubscribe = onSnapshot(
          doc(getFirestore(app), "billing", uid),
          (snapshot) =>
            fn(snapshot.exists() ? (snapshot.data() as Billing) : null),
          error,
        );
      })
      .catch(() => {
        if (!stopped) error();
      });
  return () => {
    stopped = true;
    unsubscribe();
  };
}
export async function login(email: string, password: string) {
  if (!auth) throw new Error("account/unavailable");
  return signInWithEmailAndPassword(auth, email, password);
}
export async function register(name: string, email: string, password: string) {
  if (!auth) throw new Error("account/unavailable");
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name.trim() });
  // An email delivery failure must not hide the already-created account.
  await sendEmailVerification(result.user).catch(() => {});
  return result;
}
export async function googleLogin() {
  if (!auth) throw new Error("account/unavailable");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(auth, provider);
}
export async function resetPassword(email: string) {
  if (!auth) throw new Error("account/unavailable");
  await sendPasswordResetEmail(auth, email);
}
export async function verifyEmail() {
  if (!auth?.currentUser) throw new Error("account/unavailable");
  await sendEmailVerification(auth.currentUser);
}
export const logout = () => (auth ? signOut(auth) : Promise.resolve());
export async function refreshAccount() {
  if (auth?.currentUser) {
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    return auth.currentUser.emailVerified;
  }
  return false;
}
export async function billingRedirect(
  action: "createCheckout" | "createPortal",
  plan?: PlanId,
) {
  if (!app || !auth?.currentUser) throw new Error("account/unavailable");
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const functions = getFunctions(
    app,
    env.VITE_FIREBASE_FUNCTIONS_REGION || "southamerica-east1",
  );
  await auth.currentUser.getIdToken(true);
  const result = await httpsCallable<{ plan?: PlanId }, { url: string }>(
    functions,
    action,
  )({ plan });
  const url = new URL(result.data.url);
  // Restrict external navigation even if a backend is misconfigured.
  const allowedHosts =
    action === "createCheckout"
      ? ["checkout.stripe.com", "www.mercadopago.com.br"]
      : ["billing.stripe.com", "www.mercadopago.com.br"];
  if (url.protocol !== "https:" || !allowedHosts.includes(url.hostname))
    throw new Error("checkout/invalid-url");
  window.location.assign(url.href);
}
export function friendlyError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  const messages: Record<string, string> = {
    "auth/invalid-credential":
      "E-mail ou senha incorretos. Confira e tente novamente.",
    "auth/email-already-in-use":
      "Este e-mail já tem uma conta. Entre ou recupere sua senha.",
    "auth/weak-password": "Use uma senha com pelo menos 8 caracteres.",
    "auth/invalid-email": "Digite um e-mail válido.",
    "auth/too-many-requests":
      "Muitas tentativas. Aguarde um pouco antes de tentar novamente.",
    "auth/network-request-failed":
      "Não foi possível conectar. Confira sua internet e tente novamente.",
    "auth/popup-closed-by-user":
      "A janela de acesso foi fechada. Você pode tentar novamente.",
    "auth/popup-blocked":
      "Permita a janela de acesso no navegador e tente novamente.",
    "auth/operation-not-allowed":
      "Este método de acesso ainda não está disponível.",
    "functions/unauthenticated": "Entre novamente para continuar.",
    "functions/failed-precondition":
      "Confira a confirmação do e-mail ou gerencie sua assinatura existente na área da conta.",
    "functions/unavailable":
      "O serviço está indisponível por enquanto. Tente mais tarde.",
    "functions/resource-exhausted":
      "Já existe um checkout em andamento. Aguarde um momento e tente novamente.",
  };
  return (
    messages[code] ||
    "Não foi possível concluir agora. Tente novamente em instantes."
  );
}
