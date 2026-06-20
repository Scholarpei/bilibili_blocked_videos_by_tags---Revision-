const XOR_CODE = 23442827791579n;
const MAX_AID = 1n << 51n;
const BASE = 58n;
const BV_ALPHABET = "FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf";

export function av2bv(aid) {
  const bytes = ["B", "V", "1", "0", "0", "0", "0", "0", "0", "0", "0", "0"];
  let index = bytes.length - 1;
  let value = (MAX_AID | BigInt(aid)) ^ XOR_CODE;

  while (value > 0n && index >= 0) {
    bytes[index] = BV_ALPHABET[Number(value % BASE)];
    value /= BASE;
    index -= 1;
  }

  [bytes[3], bytes[9]] = [bytes[9], bytes[3]];
  [bytes[4], bytes[7]] = [bytes[7], bytes[4]];
  return bytes.join("");
}

export function extractBvFromHref(href = "") {
  const bvMatch = String(href).match(/\/(BV[0-9A-Za-z]+)/);
  if (bvMatch) return bvMatch[1];

  const avMatch = String(href).match(/\/av(\d+)/i);
  if (avMatch) return av2bv(avMatch[1]);

  return "";
}
