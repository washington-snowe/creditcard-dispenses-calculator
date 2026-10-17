import { useEffect, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import {
  ArrowRight,
  Download,
  Eye,
  EyeOff,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { site, planNames, type PlanId } from "./config";
import {
  accountConfigured,
  login,
  register,
  googleLogin,
  resetPassword,
  logout,
  friendlyError,
  verifyEmail,
  refreshAccount,
  billingRedirect,
  type Billing,
} from "./services";

type Mode = "login" | "register" | "reset";
export default function Account({
  user,
  billing,
  billingError,
  onClose,
  selectedPlan,
}: {
  user: User | null;
  billing: Billing | null;
  billingError: boolean;
  onClose: () => void;
  selectedPlan: PlanId | null;
}) {
  const [mode, setMode] = useState<Mode>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verified, setVerified] = useState(user?.emailVerified || false);
  useEffect(() => {
    setVerified(user?.emailVerified || false);
  }, [user?.uid, user?.emailVerified]);
  async function action(fn: () => Promise<unknown>, success?: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      if (success) setNotice(success);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  function changeMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    if (mode === "reset")
      return action(
        () => resetPassword(email),
        "Se houver uma conta com este e-mail, você receberá as instruções de recuperação.",
      );
    if (mode === "register")
      return action(() =>
        register(String(data.get("name") || ""), email, password),
      );
    return action(() => login(email, password));
  }
  const messages = (
    <>
      {error && (
        <p className="form-message error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="form-message success" role="status">
          {notice}
        </p>
      )}
    </>
  );
  if (!accountConfigured)
    return (
      <div className="account-soon">
        <span className="dialog-feature-icon">
          <ShieldCheck />
        </span>
        <h3>Seu espaço está chegando.</h3>
        <p>
          Estamos preparando a área da conta. Enquanto isso, você já pode
          conhecer o ContaClara para Windows e organizar suas finanças no
          computador.
        </p>
        <a className="button primary full" href={site.downloadUrl}>
          <Download size={17} /> Baixar para Windows
        </a>
        <button className="button secondary full" onClick={onClose}>
          Continuar conhecendo
        </button>
        <small>
          Nenhum cadastro é necessário na versão atual do aplicativo.
        </small>
      </div>
    );
  if (user) {
    const hasBilling = billing?.canManage === true;
    const active =
      ["active", "trialing"].includes(billing?.status || "") &&
      (!billing?.accessUntil || billing.accessUntil > Date.now());
    const status = active
      ? "Ativa"
      : billing?.status === "past_due"
        ? "Pagamento pendente"
        : billing?.status === "canceled"
          ? "Cancelada"
          : "Sem assinatura";
    return (
      <div className="account-content">
        <p className="dialog-description">
          Olá, {user.displayName?.trim().split(/\s+/)[0] || "bem-vindo"}. Este é
          o seu espaço no ContaClara.
        </p>
        <div className="account-identity">
          <span>
            {(user.displayName || user.email || "C").slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{user.displayName || "Sua conta"}</strong>
            <small>{user.email}</small>
          </div>
        </div>
        <div className="account-plan">
          <span>ASSINATURA</span>
          <div>
            <strong>
              {billing?.plan ? planNames[billing.plan] : "ContaClara"}
            </strong>
            <span className={`pill ${active ? "green" : ""}`}>{status}</span>
          </div>
          {billing?.accessUntil && (
            <small>
              {billing.cancelAtPeriodEnd
                ? "Disponível até"
                : "Próximo período em"}{" "}
              {new Intl.DateTimeFormat("pt-BR").format(billing.accessUntil)}
            </small>
          )}
          {billingError && (
            <p role="alert">
              Não foi possível consultar sua assinatura. Tente novamente mais
              tarde.
            </p>
          )}
        </div>
        {!verified && (
          <div className="email-notice">
            <Mail size={18} />
            <div>
              <strong>Confirme seu e-mail</strong>
              <p>
                Abra o link enviado ao seu e-mail para liberar a contratação de
                planos.
              </p>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  action(verifyEmail, "Enviamos um novo e-mail de confirmação.")
                }
              >
                Reenviar confirmação
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  action(async () => {
                    const value = await refreshAccount();
                    setVerified(value);
                    if (!value)
                      setNotice(
                        "A confirmação ainda não foi identificada. Abra o link no seu e-mail.",
                      );
                    else setNotice("E-mail confirmado.");
                  })
                }
              >
                Já confirmei meu e-mail
              </button>
            </div>
          </div>
        )}
        {site.checkoutEnabled && (
          <button
            className="button primary full"
            disabled={busy || !verified || billingError}
            onClick={() =>
              action(() =>
                billingRedirect(
                  hasBilling ? "createPortal" : "createCheckout",
                  selectedPlan || "monthly",
                ),
              )
            }
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <ArrowRight size={17} />
            )}
            {hasBilling
              ? "Gerenciar assinatura"
              : `Continuar com o plano ${planNames[selectedPlan || "monthly"].toLowerCase()}`}
          </button>
        )}
        {!site.checkoutEnabled && (
          <p className="muted">
            Os planos e os valores estão em definição. Nenhuma cobrança está
            disponível nesta etapa.
          </p>
        )}
        {messages}
        <button
          className="button secondary full"
          disabled={busy}
          onClick={() =>
            action(async () => {
              await logout();
              changeMode("login");
            })
          }
        >
          Sair da conta
        </button>
      </div>
    );
  }
  return (
    <>
      <p className="dialog-description">
        {mode === "login"
          ? "Um lugar para cuidar da sua conta e da sua assinatura."
          : mode === "register"
            ? "Dê o primeiro passo para uma vida financeira mais clara."
            : "Vamos ajudar você a recuperar o acesso à sua conta."}
      </p>
      {mode !== "reset" && (
        <>
          <div className="auth-tabs" aria-label="Acesso à conta">
            <button
              aria-pressed={mode === "login"}
              onClick={() => changeMode("login")}
            >
              Entrar
            </button>
            <button
              aria-pressed={mode === "register"}
              onClick={() => changeMode("register")}
            >
              Criar conta
            </button>
          </div>
          <button
            className="button secondary full"
            disabled={busy}
            onClick={() => action(googleLogin)}
          >
            <span className="google-letter" aria-hidden="true">
              G
            </span>{" "}
            Continuar com Google
          </button>
          <div className="form-divider">
            <span>ou com seu e-mail</span>
          </div>
        </>
      )}
      <form onSubmit={submit} key={mode}>
        <fieldset disabled={busy}>
          {mode === "register" && (
            <label>
              Seu nome
              <input
                autoComplete="name"
                name="name"
                placeholder="Como podemos chamar você?"
                minLength={2}
                maxLength={80}
                required
              />
            </label>
          )}
          <label>
            E-mail
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              maxLength={254}
              required
            />
          </label>
          {mode !== "reset" && (
            <label>
              Senha
              <div className="password-input">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  placeholder={
                    mode === "register"
                      ? "Pelo menos 8 caracteres"
                      : "Sua senha"
                  }
                  minLength={mode === "register" ? 8 : 1}
                  maxLength={128}
                  required
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
          )}
          {mode === "login" && (
            <button
              className="text-button forgot"
              type="button"
              onClick={() => changeMode("reset")}
            >
              Esqueci minha senha
            </button>
          )}
          {mode === "register" && (
            <label className="checkbox-label">
              <input type="checkbox" required name="terms" />
              <span>
                Li e aceito os{" "}
                <a
                  href="#termos"
                  target="_blank"
                  rel="noopener"
                  aria-label="Termos de uso (abre em nova aba)"
                  className="inline-link"
                >
                  Termos de uso
                </a>{" "}
                e a{" "}
                <a
                  href="#privacidade"
                  target="_blank"
                  rel="noopener"
                  aria-label="Política de privacidade (abre em nova aba)"
                  className="inline-link"
                >
                  Política de privacidade
                </a>
                .
              </span>
            </label>
          )}
          {messages}
          <button className="button primary full" type="submit">
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : (
              <ArrowRight size={17} />
            )}
            {mode === "register"
              ? "Criar minha conta"
              : mode === "login"
                ? "Entrar na minha conta"
                : "Enviar instruções"}
          </button>
        </fieldset>
      </form>
      {mode === "reset" && (
        <button
          className="text-button full"
          onClick={() => changeMode("login")}
        >
          Voltar para entrar
        </button>
      )}
      <p className="auth-footnote">
        <ShieldCheck size={13} /> Seus dados financeiros continuam no
        aplicativo.
      </p>
    </>
  );
}
