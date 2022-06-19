import { User } from "./user.server";
import gqlReq, { gql } from "~/utils/gql.server";

export type Note = {
  uuid: string;
  title: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  user: string;
};

export async function getNote({
  uuid,
  userUuid,
}: Pick<Note, "uuid"> & {
  userUuid: User["uuid"];
}) {
  const { notes } = await gqlReq<{ notes: Note[] }>(
    gql`
      query getNote($uuid: uuid, $user: uuid) {
        notes(where: { uuid: { _eq: $uuid }, user: { _eq: $user } }) {
          uuid
          title
          body
          createdAt
          updatedAt
          user
        }
      }
    `,
    { uuid, user: userUuid }
  );

  if (!notes.length) {
    return null;
  }

  return notes[0];
}

export async function getNoteListItems({
  userUuid,
}: {
  userUuid: User["uuid"];
}) {
  const { notes } = await gqlReq<{ notes: Note[] }>(
    gql`
      query getNoteListItems($user: uuid) {
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
    { user: userUuid }
  );

  return notes;
}

export async function createNote({
  body,
  title,
  userUuid,
}: Pick<Note, "body" | "title"> & {
  userUuid: User["uuid"];
}) {
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
        user: userUuid,
      },
    }
  );

  return note;
}

export async function deleteNote(uuid: string) {
  const { delete_notes_by_pk: deletedNotes } = await gqlReq<{
    delete_notes_by_pk: Note[];
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
    }
  );

  return deletedNotes[0];
}
