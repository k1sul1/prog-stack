## Authentication & Authorization setup

Read this first for insight on how things work with Hasura if you've never used it before: https://hasura.io/blog/hasura-authentication-explained/.

Let's start out by laying out what we have. For the actual Remix application, we have  username-password authentication, the password hash is generated with bcrypt. Simple stuff. **However**, Remix talks to Hasura via loaders and actions, and Hasura **authorizes** the request by making a callback to the /hasura-auth webhook.

One could argue that a JWT would be more suitable, but I want to have the ability to talk to Hasura from the client if need be. I would argue back that you should use JWT when you're also integrating with something like Auth0, just like the document above said; assuming you read it. 

When the user logs in with their password, a token is created and paired into the cookie based user session, as well as the database. When you make a graphql request to Hasura, you also send the user uuid and the token as headers. Hasura will post back to /hasura-auth to verify. 

The webhook (/hasura-auth) compares the provided user uuid and token, by getting the tokens from the database, not just one, but all of them. In normal circumstances, there's just one token per session, but when a token is nearing expiry time, a new one is created, resulting in a situation where there are two valid tokens. An user can also have multiple sessions by using multiple browsers, but those sessions should share their tokens.

Removing the token from the database effectively destroys the user session, as the application error handling will redirect the user back to the login screen. Changing the expiration time to be in the past does the same. I've handled all situations I could think of, but it's possible to extend the code if more edge cases arise.

Here's an example loader that ensures that the current user has permissions to get notes for who they say they are.

```ts
export async function loader({ request }: LoaderArgs) {
  try {
    const user = await authenticate(request);
    const noteListItems = await getNotesForUser(user);

    return json({ noteListItems });
  } catch (e) {
    if (e instanceof AuthError) {
      return redirectToLoginAndBackHere(request);
    }

    throw e;
  }
}

```

The key is to catch AuthError, redirect to login, and then back to where the user was. All other errors? Rethrow them or handle them as you want. The error boundaries (that you should definitely create or use!) will handle them.

