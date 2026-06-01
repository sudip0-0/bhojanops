"use client";

import { Button } from "@/components/ui/button";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Button> & { confirmMessage: string };

/** Submit button that asks for confirmation before allowing the form action to run. */
export function ConfirmButton({ confirmMessage, ...props }: Props) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    />
  );
}
