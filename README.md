# Society of Explorers — classroom webpages

This `gh-pages` branch contains only the standalone classroom site. The ClassFlow app remains on `main`; do not merge this branch into `main`.

## Enable GitHub Pages

In this repository, open **Settings → Pages**. Under **Build and deployment**, set:

- Source: **Deploy from a branch**
- Branch: **gh-pages**
- Folder: **/(root)**

Click **Save**. If these settings are already selected, no change is required. Check the Pages deployment result and the published webpage before sharing it with students.

After successful publication, the site uses these standard project URLs (assuming no custom domain is configured):

- Lesson index: https://ryanrudat.github.io/classflow-ai/
- Lesson 001 — The First Voice: https://ryanrudat.github.io/classflow-ai/first-voice/

## Google Classroom

Use **Classwork → Create → Material → Add → Link** and attach the live lesson URL, not a GitHub code URL or an HTML file preview.

Suggested title: **001 — The First Voice: Interactive Evidence Gallery**

Suggested instructions:

> Open the evidence gallery in your browser. Click photographs to enlarge them. Open research notes when instructed. Record your answers on your worksheet.

## Contents and behaviour

`first-voice/index.html` contains the full interactive gallery imported from `History_of_Science_001_Interactive_Evidence_Gallery_Updated.html` (Library version 2). It includes the expandable research notes, show/hide controls, photograph enlargement and zoom, projection-text toggle, cave diagram, timeline, and PDF/print control. PDF export is a static copy, not the interactive version.

All six source photographs remain externally linked with the existing source links and credits. Internet access to those websites is required. This branch does not bundle or rehost their image bytes, grant reuse rights, or remove the original rights notice.

No sign-in, database, answer collection, or Classroom submission integration has been added. The webpage does not store students’ answers.

## Updating lessons

Edit the relevant files on **gh-pages**, not on **main**. Once branch publishing is enabled, later changes to this publishing branch are published at the same URLs after a successful Pages deployment. Add future lessons in separate folders and link them from `index.html`.

`.nojekyll` preserves this as a plain static website without a Jekyll build.

## Before class

On a student device, open a research note, enlarge a photograph, test zoom and close, and confirm that all source images load. Check school network access. Sharing the link in a private Classroom does not restrict access to this public Pages site. Keep student information off the site.
