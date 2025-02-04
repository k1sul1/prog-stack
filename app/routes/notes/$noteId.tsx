import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useCatch, useLoaderData } from "@remix-run/react";
import { useEffect } from "react";

import { deleteNote } from "~/models/note.server";
import { getNote } from "~/models/note.server";
import {
  authenticate,
  AuthError,
  redirectToLoginAndBackHere,
} from "~/utils/session.server";

export async function loader({ request, params }: LoaderArgs) {
  try {
    const headers = new Headers();
    const user = await authenticate(request);
    const note = await getNote(params.noteId!, user);

    if (!note) {
      throw new Response("Not Found", { status: 404 });
    }

    return json({ note }, { headers });
  } catch (e) {
    if (e instanceof AuthError) {
      return redirectToLoginAndBackHere(request);
    }

    throw e;
  }
}

export async function action({ request, params }: ActionArgs) {
  try {
    const headers = new Headers();
    const user = await authenticate(request);
    const deleted = await deleteNote(params.noteId!, user);

    console.log("Deleted note!", deleted);

    return redirect("/notes", { headers });
  } catch (e) {
    if (e instanceof AuthError) {
      return redirectToLoginAndBackHere(request);
    }

    throw e;
  }
};


export default function NoteDetailsPage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div>
      <h3 className="text-2xl font-bold">{data.note.title}</h3>
      <p className="py-6">{data.note.body}</p>
      <hr className="my-4" />
      <Form method="post">
        <button
          type="submit"
          className="rounded bg-blue-500  py-2 px-4 text-white hover:bg-blue-600 focus:bg-blue-400"
        >
          Delete
        </button>
      </Form>
    </div>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);

  // This logs the user out instead of locking them in a permanent error screen
  // if something happens to their hasura token.
  useEffect(() => {
    if (
      error.message.startsWith("Authentication hook unauthorized this request")
    ) {
      window.location.href = "/logout";
    }
  }, [error]);

  return <div>An unexpected error occurred: {error.message}</div>;
}

export function CatchBoundary() {
  const caught = useCatch();

  if (caught.status === 404) {
    return <div>Note not found</div>;
  }

  throw new Error(`Unexpected caught response with status: ${caught.status}`);
}
