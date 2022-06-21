import type { User } from "./user.server";
import gqlReq, { getAuthenticationHeaders, gql } from "~/utils/gql.server";

export type Note = {
  uuid: string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  user: string;
};

export async function getNote(uuid: Note["uuid"], user: User) {
  const { notes } = await gqlReq<{ notes: Note[] }>(
    gql`
      query getNote($uuid: uuid, $user: uuid) {
        # You can hard-prevent querying other peoples notes by adding the user to the query.
        # That's totally unnecessary if you use Hasura permissions!
        # notes(where: { uuid: { _eq: $uuid }, user: { _eq: $user } }) {
        notes(where: { uuid: { _eq: $uuid } }) {
          uuid
          title
          body
          createdAt
          updatedAt
          user
        }
      }
    `,
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

export async function getNotesForUser(user: User) {
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
  user: User
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

export async function deleteNote(uuid: string, user: User) {
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
