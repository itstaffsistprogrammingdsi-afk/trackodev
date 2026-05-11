import { useEffect } from "react";

//   callback: () => void,
//   enabled = true,
// ) {
//   useEffect(() => {
//     if (!enabled) return;

//     const handleEscape = (
//       e: KeyboardEvent,
//     ) => {
//       if (e.key === "Escape") {
//         callback();
//       }
//     };

//     window.addEventListener(
//       "keydown",
//       handleEscape,
//     );

//     return () => {
//       window.removeEventListener(
//         "keydown",
//         handleEscape,
//       );
//     };
//   }, [callback, enabled]);
// }

interface Props {
  // card: Card | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function useEscape({
  // card,
  isOpen,
  onClose,
}: Props) {
  // ===========
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", esc);
    }

    return () => {
      window.removeEventListener("keydown", esc);
    };
  }, [isOpen, onClose]);
}
