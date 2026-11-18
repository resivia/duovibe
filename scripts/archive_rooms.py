#!/usr/bin/env python3
"""Read only public.rooms' text COPY from a plain pg_dump. Emit private archive SQL.

No dump SQL is executed. The original dump and generated SQL must stay outside
Git and the website's publish directory.
"""
import argparse
import json
import re
import sys
from pathlib import Path

HEADER = re.compile(r'^COPY (?:public|"public")\.(?:rooms|"rooms") \(([^)]+)\) FROM stdin;$')
JSON_FIELDS = {"players", "current_prompt", "choices"}
INTEGER_FIELDS = {"streak", "round", "revision"}
ROOM_FIELDS = JSON_FIELDS | INTEGER_FIELDS | {
    "id", "host_id", "host_name", "state", "game_type", "created_at", "updated_at", "turn_token"
}
ESCAPES = {"b": "\b", "f": "\f", "n": "\n", "r": "\r", "t": "\t", "v": "\v", "\\": "\\"}


def decode_field(value):
    if value == r"\N":
        return None

    def unescape(match):
        if match[1] not in ESCAPES:
            raise ValueError("Unexpected escape in room COPY data")
        return ESCAPES[match[1]]

    return re.sub(r"\\(.)", unescape, value)


def read_rooms(dump):
    rooms = []
    ids = set()
    columns = None
    complete = False
    for line in dump:
        line = line.rstrip("\r\n")
        if columns is None:
            match = HEADER.fullmatch(line)
            if not match:
                continue
            if complete:
                raise ValueError("More than one COPY block for public.rooms")
            columns = [col.strip().strip('"') for col in match[1].split(",")]
            if ("id" not in columns or not set(columns) <= ROOM_FIELDS
                    or len(set(columns)) != len(columns)):
                raise ValueError("Unexpected columns in public.rooms COPY block")
            continue
        if line == r"\.":
            columns = None
            complete = True
            continue
        fields = line.split("\t")
        if len(fields) != len(columns):
            raise ValueError("Wrong number of fields in room COPY row")
        room = {}
        for column, value in zip(columns, fields):
            value = decode_field(value)
            if value is not None:
                if column in JSON_FIELDS:
                    value = json.loads(value)
                elif column in INTEGER_FIELDS:
                    value = int(value)
            room[column] = value
        if not room["id"] or room["id"] in ids:
            raise ValueError("Missing or duplicate room ID")
        ids.add(room["id"])
        rooms.append(room)
    if not complete or columns is not None:
        raise ValueError("No complete public.rooms text COPY block found. Use a plain pg_dump (not --inserts).")
    return rooms


def archive_sql(rooms):
    # Escaped PostgreSQL literal containing JSON. No source SQL, roles, or tokens.
    payload = json.dumps(rooms, ensure_ascii=True, allow_nan=False).replace("'", "''")
    return f"""-- Private DuoVibe room snapshots ({len(rooms)} rows). Do not deploy or commit this file.
BEGIN;
SET LOCAL standard_conforming_strings TO on;
WITH source AS (SELECT jsonb_array_elements('{payload}'::jsonb) AS room)
INSERT INTO duovibe_archive.rooms (room_code, snapshot)
SELECT room->>'id', room FROM source
ON CONFLICT (room_code) DO NOTHING;
SELECT count(*) AS archived_rooms FROM duovibe_archive.rooms;
COMMIT;
"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("dump", type=Path, help="Original UTF-8 SQL dump, stored outside the repository")
    parser.add_argument("--expect", type=int, help="Fail without generating SQL unless the dump has this many rooms")
    args = parser.parse_args()
    try:
        with args.dump.open(encoding="utf-8-sig") as dump:
            rooms = read_rooms(dump)
        if args.expect is not None and len(rooms) != args.expect:
            raise ValueError(f"Expected {args.expect} rooms, found {len(rooms)}")
        sql = archive_sql(rooms)
    except (OSError, ValueError) as error:
        parser.exit(1, f"Room extraction failed: {error}\n")
    sys.stdout.write(sql)
    print(f"Extracted {len(rooms)} room rows; no auth or storage data included.", file=sys.stderr)


if __name__ == "__main__":
    main()
