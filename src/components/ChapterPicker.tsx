import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  PRE_BOOK_LABEL,
  chapterBook,
  chapterNumber,
  readThroughLabel,
  visibleChapterTitle,
  type NarrativeChapterSummary,
} from "../narrative/progress";
import { BookGlyph, CloseIcon, ShieldIcon } from "./icons";

// The Read through chapter picker (compact chapter selector, Variant A): a
// popover under the top-bar chip on desktop and a bottom sheet on compact
// layouts. It only reports a choice; the caller owns the confirmation.

const GRID_COLUMNS = 5;
const FOCUSABLE_PICKER_ELEMENTS =
  'button:not(:disabled):not([tabindex="-1"]), [tabindex="0"]';

interface ChapterPickerProps {
  chapters: readonly NarrativeChapterSummary[];
  /** The confirmed Read through chapter, or "" for the pre-book zero state. */
  value: string;
  anchor: RefObject<HTMLElement | null>;
  onChoose: (chapter: string) => void;
  onClose: () => void;
}

export function ChapterPicker({
  chapters,
  value,
  anchor,
  onChoose,
  onClose,
}: ChapterPickerProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const books = useMemo(() => {
    const grouped = new Map<string, NarrativeChapterSummary[]>();
    for (const chapter of chapters) {
      const book = chapterBook(chapter.chapter);
      grouped.set(book, [...(grouped.get(book) ?? []), chapter]);
    }
    return [...grouped].map(([book, bookChapters]) => ({
      book,
      chapters: bookChapters,
    }));
  }, [chapters]);
  const [activeBook, setActiveBook] = useState(
    () => (value ? chapterBook(value) : books[0]?.book) ?? "",
  );
  const activeChapters =
    books.find(({ book }) => book === activeBook)?.chapters ?? [];
  const [focusKey, setFocusKey] = useState(() =>
    value && activeChapters.some(({ chapter }) => chapter === value)
      ? value
      : "",
  );
  const [position, setPosition] = useState<{ top: number; right: number }>();

  // Desktop popover: right-anchored under the chip. Compact CSS ignores it.
  useLayoutEffect(() => {
    const place = () => {
      const rect = anchor.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: Math.round(rect.bottom + 6),
        right: Math.max(8, Math.round(window.innerWidth - rect.right)),
      });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor]);

  const radioFor = (key: string) =>
    dialog.current?.querySelector<HTMLElement>(
      `[role="radio"][data-chapter="${key}"]`,
    );

  // Initial focus: the current radio, scrolled into view.
  useEffect(() => {
    const radio = radioFor(focusKey);
    radio?.focus();
    radio?.scrollIntoView?.({ block: "center" });
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escape closes; Tab and Shift+Tab stay inside the picker. On the document
  // so keys pressed after a click on plain picker text are caught too.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>("*") ?? [],
      ).filter((element) => element.matches(FOCUSABLE_PICKER_ELEMENTS));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      const inside = focusable.includes(active as HTMLElement);
      if (event.shiftKey && (active === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const moveFocus = (key: string) => {
    setFocusKey(key);
    const radio = radioFor(key);
    radio?.focus();
    radio?.scrollIntoView?.({ block: "nearest" });
  };

  const onRadioKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const keys = activeChapters.map(({ chapter }) => chapter);
    const index = focusKey ? keys.indexOf(focusKey) : -1;
    let next: string | undefined;
    switch (event.key) {
      case "ArrowRight":
        next = index < 0 ? keys[0] : keys[Math.min(index + 1, keys.length - 1)];
        break;
      case "ArrowLeft":
        next = index <= 0 ? "" : keys[index - 1];
        break;
      case "ArrowDown":
        next =
          index < 0
            ? keys[0]
            : index + GRID_COLUMNS < keys.length
              ? keys[index + GRID_COLUMNS]
              : focusKey;
        break;
      case "ArrowUp":
        next = index < GRID_COLUMNS ? "" : keys[index - GRID_COLUMNS];
        break;
      case "Home":
        next = keys[0];
        break;
      case "End":
        next = keys[keys.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    if (next !== undefined) moveFocus(next);
  };

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const index = books.findIndex(({ book }) => book === activeBook);
    let next: number;
    switch (event.key) {
      case "ArrowRight":
        next = (index + 1) % books.length;
        break;
      case "ArrowLeft":
        next = (index - 1 + books.length) % books.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = books.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const book = books[next]!.book;
    selectBook(book);
    dialog.current
      ?.querySelector<HTMLElement>(`[role="tab"][data-book="${book}"]`)
      ?.focus();
  };

  const selectBook = (book: string) => {
    setActiveBook(book);
    if (focusKey && chapterBook(focusKey) !== book) {
      const bookChapters =
        books.find((entry) => entry.book === book)?.chapters ?? [];
      setFocusKey(
        value && chapterBook(value) === book
          ? value
          : (bookChapters[0]?.chapter ?? ""),
      );
    }
  };

  const radio = (key: string) => ({
    role: "radio" as const,
    type: "button" as const,
    "aria-checked": key === value,
    "data-chapter": key,
    tabIndex: key === focusKey ? 0 : -1,
    onClick: () => onChoose(key),
    onFocus: () => setFocusKey(key),
    onKeyDown: onRadioKeyDown,
  });

  return createPortal(
    <>
      <div
        className="chapter-picker-backdrop"
        aria-hidden="true"
        data-testid="chapter-picker-backdrop"
        onClick={onClose}
      />
      <div
        ref={dialog}
        className="chapter-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chapter-picker-title"
        style={
          position && {
            ["--picker-top" as string]: `${position.top}px`,
            ["--picker-right" as string]: `${position.right}px`,
          }
        }
      >
        <header className="chapter-picker-header">
          <ShieldIcon />
          <h2 id="chapter-picker-title">Read through</h2>
          <button
            type="button"
            className="button chapter-picker-close"
            aria-label="Close"
            title="Close"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>
        <div
          className="chapter-picker-body"
          role="radiogroup"
          aria-labelledby="chapter-picker-title"
        >
          <button className="chapter-picker-prebook" {...radio("")}>
            <span className="chapter-picker-start" aria-hidden="true">
              Start
            </span>
            <span>{PRE_BOOK_LABEL}</span>
          </button>
          <div
            className="chapter-picker-tabs"
            role="tablist"
            aria-label="Books"
          >
            {books.map(({ book, chapters: bookChapters }) => (
              <button
                key={book}
                type="button"
                role="tab"
                id={`chapter-picker-tab-${book}`}
                data-book={book}
                aria-selected={book === activeBook}
                aria-controls={`chapter-picker-panel-${book}`}
                aria-label={`Book ${book}, ${bookChapters.length} chapters`}
                tabIndex={book === activeBook ? 0 : -1}
                onClick={() => selectBook(book)}
                onKeyDown={onTabKeyDown}
              >
                <BookGlyph />
                <span className="chapter-picker-tab-title">Book {book}</span>
                <span className="chapter-picker-tab-count">
                  {bookChapters.length} chapters
                </span>
              </button>
            ))}
          </div>
          <div
            className="chapter-picker-grid"
            role="tabpanel"
            id={`chapter-picker-panel-${activeBook}`}
            aria-labelledby={`chapter-picker-tab-${activeBook}`}
          >
            {activeChapters.map(({ chapter }) => {
              // Only chapters at or before the confirmed Read through may
              // name their title; later cells stay number-only. The title is
              // the cell's tooltip (and so its accessible description); the
              // accessible name stays the stable "Book N · Chapter M".
              const title = visibleChapterTitle(chapters, chapter, value);
              return (
                <button
                  key={chapter}
                  className="chapter-picker-cell"
                  aria-label={readThroughLabel(chapter)}
                  title={title ?? undefined}
                  {...radio(chapter)}
                >
                  {chapterNumber(chapter)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
