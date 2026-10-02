import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
} from "lucide-react";

const ALLOWED_TAGS = new Set(["br", "div", "em", "i", "p", "span", "strong", "b"]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeStyle(style: string): string {
  return style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separator = declaration.indexOf(":");
      if (separator < 0) return null;

      const property = declaration.slice(0, separator).trim().toLowerCase();
      const value = declaration.slice(separator + 1).trim().toLowerCase();

      if (property === "text-align" && /^(left|center|right|justify)$/.test(value)) {
        return `${property}: ${value}`;
      }

      if (
        property === "font-size" &&
        /^(?:\d{1,3}(?:\.\d{1,2})?)(?:px|pt|em|rem|%)$/.test(value)
      ) {
        return `${property}: ${value}`;
      }

      if (property === "font-weight" && /^(normal|bold|[1-9]00)$/.test(value)) {
        return `${property}: ${value}`;
      }

      if (property === "font-style" && /^(normal|italic)$/.test(value)) {
        return `${property}: ${value}`;
      }

      return null;
    })
    .filter((declaration): declaration is string => declaration !== null)
    .join("; ");
}

/**
 * Keep the editor and rendered description limited to the formatting features
 * supported by the product. This also protects dangerouslySetInnerHTML from
 * legacy or pasted markup that did not originate in this editor.
 */
export function sanitizeRichTextHtml(value: string): string {
  if (!value) return "";

  // Existing descriptions are plain text. Convert their line breaks to HTML
  // without interpreting angle brackets as markup.
  if (!/<\s*\/?\s*[a-z][^>]*>/i.test(value)) {
    return escapeHtml(value).replace(/\r?\n/g, "<br>");
  }

  const documentParser = new DOMParser();
  const source = documentParser.parseFromString(value, "text/html");
  const output = source.createElement("div");

  const appendNode = (node: Node, parent: HTMLElement): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(source.createTextNode(node.textContent ?? ""));
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();

    // Drop dangerous containers entirely. Unsupported formatting tags are
    // unwrapped so their readable text is preserved.
    if (["script", "style", "iframe", "object", "embed", "svg", "math"].includes(tag)) {
      return;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      Array.from(element.childNodes).forEach((child) => appendNode(child, parent));
      return;
    }

    const clean = source.createElement(tag);
    if (["div", "p", "span"].includes(tag)) {
      const cleanStyle = sanitizeStyle(element.getAttribute("style") ?? "");
      if (cleanStyle) clean.setAttribute("style", cleanStyle);
    }

    Array.from(element.childNodes).forEach((child) => appendNode(child, clean));
    parent.appendChild(clean);
  };

  Array.from(source.body.childNodes).forEach((child) => appendNode(child, output));
  return output.innerHTML;
}

function hasText(value: string): boolean {
  const documentParser = new DOMParser();
  return Boolean(
    documentParser
      .parseFromString(value, "text/html")
      .body.textContent
      ?.replace(/\u200B/g, "")
      .trim(),
  );
}

function editorHtml(value: string): string {
  return sanitizeRichTextHtml(value);
}

type ToolbarButtonProps = {
  label: string;
  onCommand: () => void;
  active?: boolean;
  children: ReactNode;
};

function ToolbarButton({ label, onCommand, active = false, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(event) => {
        event.preventDefault();
        onCommand();
      }}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
        active
          ? "bg-blue-100 text-blue-700 shadow-inner dark:bg-blue-500/25 dark:text-blue-200"
          : "text-slate-600 hover:bg-slate-200 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Tulis deskripsi...",
  ariaLabel = "Deskripsi",
  className = "",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<Range | null>(null);
  const typingMarkerRef = useRef<HTMLElement | null>(null);
  const localValueRef = useRef<string | null>(null);
  const [empty, setEmpty] = useState(() => !hasText(value));
  const [toolbarState, setToolbarState] = useState({
    bold: false,
    italic: false,
    alignment: "left" as "left" | "center" | "right" | "justify",
    fontSize: "",
  });
  const renderedValue = useMemo(() => editorHtml(value), [value]);

  const updateToolbarState = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = window.getSelection();
    const anchor = selection?.anchorNode ?? null;
    const focus = selection?.focusNode ?? null;
    if (selection && (!editor.contains(anchor) || !editor.contains(focus))) return;

    let bold = false;
    let italic = false;
    try {
      bold = document.queryCommandState("bold");
      italic = document.queryCommandState("italic");
    } catch {
      // Some browsers throw when queryCommandState runs without a live range.
    }

    const anchorElement = anchor instanceof HTMLElement ? anchor : anchor?.parentElement;
    const blockElement = anchorElement?.closest("div, p") as HTMLElement | null;
    const computedAlignment = blockElement
      ? window.getComputedStyle(blockElement).textAlign
      : "left";
    const alignment = computedAlignment === "center"
      ? "center"
      : computedAlignment === "right" || computedAlignment === "end"
        ? "right"
        : computedAlignment === "justify"
          ? "justify"
          : "left";

    const styledElement = anchorElement?.closest("span") as HTMLElement | null;
    const styledElementStyle = styledElement ? window.getComputedStyle(styledElement) : null;
    if (styledElementStyle?.fontWeight) {
      bold = styledElementStyle.fontWeight === "bold" || Number.parseInt(styledElementStyle.fontWeight, 10) >= 600;
    }
    if (styledElementStyle?.fontStyle) {
      italic = styledElementStyle.fontStyle === "italic";
    }

    const computedFontSize = styledElement?.style.fontSize && styledElementStyle
      ? Math.round(Number.parseFloat(styledElementStyle.fontSize))
      : 0;
    const fontSize = [12, 14, 16, 18, 20, 24, 32].includes(computedFontSize)
      ? String(computedFontSize)
      : "";

    setToolbarState((current) => (
      current.bold === bold &&
      current.italic === italic &&
      current.alignment === alignment &&
      current.fontSize === fontSize
        ? current
        : { bold, italic, alignment, fontSize }
    ));
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Avoid rewriting innerHTML after every keystroke, which would move the
    // caret to the end and make typing feel broken.
    if (localValueRef.current === value) {
      localValueRef.current = null;
      setEmpty(!hasText(value));
      return;
    }

    if (editor.innerHTML !== renderedValue) {
      editor.innerHTML = renderedValue;
    }
    setEmpty(!hasText(value));
    updateToolbarState();
  }, [renderedValue, updateToolbarState, value]);

  useEffect(() => {
    const handleSelectionChange = () => {
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (!editor || !selection || !editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return;
      updateToolbarState();
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [updateToolbarState]);

  const saveSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || selection.isCollapsed && !editor.contains(selection.anchorNode)) {
      return;
    }
    if (!editor.contains(selection.anchorNode) || !editor.contains(selection.focusNode)) return;
    selectionRef.current = selection.getRangeAt(0).cloneRange();
    updateToolbarState();
  }, [updateToolbarState]);

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    const range = selectionRef.current;
    if (!editor || !range || !editor.contains(range.commonAncestorContainer)) {
      editor?.focus();
      return;
    }

    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
    editor.focus();
  }, []);

  const clearTypingMarker = useCallback((removeEmptyMarker = false) => {
    const marker = typingMarkerRef.current;
    if (!marker) return;

    if (removeEmptyMarker && marker.textContent?.replace(/\u200B/g, "") === "") {
      const parent = marker.parentNode;
      const markerIndex = parent ? Array.prototype.indexOf.call(parent.childNodes, marker) : -1;
      marker.remove();
      if (parent && markerIndex >= 0) {
        const range = document.createRange();
        range.setStart(parent, Math.min(markerIndex, parent.childNodes.length));
        range.collapse(true);
        selectionRef.current = range;
      }
    } else {
      const walker = document.createTreeWalker(marker, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      let node = walker.nextNode();
      while (node) {
        textNodes.push(node as Text);
        node = walker.nextNode();
      }
      textNodes.forEach((textNode) => {
        textNode.textContent = textNode.textContent?.replace(/\u200B/g, "") ?? "";
      });
      marker.removeAttribute("data-rich-text-typing");
    }

    typingMarkerRef.current = null;
  }, []);

  const insertTypingMarker = useCallback((
    tag: "div" | "span",
    styles: Partial<Pick<CSSStyleDeclaration, "fontWeight" | "fontStyle" | "fontSize" | "textAlign">>,
  ): boolean => {
    const existingMarker = typingMarkerRef.current;
    if (existingMarker && existingMarker.textContent?.replace(/\u200B/g, "") === "") {
      let marker = existingMarker;
      if (marker.tagName.toLowerCase() !== tag) {
        const replacement = document.createElement(tag);
        replacement.setAttribute("data-rich-text-typing", "true");
        replacement.style.cssText = marker.style.cssText;
        while (marker.firstChild) replacement.appendChild(marker.firstChild);
        marker.replaceWith(replacement);
        marker = replacement;
        typingMarkerRef.current = marker;
      }

      Object.assign(marker.style, styles);
      const placeholder = Array.from(marker.childNodes).find(
        (node): node is Text => node.nodeType === Node.TEXT_NODE && node.textContent?.includes("\u200B") === true,
      );
      const editor = editorRef.current;
      const selection = window.getSelection();
      if (!editor || !placeholder || !selection) return false;

      const range = document.createRange();
      range.setStart(placeholder, 0);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
      editor.focus();
      selectionRef.current = range.cloneRange();
      return true;
    }

    clearTypingMarker(true);
    restoreSelection();

    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0 || !selection.isCollapsed) return false;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return false;

    const marker = document.createElement(tag);
    marker.setAttribute("data-rich-text-typing", "true");
    Object.assign(marker.style, styles);
    const placeholder = document.createTextNode("\u200B");
    marker.appendChild(placeholder);
    range.insertNode(marker);
    range.setStart(placeholder, 0);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    selectionRef.current = range.cloneRange();
    typingMarkerRef.current = marker;
    return true;
  }, [clearTypingMarker, restoreSelection]);

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextValue = editor.innerHTML === "<br>" ? "" : editor.innerHTML;
    localValueRef.current = nextValue;
    setEmpty(!hasText(nextValue));
    onChange(nextValue);
    saveSelection();
  }, [onChange, saveSelection]);

  const runCommand = useCallback((command: string) => {
    restoreSelection();
    const selection = window.getSelection();
    const editor = editorRef.current;
    const isCollapsed = Boolean(
      editor &&
      selection?.rangeCount &&
      selection.isCollapsed &&
      editor.contains(selection.anchorNode) &&
      editor.contains(selection.focusNode),
    );
    const typingMarker = typingMarkerRef.current;
    const hasEmptyTypingMarker = typingMarker?.textContent?.replace(/\u200B/g, "") === "";
    const currentBold = hasEmptyTypingMarker && typingMarker?.style.fontWeight
      ? typingMarker.style.fontWeight === "bold" || Number.parseInt(typingMarker.style.fontWeight, 10) >= 600
      : toolbarState.bold;
    const currentItalic = hasEmptyTypingMarker && typingMarker?.style.fontStyle
      ? typingMarker.style.fontStyle === "italic"
      : toolbarState.italic;

    if (isCollapsed && (command === "bold" || command === "italic")) {
      const bold = command === "bold" ? !currentBold : currentBold;
      const italic = command === "italic" ? !currentItalic : currentItalic;
      if (insertTypingMarker("span", {
        fontWeight: bold ? "700" : "400",
        fontStyle: italic ? "italic" : "normal",
      })) {
        setToolbarState((current) => ({ ...current, bold, italic }));
        return;
      }
    }

    if (isCollapsed && command.startsWith("justify") && !hasText(editorRef.current?.innerHTML ?? "")) {
      const alignment = command === "justifyCenter"
        ? "center"
        : command === "justifyRight"
          ? "right"
          : command === "justifyFull"
            ? "justify"
            : "left";
      const alignmentStyles: Partial<Pick<CSSStyleDeclaration, "fontWeight" | "fontStyle" | "fontSize" | "textAlign">> = {
        textAlign: alignment,
        fontWeight: currentBold ? "700" : "400",
        fontStyle: currentItalic ? "italic" : "normal",
      };
      if (toolbarState.fontSize) alignmentStyles.fontSize = `${toolbarState.fontSize}px`;
      if (insertTypingMarker("div", alignmentStyles)) {
        setToolbarState((current) => ({ ...current, alignment }));
        return;
      }
    }

    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false);
    emitChange();
  }, [
    emitChange,
    insertTypingMarker,
    restoreSelection,
    toolbarState.bold,
    toolbarState.fontSize,
    toolbarState.italic,
  ]);

  const applyFontSize = useCallback((size: string) => {
    const selection = window.getSelection();
    if (selection?.rangeCount && selection.isCollapsed && insertTypingMarker("span", {
      fontSize: `${size}px`,
      fontWeight: toolbarState.bold ? "700" : "400",
      fontStyle: toolbarState.italic ? "italic" : "normal",
    })) {
      setToolbarState((current) => ({ ...current, fontSize: size }));
      return;
    }

    restoreSelection();
    // execCommand uses a legacy size scale. Convert the generated marker to
    // an explicit pixel value so the saved HTML is predictable.
    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("fontSize", false, "7");
    editorRef.current?.querySelectorAll('font[size="7"]').forEach((font) => {
      const span = document.createElement("span");
      span.style.fontSize = `${size}px`;
      while (font.firstChild) span.appendChild(font.firstChild);
      font.replaceWith(span);
    });
    emitChange();
  }, [emitChange, insertTypingMarker, restoreSelection, toolbarState.bold, toolbarState.italic]);

  const handleInput = () => {
    clearTypingMarker();
    emitChange();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const content = html ? sanitizeRichTextHtml(html) : escapeHtml(text).replace(/\r?\n/g, "<br>");
    restoreSelection();
    document.execCommand("insertHTML", false, content);
    emitChange();
  };

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 dark:border-slate-700/80 dark:bg-slate-800/40 ${className}`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white/80 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-900/70">
        <ToolbarButton label="Bold" active={toolbarState.bold} onCommand={() => runCommand("bold")}>
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={toolbarState.italic} onCommand={() => runCommand("italic")}>
          <Italic size={16} />
        </ToolbarButton>
        <select
          aria-label="Ukuran font"
          value={toolbarState.fontSize}
          onMouseDown={saveSelection}
          onChange={(event) => {
            if (event.target.value) applyFontSize(event.target.value);
          }}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="" disabled>Font size</option>
          {[12, 14, 16, 18, 20, 24, 32].map((size) => (
            <option key={size} value={size}>{size}px</option>
          ))}
        </select>
        <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
        <ToolbarButton label="Rata kiri" active={toolbarState.alignment === "left"} onCommand={() => runCommand("justifyLeft")}>
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton label="Rata tengah" active={toolbarState.alignment === "center"} onCommand={() => runCommand("justifyCenter")}>
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton label="Rata kanan" active={toolbarState.alignment === "right"} onCommand={() => runCommand("justifyRight")}>
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton label="Rata kiri-kanan" active={toolbarState.alignment === "justify"} onCommand={() => runCommand("justifyFull")}>
          <AlignJustify size={16} />
        </ToolbarButton>
      </div>

      <div className="relative">
        {empty ? (
          <span className="pointer-events-none absolute left-5 top-5 text-[15px] text-slate-400 dark:text-slate-500">
            {placeholder}
          </span>
        ) : null}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label={ariaLabel}
          aria-multiline="true"
          onInput={handleInput}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onFocus={updateToolbarState}
          onSelect={updateToolbarState}
          onBlur={saveSelection}
          onPaste={handlePaste}
          className="min-h-[300px] max-h-[70vh] overflow-y-auto whitespace-normal break-words p-5 text-[15px] leading-relaxed text-slate-800 outline-none focus:ring-4 focus:ring-blue-500/10 dark:text-slate-100 sm:min-h-[440px] sm:text-base lg:min-h-[560px] [&_div]:min-h-[1.5em] [&_p]:min-h-[1.5em]"
        />
      </div>
    </div>
  );
}

interface RichTextContentProps {
  value?: string | null;
  className?: string;
}

export function RichTextContent({ value, className = "" }: RichTextContentProps) {
  const html = sanitizeRichTextHtml(value ?? "");
  if (!html) return null;

  return (
    <div
      className={`whitespace-normal break-words [&_div]:min-h-[1.5em] [&_p]:min-h-[1.5em] ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default RichTextEditor;
