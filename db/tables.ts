/**
 * File Converter - convert files across formats.
 *
 * Design goals:
 * - Track each conversion job for history + troubleshooting.
 * - Store input/output format, status, and where files live.
 * - Allow optional presets for recurring conversions in future.
 */

import { defineTable, column, NOW } from "astro:db";

export const FileConversionJobs = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),

    // basic job info
    sourceFormat: column.text({ optional: true }),        // "pdf", "docx", "jpg"
    targetFormat: column.text({ optional: true }),        // "png", "txt", etc.
    category: column.text({ optional: true }),            // "document", "image", "audio", "video", "archive"
    status: column.text({ optional: true }),              // "queued", "processing", "completed", "failed"

    // storage references (could be URLs or storage keys)
    inputFileName: column.text({ optional: true }),
    inputFileUrl: column.text({ optional: true }),
    outputFileName: column.text({ optional: true }),
    outputFileUrl: column.text({ optional: true }),

    // configuration and errors
    settingsJson: column.text({ optional: true }),        // JSON of conversion options
    errorMessage: column.text({ optional: true }),

    // stats
    inputSizeBytes: column.number({ optional: true }),
    outputSizeBytes: column.number({ optional: true }),

    createdAt: column.date({ default: NOW }),
    completedAt: column.date({ optional: true }),
  },
});

export const FileConversionPresets = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    name: column.text(),                                  // "My PDF-to-PNG preset"
    sourceFormat: column.text({ optional: true }),
    targetFormat: column.text({ optional: true }),
    category: column.text({ optional: true }),
    settingsJson: column.text({ optional: true }),        // JSON of preset options
    createdAt: column.date({ default: NOW }),
  },
});

export const tables = {
  FileConversionJobs,
  FileConversionPresets,
} as const;
