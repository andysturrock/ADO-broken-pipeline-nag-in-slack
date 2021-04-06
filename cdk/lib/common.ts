require('dotenv').config()

// Returns value of given environment variable, which may be read from .env file.
// If the optional flag is passed as true, then if the variable is not set then undefined is returned.
// Thus it is safe to use ! to assert a variable is not undefined if the optional flag is true or missing.
// If optional is missing or false then if the variable is missing an exception is thrown.
export default function getEnv(name: string, optional: boolean = true): string | undefined {
  const val = process.env[name];
  if (!val && !optional) {
      console.error(`${name} env var not set`);
      throw new Error(`${name} env var not set`);
  }
  return val;
}
