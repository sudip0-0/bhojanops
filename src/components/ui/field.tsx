import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export interface FieldProps {
  label: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * A labelled form field with optional hint and inline error.
 *
 * `Field` is a thin layout wrapper around `Label` + an arbitrary control.
 * Pass the form control (Input, Select, Textarea, ...) as `children`. The
 * `htmlFor` defaults to the id React gives the first child when it is a
 * labelled element; you can set it explicitly to wire `Label` to a child id.
 */
export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  const generatedId = React.useId();
  const id = htmlFor ?? generatedId;
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span className="ml-0.5 text-destructive" aria-hidden>*</span> : null}
      </Label>
      {/*
       * If the consumer passed a child without an id, we attach the generated
       * id to the first element so the <Label htmlFor> still focuses it.
       * Most form controls accept id via React.cloneElement.
       */}
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id })
        : children}
      {hint && !error ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
