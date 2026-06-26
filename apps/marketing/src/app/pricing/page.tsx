"use client";

import { useEffect } from "react";

/** Redirect legacy /pricing route to the pricing section on the home page. */
export default function PricingRedirectPage() {
  useEffect(() => {
    window.location.replace("/#pricing");
  }, []);

  return (
    <p className="px-4 py-16 text-center text-muted-foreground">
      Redirecting to pricing…{" "}
      <a href="/#pricing" className="link-brand">
        Continue
      </a>
    </p>
  );
}
