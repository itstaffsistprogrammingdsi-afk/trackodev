import { useLanguage } from "@/context/LanguageContext";

export default function TwentyOneIsToNine() {
  const { t } = useLanguage();
  return (
    <div className="aspect-21/9 overflow-hidden rounded-lg">
      <iframe
        src="https://www.youtube.com/embed/dQw4w9WgXcQ"
        title={t("Video YouTube", "YouTube video")}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full"
      ></iframe>
    </div>
  );
}
