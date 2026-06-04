import { useState } from "react";

export default function useCardSidebar() {
  const [showMembers, setShowMembers] = useState(false);

  const [showDueDate, setShowDueDate] = useState(false);

  // const [showAttachment, setShowAttachment] = useState(false);

  const [showBrief, setShowBrief] = useState(false);

const [showResult, setShowResult] = useState(false);

  const [memberSearch, setMemberSearch] = useState("");

  const [showBrands, setShowBrands] = useState(false);


  return {
    showMembers,
    setShowMembers,

    showDueDate,
    setShowDueDate,

    memberSearch,
    setMemberSearch,

    showBrands,
    setShowBrands,  

    showBrief, setShowBrief,

    showResult, setShowResult,
  };
}
