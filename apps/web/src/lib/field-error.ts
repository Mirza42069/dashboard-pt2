/**
 * Validation messages for one field, wired to the control that produced them.
 *
 * The pair below always travel together:
 *
 *   const email = fieldError("email", field.state.meta.errors);
 *   <Input {...email.control} />
 *   <FieldError {...email} />
 *
 * `control` carries the ARIA the input needs; the component renders the text
 * and owns the id they agree on. Neither is useful without the other, which is
 * the point — it is hard to add the visible half and forget the announced half.
 *
 * Without this a field does not report itself as invalid, and moving focus to
 * it announces the label and the value as though nothing had happened.
 */
export type FieldErrorState = {
  id: string;
  messages: string[];
  control: {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  };
};

type RawError = { message?: string } | string | undefined | null;

/**
 * @param name  Field name. Also the control's `id`, so a `<Label for>` already
 *              pointing at it keeps working untouched.
 * @param errors  Whatever the form library hands back. TanStack Form gives
 *                `{ message }` objects from a Zod resolver, but plain strings
 *                turn up too, so both are accepted.
 */
export function fieldError(name: string, errors: readonly RawError[] = []): FieldErrorState {
  const messages = errors
    .map((error) => (typeof error === "string" ? error : error?.message))
    .filter((message): message is string => Boolean(message));

  const id = `${name}-error`;
  const invalid = messages.length > 0;

  return {
    id,
    messages,
    control: {
      id: name,
      "aria-invalid": invalid,
      // Only point at the error node when it is actually rendered — a dangling
      // aria-describedby is read as nothing by some screen readers and as the
      // whole page by others.
      "aria-describedby": invalid ? id : undefined,
    },
  };
}

/**
 * Moves focus to the first control that failed validation.
 *
 * Call it from the form's submit handler after validation resolves. Without it
 * a keyboard user submitting a long form is left wherever they were — usually
 * on the submit button, below every error — and has to shift-tab back up
 * hunting for the field that broke.
 */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  const first = form?.querySelector<HTMLElement>("[aria-invalid='true']");
  first?.focus();
}
