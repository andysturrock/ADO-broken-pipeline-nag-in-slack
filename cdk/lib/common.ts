require('dotenv').config()

export default function getEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
      console.error(`${name} env var not set`);
      process.exit(1);
  }
  return val;
}
