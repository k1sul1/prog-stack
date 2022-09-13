import type { UserWithToken } from "./user.server";
import gqlReq, { getAuthenticationHeaders, gql } from "~/utils/gql.server";

// Alternative way of saving queries instead of inlining them here:
import getNoteQuery from "~/gql/getNote.gql";

export type Note = {
  uuid: string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  user: string;
};

export async function getNote(uuid: Note["uuid"], user: UserWithToken) {
  const { notes } = await gqlReq<{ notes: Note[] }>(
    getNoteQuery,
    { uuid },

    // I've set permissions so that admins and owners can query other peoples notes.
    // Standard user with the role `user` can't.
    await getAuthenticationHeaders(user)
  );

  if (!notes.length) {
    return null;
  }

  return notes[0];
}

export async function getNotesForUser(user: UserWithToken) {
  const { notes } = await gqlReq<{ notes: Note[] }>(
    gql`
      query getNotesForUser($user: uuid) {
        notes(where: { user: { _eq: $user } }) {
          uuid
          title
          body
          createdAt
          updatedAt
          user
        }
      }
    `,
    { user: user.uuid },
    await getAuthenticationHeaders(user)
  );

  return notes;
}

export async function createNote(
  { body, title }: Pick<Note, "body" | "title">,
  user: UserWithToken
) {
  const { insert_notes_one: note } = await gqlReq<{ insert_notes_one: Note }>(
    gql`
      mutation CreateNote($object: notes_insert_input!) {
        insert_notes_one(object: $object) {
          uuid
          title
          body
          createdAt
          updatedAt
          user
        }
      }
    `,
    {
      object: {
        title,
        body,
        user: user.uuid,
      },
    },
    await getAuthenticationHeaders(user)
  );

  return note;
}

export async function deleteNote(uuid: string, user: UserWithToken) {
  const { delete_notes_by_pk: deletedNotes } = await gqlReq<{
    delete_notes_by_pk: Note;
  }>(
    gql`
      mutation deleteNote($uuid: uuid!) {
        delete_notes_by_pk(uuid: $uuid) {
          uuid
          title
          body
          createdAt
          updatedAt
          user
        }
      }
    `,
    {
      uuid,
    },
    await getAuthenticationHeaders(user)
  );

  return deletedNotes;
}
