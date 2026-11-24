import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import Select from "../Select";
import MultiSelect from "../MultiSelect";
import { useLanguage } from "@/context/LanguageContext";

export default function SelectInputs() {
  const { t } = useLanguage();
  const options = [
    { value: "marketing", label: t("Pemasaran", "Marketing") },
    { value: "template", label: t("Templat", "Template") },
    { value: "development", label: t("Pengembangan", "Development") },
  ];
  const handleSelectChange = (value: string) => {
    console.log("Selected value:", value);
  };
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  const multiOptions = [
    { value: "1", text: t("Opsi 1", "Option 1"), selected: false },
    { value: "2", text: t("Opsi 2", "Option 2"), selected: false },
    { value: "3", text: t("Opsi 3", "Option 3"), selected: false },
    { value: "4", text: t("Opsi 4", "Option 4"), selected: false },
    { value: "5", text: t("Opsi 5", "Option 5"), selected: false },
  ];
  return (
    <ComponentCard title={t("Input pilihan", "Select inputs")}>
      <div className="space-y-6">
        <div>
          <Label>{t("Input pilihan", "Select input")}</Label>
          <Select
            options={options}
            placeholder={t("Pilih opsi", "Select option")}
            onChange={handleSelectChange}
            className="dark:bg-dark-900"
          />
        </div>
        <div>
          <MultiSelect
            label={t("Opsi pilihan ganda", "Multiple select options")}
            options={multiOptions}
            defaultSelected={["1", "3"]}
            onChange={(values) => setSelectedValues(values)}
          />
          <p className="sr-only">
            {t("Nilai yang dipilih:", "Selected values:")} {selectedValues.join(", ")}
          </p>
        </div>
      </div>
    </ComponentCard>
  );
}
