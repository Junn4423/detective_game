# New Features & Logic Fixes

## Goal
Implement requested features (Start Screen, Map Focus, Search) and fix the location consistency issue between the story and map data.

## User Review Required
> [!IMPORTANT]
> I will introduce a "Start Screen" that appears on first load.
> "Reset Case" (Lập lại hồ sơ) will now restart the *current* investigation (same killer/victim).
> "New Case" (Vụ án mới) will generate a completely new mystery.

## Proposed Changes

### 1. Store Updates (`src/store/gameStore.ts`)
#### [MODIFY] [gameStore.ts](file:///f:/WORK/Detective_game/detective_game/src/store/gameStore.ts)
- Add `focusedCitizenId` state.
- Add `setFocusedCitizenId` action.
- Split `resetCase` into:
    - `restartCurrentCase()`: Resets phase/shortlist, KEEPS seed.
    - `startNewCase()`: Resets phase/shortlist, GENERATES NEW seed.

### 2. Location Logic (`src/services/caseEngine.ts` & `src/services/geminiService.ts`)
#### [MODIFY] [caseEngine.ts](file:///f:/WORK/Detective_game/detective_game/src/services/caseEngine.ts)
- Pass `caseLoc.name` (City Name) to `enrichBundleWithClues`.

#### [MODIFY] [geminiService.ts](file:///f:/WORK/Detective_game/detective_game/src/services/geminiService.ts)
- Update `GeminiCluePrompt` interface to include `locationName`.
- Update `buildPrompt` to explicitly state: "BỐI CẢNH: Thành phố {locationName}".

### 3. Map Focus (`src/components/InvestigationMap.tsx`)
#### [MODIFY] [InvestigationMap.tsx](file:///f:/WORK/Detective_game/detective_game/src/components/InvestigationMap.tsx)
- Use `useMap` and `useEffect` to fly to `focusedCitizenId` (if set) or `victim` (on load).
- Subscribe to `useGameStore` for `focusedCitizenId`.

### 4. Suspect Grid Features (`src/components/SuspectGrid.tsx`)
#### [MODIFY] [SuspectGrid.tsx](file:///f:/WORK/Detective_game/detective_game/src/components/SuspectGrid.tsx)
- Add Search Input (filter by name).
- Add "Xem trên bản đồ" (View on Map) button to the Detailed Profile Modal.
- Clicking "View on Map" calls `setFocusedCitizenId` and switches tab to 'map' (if on mobile/tab view).

### 5. App Flow (`src/App.tsx`)
#### [MODIFY] [App.tsx](file:///f:/WORK/Detective_game/detective_game/src/App.tsx)
- Add `gameStarted` state.
- Show "Start Screen" if `!gameStarted`.
- Wire up "New Case" and "Reset Case" buttons to new store actions.
- Handle tab switching when "View on Map" is clicked.

## Verification Plan
### Manual Verification
1.  **Start Screen**: Verify app loads with "Start Investigation" button.
2.  **Map Focus**:
    - Click "View on Map" for a suspect -> Map should center on them.
    - Reload case -> Map should center on victim.
3.  **Search**: Type in search bar -> Grid should filter suspects.
4.  **Location**: Generate case -> Check if Story mentions the same city as the Map coordinates (e.g., if points are in Tokyo, story says Tokyo).
