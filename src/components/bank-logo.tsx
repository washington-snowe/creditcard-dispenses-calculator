import { useState } from "react";
import { Landmark } from "lucide-react";
import { bankLogoFile } from "../banks";
export function BankLogo({ bank }: { bank: string }) {
  const file = bankLogoFile(bank);
  const [failed, setFailed] = useState<string | null>(null);
  return (
    <span className="bank-mark" title={bank} data-bank={bank}>
      {file && failed !== file ? (
        <img
          src={`${import.meta.env.BASE_URL}banks/${file}`}
          alt={`Logo ${bank}`}
          draggable={false}
          onError={() => setFailed(file)}
        />
      ) : (
        <Landmark size={22} aria-label={bank} />
      )}
    </span>
  );
}
