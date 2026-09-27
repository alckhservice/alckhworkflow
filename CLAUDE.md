# ALCKH Working Flow Report

Single-file web app (`index.html`) — monthly work-progress checklist for ALCKH clients,
synced through Firebase (Auth + Firestore), published on GitHub Pages:
https://alckhservice.github.io/alckhworkflow/

- Read the `project-conventions` skill before changing `index.html`.
- Release with `/deploy` (it bumps `version.txt` so open browsers auto-reload).
- Run the `security-reviewer` agent before releases that touch login, sync or `firestore.rules`.
- Firestore rules live in `firestore.rules`; deploy with `firebase deploy --only firestore:rules`.
