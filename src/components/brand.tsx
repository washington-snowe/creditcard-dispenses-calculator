export function BrandLogo({
  variant = "full",
}: {
  variant?: "full" | "symbol" | "responsive";
}) {
  return (
    <div className={`brand-lockup ${variant}`}>
      {variant !== "symbol" && (
        <span
          className="brand-full brand-name"
          role="img"
          aria-label="ContaClara"
        />
      )}
      {variant !== "full" && (
        <span className="brand-symbol" role="img" aria-label="ContaClara" />
      )}
    </div>
  );
}
