"use client";

import * as React from "react";
import { Button, type buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ButtonVariant = NonNullable<React.ComponentProps<typeof Button>["variant"]>;
type ButtonSize = NonNullable<React.ComponentProps<typeof Button>["size"]>;

export interface ConfirmSubmitProps
  extends Omit<React.ComponentProps<typeof Button>, "type" | "onClick"> {
  /** Title shown in the dialog. */
  title: string;
  /** Body copy explaining the consequence. */
  description: React.ReactNode;
  /** Label for the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to "Cancel". */
  cancelLabel?: string;
  /** Use the destructive button style for the confirm action. */
  destructive?: boolean;
  /** Variant for the trigger button (default = destructive). */
  triggerVariant?: ButtonVariant;
  /** Size for the trigger button. */
  triggerSize?: ButtonSize;
  /** Optional controlled open state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Submit button gated behind a Radix dialog confirmation. Replaces
 * `window.confirm` so the action is keyboard-accessible, focus-trapped,
 * screen-reader-friendly, and testable in jsdom.
 *
 * The form is only submitted when the user explicitly confirms.
 */
export const ConfirmSubmit = React.forwardRef<HTMLButtonElement, ConfirmSubmitProps>(
  function ConfirmSubmit(
    {
      title,
      description,
      confirmLabel = "Confirm",
      cancelLabel = "Cancel",
      destructive = false,
      triggerVariant = "destructive",
      triggerSize,
      className,
      children,
      open,
      onOpenChange,
      ...buttonProps
    },
    forwardedRef,
  ) {
    const innerRef = React.useRef<HTMLButtonElement | null>(null);
    const setRefs = React.useCallback(
      (node: HTMLButtonElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef],
    );

    const triggerFormSubmit = () => {
      const btn = innerRef.current;
      if (!btn) return;
      const form = btn.form;
      if (form && typeof form.requestSubmit === "function") {
        // Submit the form. If the trigger is type=submit, requestSubmit(btn)
        // preserves formaction / formenctype on the trigger; otherwise we
        // submit without a submitter (still triggers React's form action).
        if (btn.type === "submit") form.requestSubmit(btn);
        else form.requestSubmit();
      } else if (form) {
        form.submit();
      } else {
        btn.click();
      }
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger asChild>
          <Button
            ref={setRefs}
            type="button"
            variant={triggerVariant}
            size={triggerSize}
            className={className}
            {...buttonProps}
          >
            {children}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription asChild>
              <div className="text-sm text-muted-foreground">{description}</div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {cancelLabel}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              onClick={triggerFormSubmit}
              autoFocus
            >
              {confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);

/**
 * Backwards-compatible alias — old `ConfirmButton` callers still type-check
 * via the runtime export. New code should use `ConfirmSubmit`.
 */
export function ConfirmButton({
  confirmMessage,
  ...props
}: { confirmMessage: string } & Omit<ConfirmSubmitProps, "title" | "description">) {
  return (
    <ConfirmSubmit
      title="Please confirm"
      description={confirmMessage}
      {...props}
    />
  );
}

// Type re-export so the old `ConfirmButton` `variant` prop stays typed.
export type { buttonVariants };
