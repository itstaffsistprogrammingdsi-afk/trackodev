import ComponentCard from "../../common/ComponentCard";
import Switch from "../switch/Switch";
import { useLanguage } from "@/context/LanguageContext";

export default function ToggleSwitch() {
  const { t } = useLanguage();
  const handleSwitchChange = (checked: boolean) => {
    console.log("Switch is now:", checked ? "ON" : "OFF");
  };
  return (
    <ComponentCard title={t("Input sakelar", "Toggle switch input")}>
      <div className="flex gap-4">
        <Switch
          label={t("Bawaan", "Default")}
          defaultChecked={true}
          onChange={handleSwitchChange}
        />
        <Switch
          label={t("Dipilih", "Checked")}
          defaultChecked={true}
          onChange={handleSwitchChange}
        />
        <Switch label={t("Dinonaktifkan", "Disabled")} disabled={true} />
      </div>{" "}
      <div className="flex gap-4">
        <Switch
          label={t("Bawaan", "Default")}
          defaultChecked={true}
          onChange={handleSwitchChange}
          color="gray"
        />
        <Switch
          label={t("Dipilih", "Checked")}
          defaultChecked={true}
          onChange={handleSwitchChange}
          color="gray"
        />
        <Switch label={t("Dinonaktifkan", "Disabled")} disabled={true} color="gray" />
      </div>
    </ComponentCard>
  );
}
