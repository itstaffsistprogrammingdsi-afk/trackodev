import { useState } from "react";

export default function useCardSidebar() {
  const [showMembers, setShowMembers] = useState(false);

  const [showDueDate, setShowDueDate] = useState(false);

  const [showAttachment, setShowAttachment] = useState(false);

  const [memberSearch, setMemberSearch] = useState("");

  return {
    showMembers,
    setShowMembers,

    showDueDate,
    setShowDueDate,

    showAttachment,
    setShowAttachment,

    memberSearch,
    setMemberSearch,
  };
}
