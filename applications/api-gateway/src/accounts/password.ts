import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export async function hashPassword(password: string) {
 const salt = randomBytes(16).toString("hex");
 const hash = await scrypt(password, salt, 64) as Buffer;
 return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function checkPassword(password: string, encoded: string) {
 const [algorithm, salt, value] = encoded.split(":");
 if (algorithm !== "scrypt" || !salt || !value || !/^[a-f0-9]{128}$/.test(value)) return false;
 const expected = Buffer.from(value,"hex");
 const actual = await scrypt(password, salt, 64) as Buffer;
 return timingSafeEqual(actual,expected);
}
