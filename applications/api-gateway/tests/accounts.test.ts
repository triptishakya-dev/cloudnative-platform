import { it } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, checkPassword } from "../src/accounts/password.js";
it("salts password hashes and rejects incorrect passwords",async()=>{
 const password="test-passphrase-for-unit-test";
 const one=await hashPassword(password),two=await hashPassword(password);
 assert.notEqual(one,two);assert.ok(!one.includes(password));
 assert.equal(await checkPassword(password,one),true);
 assert.equal(await checkPassword("incorrect",one),false);
 assert.equal(await checkPassword(password,"bad"),false);
});
