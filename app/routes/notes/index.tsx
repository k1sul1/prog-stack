import { Link } from "@remix-run/react";

// import { CatchBoundary, ErrorBoundary } from "~/routes/notes/$noteId";
// export { CatchBoundary, ErrorBoundary }; // Sharing is caring!

export default function NoteIndexPage() {
  return (
    <p>
      No note selected. Select a note on the left, or{" "}
      <Link to="new" className="text-blue-500 underline">
        create a new note.
      </Link>
    </p>
  );
}
