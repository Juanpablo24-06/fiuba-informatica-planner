import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hideChevron?: boolean;
}

const readOptions = (children: React.ReactNode): SelectOption[] =>
  React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child) || child.type !== "option") return [];
    const props = child.props as React.OptionHTMLAttributes<HTMLOptionElement>;
    return [{
      value: String(props.value ?? ""),
      label: props.children,
      disabled: props.disabled
    }];
  });

const readValue = (value: SelectProps["value"] | SelectProps["defaultValue"]) => {
  if (Array.isArray(value)) return String(value[0] ?? "");
  return value === undefined || value === null ? "" : String(value);
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      children,
      hideChevron,
      value,
      defaultValue,
      onChange,
      disabled,
      id,
      name,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      ...props
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const listId = React.useId();
    const [open, setOpen] = React.useState(false);
    const [selectedValue, setSelectedValue] = React.useState(readValue(value ?? defaultValue));
    const options = React.useMemo(() => readOptions(children), [children]);
    const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];
    const isControlled = value !== undefined;

    React.useEffect(() => {
      if (isControlled) setSelectedValue(readValue(value));
    }, [isControlled, value]);

    React.useEffect(() => {
      if (!open) return;
      const handlePointerDown = (event: PointerEvent) => {
        if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
      };
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
      };
      document.addEventListener("pointerdown", handlePointerDown);
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("pointerdown", handlePointerDown);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }, [open]);

    React.useEffect(() => {
      if (!open) return;
      const frame = requestAnimationFrame(() => {
        const options = containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not([disabled])');
        (Array.from(options ?? []).find((option) => option.getAttribute("aria-selected") === "true") ?? options?.[0])?.focus();
      });
      return () => cancelAnimationFrame(frame);
    }, [open]);
    const selectOption = (option: SelectOption) => {
      if (option.disabled || disabled) return;
      setSelectedValue(option.value);
      setOpen(false);
      triggerRef.current?.focus();
      if (!onChange) return;
      const target = { value: option.value, name: name ?? "" } as HTMLSelectElement;
      onChange({ target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>);
    };

    return (
      <div ref={containerRef} className="relative w-full" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        if (!open) { setOpen(true); return; }
        const choices = Array.from(containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]:not([disabled])') ?? []);
        const current = choices.indexOf(document.activeElement as HTMLButtonElement);
        const index = event.key === "Home" ? 0 : event.key === "End" ? choices.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length;
        choices[index]?.focus();
      }}>
        <select
          ref={ref}
          tabIndex={-1}
          aria-hidden="true"
          name={name}
          value={selectedValue}
          onChange={onChange}
          disabled={disabled}
          className="pointer-events-none absolute h-px w-px opacity-0"
          {...props}
        >
          {children}
        </select>
        <button
          type="button"
          id={id}
          ref={triggerRef}
          aria-controls={open ? listId : undefined}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "group flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface-2 px-4 py-2.5 text-left text-sm font-medium text-text outline-none ring-1 ring-transparent transition-all duration-200 hover:bg-accent/8 focus-visible:border-accent/65 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60",
            open && "border-accent/65 ring-accent/25",
            className
          )}
        >
          <span className="min-w-0 truncate">{selectedOption?.label ?? "Seleccionar"}</span>
          {!hideChevron && (
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition-all duration-200 group-hover:text-accent", open && "rotate-180 text-accent")}>
              <ChevronDown className="h-4 w-4" />
            </span>
          )}
        </button>

        {open && (
          <div className="dropdown-surface absolute inset-x-0 top-[calc(100%+0.55rem)] z-[90] overflow-hidden rounded-2xl p-1.5" id={listId} role="listbox" aria-label={ariaLabel}>
            <div className="context-scrollbar max-h-64 overflow-y-auto">
              {options.map((option) => {
                const selected = option.value === selectedValue;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={option.disabled}
                    onClick={() => selectOption(option)}
                    className={cn(
                      "group/option flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted transition-colors hover:bg-accent/10 hover:text-text focus-visible:bg-accent/10 focus-visible:text-text disabled:cursor-not-allowed disabled:opacity-45",
                      selected && "bg-accent/12 font-semibold text-accent"
                    )}
                  >
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/70 text-transparent transition-colors", selected && "border-accent/50 bg-accent/15 text-accent")}>
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
