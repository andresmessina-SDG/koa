# Koa

Koa teaches you the ukulele, from your first chord to your first song. It runs in your browser, and once you have opened it, it works without a connection.

## What it does

- **Lessons.** A short path that starts with how to hold the ukulele and ends with real songs. A daily plan picks what to practice next.
- **Songs.** Play along as the chords light up. Koa can wait for you at each chord change, loop a line, and change the key.
- **Chords.** Every chord shows where each finger goes, step by step.
- **Changes.** Practice moving between two chords. Koa tells you which finger can stay down.
- **Rhythm.** Strumming and fingerpicking patterns with a metronome. With the microphone on, Koa hears whether you rush or drag.
- **Tuner.** Tune with the microphone, or by ear against reference notes.

## Your data

Koa keeps your progress in your browser. It has no accounts, stores nothing on a server, and makes no requests to other sites. When you use the microphone, Koa listens on your device and never records or uploads the sound. Settings has a backup button, so you can save your progress to a file. Browsers can clear what a site has saved, and Safari does so after seven days unopened unless Koa is on the Home Screen, so Koa reminds you to back up or install it.

## Run it on your computer

Browsers only let a page use the microphone and work offline when it comes from a web server, not from a file. To try Koa locally:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Change it

The code lives in `src`. The page is split into a head, a body, and numbered script files that run in order. After you change anything in `src`, rebuild the page:

```
./build.sh
```

`build.sh` also names the offline cache in `sw.js` after the files, so phones that already have Koa notice each new build and offer to reload.

## The drawings

The ukulele drawings follow published measurements of real instruments: a Cordoba 15SM soprano, a Kala KA-C concert, a Kala KA-T tenor, and a GenOne baritone plan. Fret positions follow equal temperament, so the 12th fret sits at exactly half the scale length. Three figures are estimates: the tenor and baritone sound holes, and the soprano's neck width where it meets the body. So are the points along the body where each bout is widest.

## Credits

The songs are in the public domain. The fonts are Fraunces and Instrument Sans, with ♭, ♯, ✓, and ⇄ from STIX Two, all under the SIL Open Font License. Koa ships cut-down copies in `fonts`, next to their licenses.
