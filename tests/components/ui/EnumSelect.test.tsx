import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EnumSelect } from "../../../src/components/ui/EnumSelect";

describe("EnumSelect", () => {
  it("renders a <select> populated with the option list", () => {
    const onChange = vi.fn();
    render(
      <EnumSelect
        value="active"
        options={["active", "inactive", "pending"]}
        onChange={onChange}
        autoFocus={false}
      />,
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    expect(select.value).toBe("active");
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      "active",
      "inactive",
      "pending",
    ]);
  });

  it("calls onChange with the selected option", () => {
    const onChange = vi.fn();
    render(
      <EnumSelect
        value="active"
        options={["active", "inactive"]}
        onChange={onChange}
        autoFocus={false}
      />,
    );

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "inactive" },
    });

    expect(onChange).toHaveBeenCalledWith("inactive");
  });

  it("surfaces a legacy value not present in the option list", () => {
    const onChange = vi.fn();
    render(
      <EnumSelect
        value="archived"
        options={["active", "inactive"]}
        onChange={onChange}
        autoFocus={false}
      />,
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("archived");
    expect(Array.from(select.options).map((o) => o.value)).toContain(
      "archived",
    );
  });

  it("renders a disabled placeholder when value is null", () => {
    const onChange = vi.fn();
    render(
      <EnumSelect
        value={null}
        options={["a", "b"]}
        onChange={onChange}
        autoFocus={false}
      />,
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("");
    const placeholder = Array.from(select.options).find(
      (o) => o.value === "" && o.disabled,
    );
    expect(placeholder).toBeDefined();
  });

  it("does not render a disabled placeholder when empty string is a real enum member", () => {
    const onChange = vi.fn();
    render(
      <EnumSelect
        value=""
        options={["", "active"]}
        onChange={onChange}
        autoFocus={false}
      />,
    );

    const select = screen.getByRole("combobox") as HTMLSelectElement;
    const emptyOptions = Array.from(select.options).filter(
      (o) => o.value === "",
    );
    // Only the real empty-string member, no colliding disabled placeholder.
    expect(emptyOptions).toHaveLength(1);
    expect(emptyOptions[0].disabled).toBe(false);
  });

  it("invokes onBlur when the select loses focus", () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    render(
      <EnumSelect
        value="a"
        options={["a", "b"]}
        onChange={onChange}
        onBlur={onBlur}
        autoFocus={false}
      />,
    );

    fireEvent.blur(screen.getByRole("combobox"));
    expect(onBlur).toHaveBeenCalled();
  });

  it("invokes onKeyDown for Enter/Escape", () => {
    const onChange = vi.fn();
    const onKeyDown = vi.fn();
    render(
      <EnumSelect
        value="a"
        options={["a", "b"]}
        onChange={onChange}
        onKeyDown={onKeyDown}
        autoFocus={false}
      />,
    );

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalledTimes(2);
  });

  it("auto-focuses the select on mount when autoFocus is true", () => {
    const onChange = vi.fn();
    render(
      <EnumSelect
        value="a"
        options={["a", "b"]}
        onChange={onChange}
        autoFocus
      />,
    );

    expect(document.activeElement).toBe(screen.getByRole("combobox"));
  });

  it("does not steal focus by default", () => {
    const onChange = vi.fn();
    render(
      <EnumSelect value="a" options={["a", "b"]} onChange={onChange} />,
    );

    expect(document.activeElement).not.toBe(screen.getByRole("combobox"));
  });
});
