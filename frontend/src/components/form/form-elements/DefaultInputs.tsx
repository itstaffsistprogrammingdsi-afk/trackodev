import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import Input from "../input/InputField";
import Select from "../Select";
import { EyeCloseIcon, EyeIcon, TimeIcon } from "../../../icons";
import DatePicker from "../date-picker.tsx";
import { useLanguage } from "@/context/LanguageContext";

export default function DefaultInputs() {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const options = [
    { value: "marketing", label: t("Pemasaran", "Marketing") },
    { value: "template", label: t("Templat", "Template") },
    { value: "development", label: t("Pengembangan", "Development") },
  ];
  const handleSelectChange = (value: string) => {
    console.log("Selected value:", value);
  };

  return (
    <ComponentCard title={t("Input bawaan", "Default inputs")}>
      <div className="space-y-6">
        <div>
          <Label htmlFor="input">{t("Input")}</Label>
          <Input type="text" id="input" />
        </div>
        <div>
          <Label htmlFor="inputTwo">{t("Input dengan placeholder", "Input with placeholder")}</Label>
          <Input type="text" id="inputTwo" placeholder="info@gmail.com" />
        </div>
        <div>
          <Label>{t("Input pilihan", "Select input")}</Label>
          <Select
            options={options}
            placeholder={t("Pilih opsi", "Select an option")}
            onChange={handleSelectChange}
            className="dark:bg-dark-900"
          />
        </div>
        <div>
          <Label>{t("Input kata sandi", "Password input")}</Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder={t("Masukkan kata sandi Anda", "Enter your password")}
            />
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
            >
              {showPassword ? (
                <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
              ) : (
                <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
              )}
            </button>
          </div>
        </div>

        <div>
          <DatePicker
            id="date-picker"
            label={t("Input pemilih tanggal", "Date picker input")}
            placeholder={t("Pilih tanggal", "Select a date")}
            onChange={(dates, currentDateString) => {
              // Handle your logic
              console.log({ dates, currentDateString });
            }}
          />
        </div>

        <div>
          <Label htmlFor="tm">{t("Input pemilih waktu", "Time picker input")}</Label>
          <div className="relative">
            <Input
              type="time"
              id="tm"
              name="tm"
              onChange={(e) => console.log(e.target.value)}
            />
            <span className="absolute text-fg-muted -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-fg-subtle">
              <TimeIcon className="size-6" />
            </span>
          </div>
        </div>
        <div>
          <Label htmlFor="tm">{t("Input pembayaran", "Payment input")}</Label>
          <div className="relative">
            <Input
              type="text"
              placeholder={t("Nomor kartu", "Card number")}
              className="pl-[62px]"
            />
            <span className="absolute left-0 top-1/2 flex h-11 w-[46px] -translate-y-1/2 items-center justify-center border-r border-line dark:border-line">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="6.25" cy="10" r="5.625" fill="#E80B26" />
                <circle cx="13.75" cy="10" r="5.625" fill="#F59D31" />
                <path
                  d="M10 14.1924C11.1508 13.1625 11.875 11.6657 11.875 9.99979C11.875 8.33383 11.1508 6.8371 10 5.80713C8.84918 6.8371 8.125 8.33383 8.125 9.99979C8.125 11.6657 8.84918 13.1625 10 14.1924Z"
                  fill="#FC6020"
                />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}
