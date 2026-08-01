# Import CV Loading UI Design

## Goal

Make the wait after selecting a CV file feel responsive and understandable. The UI must communicate the real processing stages without showing an inaccurate percentage or time estimate.

## Scope

This change only affects the import flow on step 3 of the onboarding/create-CV wizard. It preserves the existing file validation, text extraction, AI import, CV creation, navigation, and error messages.

## User Experience

After a user selects or drops a PDF or DOCX, the upload area is replaced immediately by a progress card. The card retains the selected file's name and, when available, its formatted size so the user can confirm which file is being processed.

The card always shows these stages in order:

1. Membaca file
2. Menganalisis CV dengan AI
3. Menyiapkan builder

The active stage displays an animated loading icon. Completed stages display a check icon. Future stages use muted styling. Supporting text tells the user not to close the page and explains that AI analysis can take several seconds.

No progress percentage or estimated completion time is shown because the AI request duration cannot be measured accurately.

## State And Data Flow

The existing `ImportPhase` values remain the source of truth:

- `idle`: file or paste input is available.
- `reading`: the browser is extracting text from the selected file.
- `analyzing`: the extracted or pasted text is being processed by the AI import mutation.
- `creating`: the parsed content is being saved as a CV before navigation.

`StepImportCv` owns the selected file metadata used only for presentation. It must notify the parent when file extraction starts so the shared phase becomes `reading`. Once extraction succeeds, the existing `onImport` callback starts `analyzing`. Paste import skips `reading` and starts directly at `analyzing`.

The parent remains responsible for `analyzing` and `creating`, because those phases correspond to its tRPC mutations. The wizard continues to disable back, skip, and tab controls while any phase is active.

## Error Recovery

If local extraction fails, the phase returns to `idle`, the selected file metadata is cleared, and the existing extraction error is displayed. Scanned-PDF errors continue to switch the user to the paste tab.

If AI import or CV creation fails, the parent returns the phase to `idle`. The selected file metadata is cleared when the component observes that processing has ended with an import error. The upload input becomes available again and the existing server error appears below it.

The hidden file input continues to reset its value after selection so the same file can be retried.

## Components

The implementation stays within the existing boundaries:

- `StepImportCv` renders the progress card and manages selected-file presentation metadata.
- `OnboardingWizardInner` exposes a small phase-change callback for the local `reading` transition while retaining ownership of mutation phases.

No reusable global progress component is introduced because this UI and its three stages are specific to CV import.

## Accessibility

The progress card uses a live status region so stage changes are announced by assistive technology. Decorative stage icons are hidden from screen readers, while the textual labels communicate state. Existing disabled controls prevent duplicate submissions during processing.

## Verification

Automated tests should cover:

- Selecting or dropping a file immediately enters `reading` and displays its metadata.
- Successful extraction transitions from `reading` to `analyzing` through `onImport`.
- Parent phase changes render completed, active, and future stages correctly.
- Paste import starts at `analyzing` without file metadata.
- Extraction failure restores the appropriate input and displays the extraction error.
- AI import or creation failure restores the upload input and displays the server error.

Run the focused tests, Biome lint, and the TypeScript/build verification available in the repository after implementation.
