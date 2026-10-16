const MAX_BYTES = 32768;
function parseReleaseNotes(value, expectedVersion) {
  if (
    !value ||
    typeof value !== "object" ||
    value.version !== expectedVersion ||
    typeof value.title !== "string" ||
    !value.title.trim() ||
    value.title.length > 120 ||
    !Array.isArray(value.highlights) ||
    !value.highlights.length ||
    value.highlights.length > 8
  )
    throw new Error("Notas desta versão indisponíveis.");
  const highlights = value.highlights.map((item) => {
    if (
      !item ||
      typeof item.title !== "string" ||
      !item.title.trim() ||
      item.title.length > 100 ||
      typeof item.description !== "string" ||
      !item.description.trim() ||
      item.description.length > 500 ||
      !["new", "improved", "fixed"].includes(item.kind)
    )
      throw new Error("Notas desta versão indisponíveis.");
    return {
      title: item.title.trim(),
      description: item.description.trim(),
      kind: item.kind,
    };
  });
  return { version: value.version, title: value.title.trim(), highlights };
}
async function readReleaseNotes(response, expectedVersion) {
  if (
    Number(response.headers.get("content-length")) > MAX_BYTES ||
    !response.body
  )
    throw new Error("Notas desta versão indisponíveis.");
  let size = 0;
  const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > MAX_BYTES) throw new Error("Notas desta versão indisponíveis.");
    chunks.push(Buffer.from(chunk));
  }
  return parseReleaseNotes(
    JSON.parse(
      Buffer.concat(chunks)
        .toString("utf8")
        .replace(/^\uFEFF/, ""),
    ),
    expectedVersion,
  );
}
module.exports = { parseReleaseNotes, readReleaseNotes };
