# Feature #7: Shared Photo Album — Design Doc

**Goal:** Enhance the existing Memories tab with a photo grid view and milestone timeline, aggregating photos from prompts, chat, and standalone uploads into a unified browsable experience.

**Approach:** Hybrid — aggregate existing photos from prompt responses and chat on read, new subcollections for standalone uploads and milestones. No migration needed.

---

## Screen Layout

The Memories tab gets three sub-tabs at the top:

1. **This Week** — existing weekly recap, unchanged.

2. **Photos** — 3-column grid of all photos, newest first. Sources:
   - Response photos (from `prompt_completions`)
   - Chat images (from `messages`)
   - Standalone uploads (from new `photos` subcollection)
   - Tapping opens full-screen viewer with context (prompt source, chat date, or caption)
   - Free users can browse. Premium required to add standalone uploads.

3. **Milestones** — vertical timeline of marked moments. Each has: photo, title, date, optional description. Predefined categories: Anniversary, Trip together, New home, First date, Holiday, Achievement, Surprise, plus Custom freeform. Premium required to add milestones.

## Data Model

### New Firestore Collections

**`/couples/{coupleId}/photos/{photoId}`** — standalone uploads only
- `image_url`: string
- `caption`: string | null
- `uploaded_by`: string (userId)
- `created_at`: Timestamp

**`/couples/{coupleId}/milestones/{milestoneId}`**
- `title`: string
- `category`: string — 'anniversary' | 'trip' | 'new_home' | 'first_date' | 'holiday' | 'achievement' | 'surprise' | 'custom'
- `description`: string | null
- `image_url`: string | null
- `date`: Timestamp (the actual date of the milestone)
- `created_by`: string (userId)
- `created_at`: Timestamp

### Photo Aggregation (client-side)

The Photos grid hook fetches from three sources in parallel:
1. `prompt_completions` where responses have `image_url` (existing)
2. `messages` where `type === 'image'` (existing)
3. `photos` subcollection (new, standalone uploads)

All normalized into unified `PhotoItem` type: `{ id, imageUrl, source, date, context }`, sorted by date descending. Paginated — 30 at a time.

### Storage Paths

- Standalone photos: `photos/{coupleId}/{photoId}.jpg`
- Milestone photos: `milestones/{coupleId}/{milestoneId}.jpg`

## New Files

- `src/components/PhotoGrid.tsx` — 3-column FlatList grid with thumbnail press
- `src/components/PhotoViewer.tsx` — full-screen modal with image, context, close
- `src/components/MilestoneTimeline.tsx` — vertical timeline with photo cards and date markers
- `src/components/AddMilestoneModal.tsx` — modal with category picker, title, date, photo, description
- `src/hooks/usePhotoGrid.ts` — aggregation hook (3 sources, pagination, unified type)
- `src/hooks/useMilestones.ts` — CRUD for milestones collection
- `src/hooks/useAddPhoto.ts` — standalone photo upload mutation

## Modified Files

- `app/(app)/memories.tsx` — add sub-tab navigation (This Week / Photos / Milestones), render new components
- `src/services/imageUpload.ts` — add `uploadStandalonePhoto()` and `uploadMilestonePhoto()`
- `src/components/index.ts` — barrel exports
- `storage.rules` — add paths for `photos/` and `milestones/`

## Analytics Events

- `photo_grid_viewed` — user opens Photos tab
- `photo_standalone_uploaded` — user adds a standalone photo
- `photo_viewed` — user taps to view full-screen (with `source: 'response' | 'chat' | 'standalone'`)
- `milestone_created` — user creates milestone (with `category`)
- `milestone_viewed` — user views milestones tab

## Premium Gating

- Photo grid browsing: free
- Standalone photo uploads: premium
- Adding milestones: premium
- Viewing milestones: free

## Not Changed

- Existing prompt response photo flow
- Chat image flow
- This Week tab
- Saved memories behavior
- Existing hooks or backend

## Future Work

- Photo search/filtering by date range
- Shared album export
- Backfill into unified `photos` collection for performance at scale
