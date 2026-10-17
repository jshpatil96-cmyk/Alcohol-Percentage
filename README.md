# Wine Finder PWA

A lightweight, mobile-first Progressive Web App for looking up brand alcohol percentages. It is designed for GitHub Pages and supports search, category filters, refresh from a published Google Sheets CSV, and an offline cached app shell plus a locally saved data copy.

## 1. Prepare your Google Sheet

1. Keep the first row as column headers. Required columns: `Brands` and `ALCOHOL %` (the parser also accepts common alternatives such as `Brand`, `Alcohol %`, `ABV`).
2. Optional: add a `Category` column (or `Type` / `Wine Type`) to enable meaningful category filters. Example categories: `Red Wine`, `White Wine`, `Rosé`, `Sparkling`.
3. In Google Sheets, choose **File → Share → Publish to web**.
4. Choose the relevant sheet/tab, select **Comma-separated values (.csv)**, and publish. Copy the published CSV URL. Do not paste a private edit/share URL; this app is intended for data that can be publicly read.
5. Open `app.js` and replace `PASTE_YOUR_PUBLISHED_GOOGLE_SHEET_CSV_URL_HERE` with the exact published CSV URL, keeping the quotes. Commit the change.

**Privacy note:** publishing a sheet makes the selected content publicly accessible. Do not publish personal or confidential data.

## 2. Create the GitHub repository

1. Sign in to GitHub and create a new repository, for example `wine-finder-pwa`.
2. For the simplest setup, choose **Public**. (GitHub Pages availability can vary by plan and repository settings.)
3. Upload all files from this folder to the repository root: `index.html`, `styles.css`, `app.js`, `manifest.json`, `sw.js`, `icon.svg`, and `README.md`. Do not upload only the ZIP file.
4. Commit the files to the default branch (usually `main`).

## 3. Publish with GitHub Pages

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch `main` and folder `/(root)`, then click **Save**.
4. Wait for the Pages deployment to finish. Your app URL will look like `https://YOUR-USERNAME.github.io/wine-finder-pwa/`.
5. Open that URL on Android in Chrome. HTTPS is required for service workers and installable PWAs.

## 4. Install on Android

1. Open the published app URL in Chrome.
2. Open Chrome's three-dot menu and choose **Install app** or **Add to Home screen** (the wording varies by Chrome version).
3. Confirm. Launch Wine Finder from the new home-screen icon.

## 5. Test the sheet connection and offline mode

1. While online, open the app and tap **Refresh data**. Check that the status reports the number of brands updated.
2. Search for a known brand and test the category dropdown.
3. After a successful refresh, turn on Airplane mode and reopen the app. The interface and last saved brand data should still be available.
4. Turn connectivity back on and tap **Refresh data** whenever you want the newest sheet contents.

## How data and categories work

- Each successful refresh saves a copy of the parsed brand rows in this browser's local storage.
- If the network is unavailable, the app uses that saved copy. The service worker caches the app shell so the interface can load offline after the first successful visit.
- The `Category` column is optional; without it, entries are shown as `Uncategorized`. The sample rows in `app.js` are illustrative starter data and are replaced by the sheet after a successful sync.
- Supported alcohol values include `13.5%`, `13.50%`, or `13.5`.

## Updating the app

Edit the relevant file on GitHub and commit. GitHub Pages will redeploy automatically. If you change service-worker caching behavior, increment `CACHE_NAME` in `sw.js` to trigger a new shell cache version.

## Troubleshooting

- **Refresh gives an HTML/error response:** confirm the sheet is published to the web as CSV and that you used the published CSV URL.
- **Brand or alcohol column not detected:** use `Brands` and `ALCOHOL %` as headers, or extend the accepted aliases in `app.js`.
- **Categories are all Uncategorized:** add/fill the optional `Category` column.
- **Install option does not appear:** visit the HTTPS GitHub Pages URL in Chrome, not the GitHub repository page; reload after the first visit.
- **Offline data missing:** first open the app while online and complete one successful refresh. Browser storage clearing may remove the saved data.
