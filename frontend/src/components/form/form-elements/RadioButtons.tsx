import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Radio from "../input/Radio";
import { useLanguage } from "@/context/LanguageContext";

export default function RadioButtons() {
  const { t } = useLanguage();
  const [selectedValue, setSelectedValue] = useState<string>("option2");

  const handleRadioChange = (value: string) => {
    setSelectedValue(value);
  };
  return (
    <ComponentCard title={t("Tombol radio", "Radio buttons")}>
      <div className="flex flex-wrap items-center gap-8">
        <Radio
          id="radio1"
          name="group1"
          value="option1"
          checked={selectedValue === "option1"}
          onChange={handleRadioChange}
          label={t("Bawaan", "Default")}
        />
        <Radio
          id="radio2"
          name="group1"
          value="option2"
          checked={selectedValue === "option2"}
          onChange={handleRadioChange}
          label={t("Dipilih", "Selected")}
        />
        <Radio
          id="radio3"
          name="group1"
          value="option3"
          checked={selectedValue === "option3"}
          onChange={handleRadioChange}
          label={t("Dinonaktifkan", "Disabled")}
          disabled={true}
        />
      </div>
    </ComponentCard>
  );
}
