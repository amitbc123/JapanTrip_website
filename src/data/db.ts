import { type DBSchema, openDB } from "idb"
import type { TripData } from "@/types/trip"

interface JapanTripDB extends DBSchema {
  tripData: {
    key: string
    value: TripData
  }
  fileHandles: {
    key: string
    value: FileSystemFileHandle
  }
}

const DATA_KEY = "current"
const HANDLE_KEY = "current"

function getDb() {
  return openDB<JapanTripDB>("japan-trip", 1, {
    upgrade(db) {
      db.createObjectStore("tripData")
      db.createObjectStore("fileHandles")
    },
  })
}

export async function readStoredTripData(): Promise<TripData | undefined> {
  const db = await getDb()
  return db.get("tripData", DATA_KEY)
}

export async function writeStoredTripData(data: TripData): Promise<void> {
  const db = await getDb()
  await db.put("tripData", data, DATA_KEY)
}

export async function clearStoredTripData(): Promise<void> {
  const db = await getDb()
  await db.delete("tripData", DATA_KEY)
  await db.delete("fileHandles", HANDLE_KEY)
}

export async function readStoredFileHandle(): Promise<FileSystemFileHandle | undefined> {
  const db = await getDb()
  return db.get("fileHandles", HANDLE_KEY)
}

export async function writeStoredFileHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await getDb()
  await db.put("fileHandles", handle, HANDLE_KEY)
}
