/**
 * Parses the SQL in supabase/ with the real PostgreSQL 17 grammar.
 *
 *   node scripts/check-sql.mjs
 *
 * There is no database on this machine, so this is a *syntax* check and nothing
 * more: it will not catch a column that does not exist or a policy that lets the
 * wrong person through. Both files still have to be applied to a project.
 *
 * Function bodies get a second pass. `create function … as $$ … $$` parses the
 * body as an opaque string literal, so a broken query inside one would otherwise
 * sail through the first pass reporting a clean parse.
 *
 * Needs libpg-query, which is not a dependency of the app:
 *
 *   npm install --no-save libpg-query@17.7.4
 */

import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'libpg-query'

const root = fileURLToPath(new URL('../supabase/', import.meta.url))

async function sqlFiles() {
  const entries = await readdir(root, { withFileTypes: true, recursive: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => join(entry.parentPath, entry.name))
}

/** Every `$tag$ … $tag$` body in the file, with the line it starts on. */
function dollarBodies(sql) {
  const bodies = []
  const pattern = /\$([a-z_]*)\$([\s\S]*?)\$\1\$/g

  for (const match of sql.matchAll(pattern)) {
    bodies.push({
      body: match[2],
      line: sql.slice(0, match.index).split('\n').length,
    })
  }
  return bodies
}

/**
 * A plpgsql body is not SQL, so it cannot be parsed whole. The queries inside it
 * can be: this pulls out the `return query …` and bare statements and parses
 * those, which is where a typo in a join or a column list would live.
 */
function embeddedQueries(body) {
  return body
    .split(/;\s*\n/)
    .map((chunk) => chunk.replace(/^\s*(begin|declare)\b[\s\S]*?\n(?=\s*(with|select|insert|update|delete|perform|return))/i, ''))
    .map((chunk) => chunk.replace(/^\s*return query\s+/i, '').trim())
    .filter((chunk) => /^(with|select|insert|update|delete)\b/i.test(chunk))
    .map((chunk) => `${chunk};`)
}

let statements = 0
let bodies = 0
let queries = 0
let failures = 0

for (const file of await sqlFiles()) {
  const name = file.split(/[\\/]/).pop()
  const sql = await readFile(file, 'utf8')

  try {
    const tree = await parse(sql)
    statements += tree.stmts.length
    console.log(`ok   ${name} — ${tree.stmts.length} statements`)
  } catch (error) {
    failures += 1
    console.error(`FAIL ${name} — ${error.message}`)
    continue
  }

  for (const { body, line } of dollarBodies(sql)) {
    bodies += 1
    for (const query of embeddedQueries(body)) {
      queries += 1
      try {
        await parse(query)
      } catch (error) {
        failures += 1
        console.error(`FAIL ${name}:${line} (embedded) — ${error.message}\n${query}`)
      }
    }
  }
}

console.log(
  `\n${statements} statements, ${bodies} function bodies, ${queries} embedded queries, ${failures} failures.`,
)

if (failures) process.exitCode = 1
