import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Input from "../input/InputField";
import Label from "../Label";
import { useLanguage } from "@/context/LanguageContext";
export default function InputStates() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [emailTwo, setEmailTwo] = useState("");
  const [error, setError] = useState(false);

  // Simulate a validation check
  const validateEmail = (value: string) => {
    const isValidEmail =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
    setError(!isValidEmail);
    return isValidEmail;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    validateEmail(value);
  };
  const handleEmailTwoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmailTwo(value);
    validateEmail(value);
  };
  return (
    <ComponentCard
      title={t("Status input", "Input states")}
      desc={t("Gaya validasi untuk status kesalahan, berhasil, dan nonaktif pada kontrol formulir.", "Validation styles for error, success and disabled states on form controls.")}
    >
      <div className="space-y-5 sm:space-y-6">
        {/* Error Input */}
        <div>
          <Label>{t("Email")}</Label>
          <Input
            type="email"
            value={email}
            error={error}
            onChange={handleEmailChange}
            placeholder={t("Masukkan email Anda", "Enter your email")}
            hint={error ? t("Alamat email ini tidak valid.", "This is an invalid email address.") : ""}
          />
        </div>

        {/* Success Input */}
        <div>
          <Label>{t("Email")}</Label>
          <Input
            type="email"
            value={emailTwo}
            success={!error}
            onChange={handleEmailTwoChange}
            placeholder={t("Masukkan email Anda", "Enter your email")}
            hint={!error ? t("Email valid.", "This is a success message.") : ""}
          />
        </div>

        {/* Disabled Input */}
        <div>
          <Label>{t("Email")}</Label>
          <Input
            type="text"
            value="disabled@example.com"
            disabled={true}
            placeholder={t("Email nonaktif", "Disabled email")}
          />
        </div>
      </div>
    </ComponentCard>
  );
}
