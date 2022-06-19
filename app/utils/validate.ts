import type { User } from "~/models/user.server";
import { UserRole } from "./user";

export function validateEmail(email: unknown): email is string {
  return typeof email === "string" && email.length > 3 && email.includes("@");
}

/**
 * Collection of validator functions that are applies by the input name.
 *
 * See @validateAndParseForm
 */
export const inputValidators: {
  join: FormInputValidators;
  newNote: FormInputValidators;
  editUser: FormInputValidators;
} = {
  join: {
    email: (v) =>
      !validateEmail(v) ? "That does not look like a valid email." : false,

    name: (v) =>
      typeof v !== "string" || v.length < 2
        ? "This does not look like a name."
        : false,

    password: (v) => {
      if (typeof v !== "string") {
        // Interesting case to say the least...
        return "A file as a password? Really?";
      }

      if (v.length === 0) {
        return "Password is required!";
      } else if (v.length < 12) {
        return "Your password must contain at least 12 characters.";
      }

      return false;
    },
  },

  newNote: {
    title: (v) =>
      typeof v !== "string" || v.length === 0 ? "Title is required!" : false,

    body: (v) =>
      typeof v !== "string" || v.length === 0 ? "Body is required!" : false,
  },

  editUser: {
    /**
     * This is a special case, as validating this field will require context that is not available statically.
     *
     * By providing a validator that always errors as a default, we can be sure that an User doesn't change themselves into an Owner, using a edit user form that a human forgot to
     * provide a validator for.
     *
     * @see createUserRoleValidator
     */
    userRole: (v) => "Internal server error",
  },
};

/**
 * Create a role input validator from context.
 * Takes two user objects, which may be the same object.
 *
 * Unused, this is an example implementation.
 */
export const createUserRoleValidator =
  (user: User, cUser: User): FormInputValidator =>
  (v) => {
    const numeric = parseInt(v as string, 10);

    if (numeric < cUser.role) {
      if (cUser.uuid === user.uuid) {
        return "You can't promote yourself.";
      } else {
        return `You are an ${
          UserRole[cUser.role]
        }. You can't promote anyone to ${UserRole[numeric]}.`;
      }
    }

    return false;
  };

export type FormInputValidator = (value: FormDataEntryValue) => string | false;
export type FormInputValidators = { [fieldName: string]: FormInputValidator };
export type FormValidatorErrors = { [fieldName: string]: string } | false;
export type FormDataObject = { [fieldName: string]: FormDataEntryValue };

// export type FormDataString = {
//   kind: "string";
//   value: string;
// };

// export type FormDataFile = {
//   kind: "file";
//   value: File;
// };

// /**
//  * This doesn't help with the fact that every single input has to be discriminated to determine if it's a string or a file.
//  *
//  * Scrapping for now due to added complexity with no benefit.
//  */
// export type FormDataObject = {
//   [fieldName: string]: FormDataFile | FormDataString;
// };

/**
 *
 * Parses FormData into a key-value object for easier usage w/ less iteration.
 * Also validates the inputs and provides all errors in an object.
 *
 * The validators can differentiate between files and string inputs, but unfortunately TS can't when the time
 * comes to use the values. All entries have the type of File | string, but you can easily fix that:
 *
 * email as string
 *
 * @see formValidators
 */
export function validateAndParseForm(
  formData: FormData,
  validators: FormInputValidators
): {
  errors: FormValidatorErrors;
  entries: FormDataObject;
} {
  let errors: FormValidatorErrors = {};
  let entries: FormDataObject = {};
  const form = formData.entries();

  for (const [k, v] of form) {
    const validator = validators[k];
    const error = validator ? validator(v) : false;

    entries[k] = v;

    // This relates to the commented out attempt at discriminating between input types.
    // entries[k] =
    //   typeof v === "string"
    //     ? {
    //         kind: "string",
    //         value: v,
    //       }
    //     : {
    //         kind: "file",
    //         value: v,
    //       };

    if (error !== false) {
      errors[k] = error;
    }
  }

  if (Object.keys(errors).length === 0) {
    errors = false;
  }

  return { entries, errors };
}
