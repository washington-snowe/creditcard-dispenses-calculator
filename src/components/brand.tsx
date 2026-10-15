export function BrandLogo({
  variant = "full",
}: {
  variant?: "full" | "symbol" | "responsive";
}) {
  return (
    <div className={`brand-lockup ${variant}`}>
      {variant !== "symbol" && (
        <img
          className="brand-full brand-name"
          src={`${import.meta.env.BASE_URL}brand/logo.png`}
          alt="ContaClara"
          width="1774"
          height="887"
          draggable={false}
        />
      )}
      {variant !== "full" && (
        <img
          className="brand-symbol"
          src={`${import.meta.env.BASE_URL}brand/icon.png`}
          alt="ContaClara"
          width="256"
          height="256"
          draggable={false}
        />
      )}
    </div>
  );
}
