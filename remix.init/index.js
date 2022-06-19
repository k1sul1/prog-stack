const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const toml = require("@iarna/toml");
const sort = require("sort-package-json");

function escapeRegExp(string) {
  // $& means the whole matched string
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRandomString(length) {
  return crypto.randomBytes(length).toString("hex");
}

async function main({ rootDirectory }) {
  const README_PATH = path.join(rootDirectory, "README.md");
  const HASURA_README_PATH = path.join(rootDirectory, "hasura", "README.md");
  const FLY_TOML_PATH = path.join(rootDirectory, "fly.toml");
  const HASURA_FLY_TOML_PATH = path.join(rootDirectory, "hasura", "fly.toml");
  const EXAMPLE_ENV_PATH = path.join(rootDirectory, ".env.example");
  const ENV_PATH = path.join(rootDirectory, ".env");
  const PACKAGE_JSON_PATH = path.join(rootDirectory, "package.json");

  const REPLACER = "remix-prog-stack";

  const DIR_NAME = path.basename(rootDirectory);
  const SUFFIX = getRandomString(2);

  const APP_NAME = (DIR_NAME + "-" + SUFFIX)
    // get rid of anything that's not allowed in an app name
    .replace(/[^a-zA-Z0-9-_]/g, "-");

  const [
    prodContent,
    hasuraProdContent,
    readme,
    hasuraReadme,
    env,
    packageJson,
  ] = await Promise.all([
    fs.readFile(FLY_TOML_PATH, "utf-8"),
    fs.readFile(HASURA_FLY_TOML_PATH, "utf-8"),
    fs.readFile(README_PATH, "utf-8"),
    fs.readFile(HASURA_README_PATH, "utf-8"),
    fs.readFile(EXAMPLE_ENV_PATH, "utf-8"),
    fs.readFile(PACKAGE_JSON_PATH, "utf-8"),
  ]);

  const newEnv = env.replace(
    /^SESSION_SECRET=.*$/m,
    `SESSION_SECRET="${getRandomString(16)}"`
  );

  const prodToml = toml.parse(prodContent);
  prodToml.app = prodToml.app.replace(REPLACER, APP_NAME);

  const prodTomlHasura = toml.parse(hasuraProdContent);
  prodTomlHasura.app = prodToml.app.replace(REPLACER, APP_NAME);

  const newReadme = readme.replace(
    new RegExp(escapeRegExp(REPLACER), "g"),
    APP_NAME
  );

  const newHasuraReadme = hasuraReadme.replace(
    new RegExp(escapeRegExp(REPLACER), "g"),
    APP_NAME
  );

  const newPackageJson =
    JSON.stringify(
      sort({ ...JSON.parse(packageJson), name: APP_NAME }),
      null,
      2
    ) + "\n";

  await Promise.all([
    fs.writeFile(FLY_TOML_PATH, toml.stringify(prodToml)),
    fs.writeFile(HASURA_FLY_TOML_PATH, toml.stringify(prodTomlHasura)),
    fs.writeFile(README_PATH, newReadme),
    fs.writeFile(HASURA_README_PATH, newHasuraReadme),
    fs.writeFile(ENV_PATH, newEnv),
    fs.writeFile(PACKAGE_JSON_PATH, newPackageJson),
    fs.copyFile(
      path.join(rootDirectory, "remix.init", "gitignore"),
      path.join(rootDirectory, ".gitignore")
    ),
    fs.rm(path.join(rootDirectory, ".github/ISSUE_TEMPLATE"), {
      recursive: true,
    }),
    fs.rm(path.join(rootDirectory, ".github/PULL_REQUEST_TEMPLATE.md")),
  ]);

  console.log(
    `
Setup is almost complete. Follow these steps to finish initialization:

- Install hasura cli if you didn't already

- Start the database and Hasura:
  cd hasura
  docker-compose up -d
  # wait for it to start
  hasura metadata apply
  hasura migrate apply
  hasura metadata reload
  hasura seed apply
  cd ..

- Run the first build (this generates the server you will run):
  npm run build

- You're now ready to rock and roll 🤘
  npm run dev
    `.trim()
  );
}

module.exports = main;
