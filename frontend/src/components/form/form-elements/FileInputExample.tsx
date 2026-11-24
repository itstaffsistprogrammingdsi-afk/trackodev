import ComponentCard from "../../common/ComponentCard";
import FileInput from "../input/FileInput";
import Label from "../Label";
import { useLanguage } from "@/context/LanguageContext";

export default function FileInputExample() {
  const { t } = useLanguage();
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("Selected file:", file.name);
    }
  };

  return (
      <ComponentCard title={t("Input file", "File input")}>
      <div>
        <Label>{t("Unggah file", "Upload file")}</Label>
        <FileInput onChange={handleFileChange} className="custom-class" />
      </div>
    </ComponentCard>
  );
}
