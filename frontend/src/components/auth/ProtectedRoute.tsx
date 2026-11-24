import React from "react";
import { Navigate, useLocation } from "react-router";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    const redirect = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/signin?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    );
  }

  return children;
}
