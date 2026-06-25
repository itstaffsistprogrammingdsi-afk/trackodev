import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = localStorage.getItem("token");

  console.log("PROTECTED ROUTE TOKEN:", token);

  if (!token) {
    console.log("REDIRECT TO SIGNIN");

    return <Navigate to="/signin" replace />;
  }

  return children;
}